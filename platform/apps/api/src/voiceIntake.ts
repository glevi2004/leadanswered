import { createLeadAndGreet, type LeadDeps } from "./leadService.js";

/** The subset of Twilio's inbound *voice* webhook params we read (SCOPE §9.7). */
export interface TwilioVoiceInbound {
  /** The original caller (homeowner) on the forwarded leg. */
  From?: string;
  /** The Twilio number the call was forwarded to — identifies the contractor. */
  To?: string;
  /** Unique call id — our idempotency key (one text per call). */
  CallSid?: string;
  /** The contractor's real number that forwarded (carrier-dependent; not always present). */
  ForwardedFrom?: string;
}

export interface MissedCallResult {
  status: "ok" | "skipped";
  reason?: string;
  leadId?: string;
}

/**
 * Pick the homeowner's number off a forwarded call. Normally Twilio's `From` is the
 * original caller, so we prefer it — but guard against carriers that put the forwarding
 * (contractor) number in `From`, in which case it would equal `To`/`ForwardedFrom` and we
 * bail rather than text the contractor. We log the raw params so call #1 confirms the shape.
 */
export function resolveCallerNumber(p: TwilioVoiceInbound): string | null {
  const from = (p.From ?? "").trim();
  const to = (p.To ?? "").trim();
  const forwardedFrom = (p.ForwardedFrom ?? "").trim();
  if (!from) return null;
  if (from === to || from === forwardedFrom) return null; // From is the contractor, not the caller
  return from;
}

/**
 * Missed-call text-back intake (SCOPE §9.7). A homeowner called the contractor's real
 * phone, it went unanswered, and the carrier forwarded the call to the contractor's Twilio
 * number — so by the time we get this webhook the miss already happened and we text the
 * caller immediately (no dial-back). A missed call is just a new lead source that reuses the
 * same intake path as `/lead` and email. Never throws on expected conditions (SCOPE §7.5).
 */
export async function handleMissedCall(
  deps: LeadDeps,
  payload: TwilioVoiceInbound,
): Promise<MissedCallResult> {
  const to = String(payload.To ?? "").trim();
  const callSid = payload.CallSid ? String(payload.CallSid) : null;
  const caller = resolveCallerNumber(payload);

  console.log(
    `[voice] inbound call CallSid=${callSid ?? "-"} From=${payload.From ?? "-"} ` +
      `To=${to || "-"} ForwardedFrom=${payload.ForwardedFrom ?? "-"}`,
  );

  if (!caller || !to) {
    console.warn(`[voice] missing caller/To — skipped`);
    return { status: "skipped", reason: "missing_params" };
  }

  const contractor = await deps.store.getContractorByTwilioNumber(to);
  if (!contractor) {
    console.warn(`[voice] no contractor for number "${to}" — skipped`);
    return { status: "skipped", reason: "unknown_contractor" };
  }

  // Idempotency FIRST: a retried voice webhook (Twilio re-POST of the same call) must not
  // create a 2nd lead/text. CallSid → Lead.sourceMessageId (@unique); the fast read is a
  // courtesy, the constraint (caught as P2002 below) is the real guard. Mirrors email intake.
  if (callSid && (await deps.store.findLeadBySourceMessageId(callSid))) {
    console.log(`[voice] duplicate call ${callSid} — ignored (idempotent)`);
    return { status: "skipped", reason: "duplicate" };
  }

  // Then: don't interrupt an in-flight conversation with a "sorry we missed you". A *different*
  // call from a caller who already has a conversation with this contractor is left untouched.
  if (await deps.store.findActiveContextByPhones(to, caller)) {
    console.log(`[voice] ${caller} already has a conversation — skipped`);
    return { status: "skipped", reason: "active_conversation" };
  }

  let leadId: string;
  try {
    ({ leadId } = await createLeadAndGreet(deps, {
      contractorId: contractor.id,
      contactName: "Caller",
      contactPhone: caller,
      source: "missed_call",
      sourceMessageId: callSid,
    }));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      console.log(`[voice] duplicate call ${callSid} — ignored (idempotent, raced)`);
      return { status: "skipped", reason: "duplicate" };
    }
    throw e;
  }
  console.log(`[voice] new missed-call lead ${leadId} for ${contractor.companyName} from ${caller}`);
  return { status: "ok", leadId };
}
