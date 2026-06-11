import type { Request, Response } from "express";
import twilio from "twilio";
import { handleInbound, type ConversationDeps } from "../conversationService.js";

/**
 * POST /webhooks/twilio/sms — inbound homeowner SMS. We reply via the Twilio REST
 * API inside the engine, so we just acknowledge Twilio with empty TwiML. Always
 * returns 200 so a transient error never makes Twilio retry-storm (SCOPE §7).
 */
export function createWebhookRoute(deps: ConversationDeps) {
  return async function postWebhook(req: Request, res: Response): Promise<void> {
    const body = String(req.body?.Body ?? "").trim();
    const from = String(req.body?.From ?? "");
    const to = String(req.body?.To ?? "");
    const sid = req.body?.MessageSid ? String(req.body.MessageSid) : null;

    try {
      await handleInbound(deps, { toNumber: to, fromNumber: from, body, providerSid: sid });
    } catch (err) {
      console.error("[webhook] unhandled error (failing safe):", err);
    }

    const twiml = new twilio.twiml.MessagingResponse();
    res.type("text/xml").send(twiml.toString());
  };
}
