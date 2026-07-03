import type { Request, Response } from "express";
import twilio from "twilio";
import { handleMissedCall, type TwilioVoiceInbound } from "../voiceIntake.js";
import type { LeadDeps } from "../leadService.js";

/**
 * POST /webhooks/twilio/voice — a contractor's *unanswered* call, conditional-forwarded
 * to their Twilio number (SCOPE §9.7). The miss already happened at the carrier, so we
 * text the caller (inside handleMissedCall, via the Twilio REST API) and answer this leg
 * with a short spoken line + hangup. Always returns 200 with valid TwiML so a transient
 * error never makes Twilio retry-storm (mirrors the SMS webhook, SCOPE §7).
 */
export function createVoiceRoute(deps: LeadDeps) {
  return async function postVoice(req: Request, res: Response): Promise<void> {
    const body = (req.body ?? {}) as TwilioVoiceInbound;

    // Personalize the spoken line if we can resolve the contractor; default gracefully.
    let sarahName = "Sarah";
    let companyName = "the team";
    try {
      const contractor = await deps.store.getContractorByTwilioNumber(String(body.To ?? "").trim());
      if (contractor) {
        sarahName = contractor.sarahName || sarahName;
        companyName = contractor.companyName || companyName;
      }
    } catch (err) {
      console.error("[voice] contractor lookup for greeting failed (non-fatal):", err);
    }

    try {
      await handleMissedCall(deps, body);
    } catch (err) {
      console.error("[voice] unhandled error (failing safe):", err);
    }

    const vr = new twilio.twiml.VoiceResponse();
    vr.say(`Sorry we missed your call! This is ${sarahName} with ${companyName}. We'll text you right now.`);
    vr.hangup();
    res.type("text/xml").send(vr.toString());
  };
}
