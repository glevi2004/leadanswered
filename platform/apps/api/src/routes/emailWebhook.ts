import type { Request, Response } from "express";
import { handleInboundEmail, type PostmarkInbound } from "../emailIntake.js";
import type { LeadDeps } from "../leadService.js";
import { env } from "../env.js";

/**
 * POST /webhooks/email/postmark/:secret — Postmark inbound parse webhook (SCOPE §9).
 * Gated on a shared secret in the path. Always 200s on a handled/skipped email so a
 * parse failure never triggers Postmark retries; only a bad secret is rejected.
 */
export function createEmailWebhookRoute(deps: LeadDeps) {
  return async function postEmail(req: Request, res: Response): Promise<void> {
    if (!env.POSTMARK_INBOUND_SECRET || req.params.secret !== env.POSTMARK_INBOUND_SECRET) {
      res.sendStatus(401);
      return;
    }
    try {
      const result = await handleInboundEmail(deps, (req.body ?? {}) as PostmarkInbound);
      res.status(200).json(result);
    } catch (err) {
      // Never crash the webhook — log and 200 so Postmark doesn't retry a poison email.
      console.error("[/webhooks/email] error:", err);
      res.status(200).json({ status: "skipped", reason: "error" });
    }
  };
}
