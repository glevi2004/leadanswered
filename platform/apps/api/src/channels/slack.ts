import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * SLACK — the first channel (DEVELOPMENT ladder step 4; workflow §8b): a MIRROR of the same
 * conversation, not a fork. Inbound DMs/mentions run the same orchestrator turn against the
 * same server-side thread; approvals render as Slack BUTTONS hitting the same resolve
 * endpoint; journal report-backs post into the channel. One conversation, two clients.
 *
 * v1 org mapping is env-based (single-workspace dogfood): SLACK_BOT_TOKEN ·
 * SLACK_SIGNING_SECRET · SLACK_ORG_ID (the org this workspace speaks for) · SLACK_CHANNEL
 * (where report-backs/approvals post). Everything is dormant until those land.
 */

const SLACK_API = "https://slack.com/api";

export const slackBotToken = () => (process.env.SLACK_BOT_TOKEN ?? "").trim();
export const slackSigningSecret = () => (process.env.SLACK_SIGNING_SECRET ?? "").trim();
export const slackOrgId = () => (process.env.SLACK_ORG_ID ?? "").trim();
export const slackChannel = () => (process.env.SLACK_CHANNEL ?? "").trim();

export function slackConfigured(): boolean {
  return Boolean(slackBotToken() && slackSigningSecret() && slackOrgId());
}

/** Slack request-signature verification (v0 scheme) over the RAW body. */
export function verifySlackSignature(rawBody: string, timestamp: string, signature: string): boolean {
  if (!timestamp || !signature) return false;
  // Reject replays older than 5 minutes.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const base = `v0:${timestamp}:${rawBody}`;
  const expected = `v0=${createHmac("sha256", slackSigningSecret()).update(base).digest("hex")}`;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** chat.postMessage — best-effort; failures log and never break a run. */
export async function postSlack(
  channel: string,
  text: string,
  opts?: { threadTs?: string; blocks?: unknown[] },
): Promise<void> {
  if (!slackBotToken() || !channel) return;
  try {
    const res = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: "POST",
      headers: { authorization: `Bearer ${slackBotToken()}`, "content-type": "application/json" },
      body: JSON.stringify({
        channel,
        text,
        ...(opts?.threadTs ? { thread_ts: opts.threadTs } : {}),
        ...(opts?.blocks ? { blocks: opts.blocks } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!data.ok) console.warn("[slack] postMessage failed:", data.error);
  } catch (err) {
    console.warn("[slack] postMessage error:", (err as Error).message);
  }
}

/** Mirror a report-back to the configured channel — only for the mapped org. */
export async function notifySlack(orgId: string, text: string, blocks?: unknown[]): Promise<void> {
  if (!slackConfigured() || !slackChannel() || orgId !== slackOrgId()) return;
  await postSlack(slackChannel(), text, blocks ? { blocks } : undefined);
}

/** An approval as Slack buttons — value carries the approvalId; action_id carries the decision. */
export function approvalBlocks(
  kind: "approve_plan" | "publish_site" | "approve_doc",
  title: string,
  approvalId: string,
): unknown[] {
  const label = kind === "approve_plan" ? "Plan awaiting your approval" : kind === "approve_doc" ? "Doc awaiting your approval" : "Ready to publish";
  const yes = kind === "approve_plan" ? "Approve plan" : kind === "approve_doc" ? "Approve doc" : "Publish";
  return [
    { type: "section", text: { type: "mrkdwn", text: `*${label}:* ${title}` } },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          style: "primary",
          text: { type: "plain_text", text: yes },
          action_id: `${kind}:approved`,
          value: approvalId,
        },
        {
          type: "button",
          style: "danger",
          text: { type: "plain_text", text: "Reject" },
          action_id: `${kind}:rejected`,
          value: approvalId,
        },
      ],
    },
  ];
}

/** Post an approval (plan/publish) with buttons to the channel — only for the mapped org. */
export async function notifySlackApproval(
  orgId: string,
  kind: "approve_plan" | "publish_site" | "approve_doc",
  title: string,
  approvalId: string,
): Promise<void> {
  if (!slackConfigured() || !slackChannel() || orgId !== slackOrgId()) return;
  const label = kind === "approve_plan" ? "Plan awaiting your approval" : kind === "approve_doc" ? "Doc awaiting your approval" : "Ready to publish";
  await postSlack(slackChannel(), `${label}: ${title}`, { blocks: approvalBlocks(kind, title, approvalId) });
}
