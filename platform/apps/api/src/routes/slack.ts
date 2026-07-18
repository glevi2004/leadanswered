import type { Request, Response } from "express";
import {
  postSlack,
  slackConfigured,
  slackOrgId,
  verifySlackSignature,
} from "../channels/slack.js";

/**
 * SLACK routes (ladder step 4) — both take the RAW body (registered with express.raw BEFORE
 * the global json middleware) because Slack's signature covers the exact bytes. They are
 * exempt from the proxy-auth middleware — the Slack signature IS their authentication.
 *
 *   POST /api/slack/events       — url_verification + DM/mention → an orchestrator turn,
 *                                   reply posted back into the same channel/thread.
 *   POST /api/slack/interactive  — Approve-plan / Publish buttons → the same resolve
 *                                   endpoint every other surface uses (self-call).
 */

/** Self-call base — the api talking to itself reuses every route's logic + persistence. */
const selfBase = () => `http://127.0.0.1:${process.env.PORT ?? 3000}`;
const selfHeaders = () => ({
  "content-type": "application/json",
  ...(process.env.API_PROXY_SECRET ? { "x-lu-proxy-secret": process.env.API_PROXY_SECRET } : {}),
});

function rawBody(req: Request): string {
  return Buffer.isBuffer(req.body) ? req.body.toString("utf8") : String(req.body ?? "");
}

function verified(req: Request): boolean {
  return verifySlackSignature(
    rawBody(req),
    String(req.headers["x-slack-request-timestamp"] ?? ""),
    String(req.headers["x-slack-signature"] ?? ""),
  );
}

export function createSlackEventsRoute() {
  return async function postSlackEvents(req: Request, res: Response): Promise<void> {
    if (!slackConfigured()) {
      res.status(503).json({ error: "slack not configured" });
      return;
    }
    if (!verified(req)) {
      res.status(401).json({ error: "bad signature" });
      return;
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody(req)) as Record<string, unknown>;
    } catch {
      res.status(400).json({ error: "bad body" });
      return;
    }

    // Slack's URL handshake.
    if (body.type === "url_verification") {
      res.status(200).json({ challenge: body.challenge });
      return;
    }

    // Ack fast — Slack retries after 3s, and retries must be ignored, not re-run.
    res.status(200).end();
    if (req.headers["x-slack-retry-num"]) return;

    const event = (body.event ?? {}) as Record<string, unknown>;
    const type = String(event.type ?? "");
    const isDm = type === "message" && String(event.channel_type ?? "") === "im";
    const isMention = type === "app_mention";
    // Never respond to bots (incl. ourselves) or message edits/system subtypes.
    if ((!isDm && !isMention) || event.bot_id || event.subtype) return;

    const channel = String(event.channel ?? "");
    const threadTs = String(event.thread_ts ?? event.ts ?? "");
    const text = String(event.text ?? "").replace(/<@[A-Z0-9]+>/g, "").trim();
    if (!channel || !text) return;

    // The SAME orchestrator turn every other client runs — same thread, same memory, same
    // journal. Slack is a second client, not a second brain.
    void (async () => {
      try {
        const resp = await fetch(`${selfBase()}/api/lu`, {
          method: "POST",
          headers: selfHeaders(),
          body: JSON.stringify({ orgId: slackOrgId(), message: text }),
        });
        const data = (await resp.json().catch(() => ({}))) as { reply?: string };
        await postSlack(channel, data.reply?.trim() || "On it.", { threadTs });
      } catch (err) {
        console.error("[slack] turn failed:", err);
        await postSlack(channel, "One sec — I couldn't reach my tools just then. Try that again.", {
          threadTs,
        });
      }
    })();
  };
}

export function createSlackInteractiveRoute() {
  return async function postSlackInteractive(req: Request, res: Response): Promise<void> {
    if (!slackConfigured()) {
      res.status(503).json({ error: "slack not configured" });
      return;
    }
    if (!verified(req)) {
      res.status(401).json({ error: "bad signature" });
      return;
    }
    // Interactive posts come urlencoded as payload=<json>.
    let payload: Record<string, unknown>;
    try {
      const params = new URLSearchParams(rawBody(req));
      payload = JSON.parse(params.get("payload") ?? "{}") as Record<string, unknown>;
    } catch {
      res.status(400).json({ error: "bad payload" });
      return;
    }
    res.status(200).end(); // ack within Slack's 3s window; act async below

    if (payload.type !== "block_actions") return;
    const action = ((payload.actions as Array<Record<string, unknown>>) ?? [])[0];
    if (!action) return;
    const [kind, decision] = String(action.action_id ?? "").split(":");
    const approvalId = String(action.value ?? "");
    if (!approvalId || !decision || !["approve_plan", "publish_site"].includes(kind)) return;

    const channel = String((payload.channel as { id?: string } | undefined)?.id ?? "");
    const threadTs = String((payload.message as { ts?: string } | undefined)?.ts ?? "");

    void (async () => {
      try {
        const resp = await fetch(`${selfBase()}/api/approvals/${approvalId}/resolve`, {
          method: "POST",
          headers: selfHeaders(),
          body: JSON.stringify({ decision, orgId: slackOrgId(), decidedBy: "owner (slack)" }),
        });
        const ok = resp.ok;
        await postSlack(
          channel,
          ok
            ? decision === "approved"
              ? kind === "approve_plan"
                ? "Plan approved — the Engineer is on it. I'll report back here."
                : "Publishing — merging and promoting now."
              : "Rejected — nothing will run."
            : "That didn't go through — open the app and resolve it there.",
          threadTs ? { threadTs } : undefined,
        );
      } catch (err) {
        console.error("[slack] resolve failed:", err);
      }
    })();
  };
}
