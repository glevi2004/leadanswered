import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store/memoryStore.js";
import { testContractor, testRecipients } from "./seed.js";
import { CapturingEmail, CapturingSms, scriptedModel } from "./testkit.js";
import { handleMissedCall, resolveCallerNumber, type TwilioVoiceInbound } from "./voiceIntake.js";

const NOW = new Date("2026-06-15T08:00:00Z");
const TWILIO_NUMBER = testContractor.twilioNumber!; // +18444157642 (the assistant number)
const CALLER = "+19788105602"; // the homeowner who called and wasn't picked up

function setup() {
  const store = new MemoryStore();
  store.seedContractor(testContractor, testRecipients);
  const sms = new CapturingSms();
  const deps = {
    store,
    model: scriptedModel([{ text: "Sorry we missed your call! What's the property address?" }]),
    sms,
    email: new CapturingEmail(),
    now: () => NOW,
  };
  return { store, sms, deps };
}

const basePayload = (over: Partial<TwilioVoiceInbound> = {}): TwilioVoiceInbound => ({
  CallSid: "CA-1",
  From: CALLER,
  To: TWILIO_NUMBER,
  ForwardedFrom: "+16175551212", // the contractor's real number that forwarded
  ...over,
});

describe("handleMissedCall", () => {
  it("creates a missed_call lead and texts the caller from the assistant number", async () => {
    const { store, sms, deps } = setup();
    const r = await handleMissedCall(deps, basePayload());
    expect(r.status).toBe("ok");
    expect(r.leadId).toBeTruthy();
    expect(sms.sent.some((s) => s.to === CALLER)).toBe(true); // opening went to the homeowner
    const ctx = await store.getContextByLeadId(r.leadId!);
    expect(ctx?.lead.contactPhone).toBe(CALLER);
    expect(ctx?.lead.contactName).toBe("Caller");
    expect(ctx?.lead.source).toBe("missed_call"); // drives channel-aware (intent-triage) prompting
    // The lead is keyed by CallSid (its idempotency key).
    expect(await store.findLeadBySourceMessageId("CA-1")).toEqual({ id: r.leadId });
  });

  it("is idempotent — the same CallSid yields one lead + one text", async () => {
    const { sms, deps } = setup();
    const first = await handleMissedCall(deps, basePayload());
    const second = await handleMissedCall(deps, basePayload());
    expect(first.status).toBe("ok");
    expect(second.status).toBe("skipped");
    expect(second.reason).toBe("duplicate");
    expect(sms.sent.filter((s) => s.to === CALLER)).toHaveLength(1);
  });

  it("does not interrupt an existing conversation (a repeat call with a new CallSid)", async () => {
    const { sms, deps } = setup();
    await handleMissedCall(deps, basePayload({ CallSid: "CA-1" }));
    const again = await handleMissedCall(deps, basePayload({ CallSid: "CA-2" }));
    expect(again.status).toBe("skipped");
    expect(again.reason).toBe("active_conversation");
    expect(sms.sent.filter((s) => s.to === CALLER)).toHaveLength(1); // still just the one opening
  });

  it("skips a call to an unknown Twilio number (no contractor)", async () => {
    const { sms, deps } = setup();
    const r = await handleMissedCall(deps, basePayload({ To: "+18009999999" }));
    expect(r.status).toBe("skipped");
    expect(r.reason).toBe("unknown_contractor");
    expect(sms.sent).toHaveLength(0);
  });

  it("skips when the caller number is missing", async () => {
    const { sms, deps } = setup();
    const r = await handleMissedCall(deps, basePayload({ From: "" }));
    expect(r.status).toBe("skipped");
    expect(r.reason).toBe("missing_params");
    expect(sms.sent).toHaveLength(0);
  });
});

describe("resolveCallerNumber", () => {
  it("prefers From as the original caller", () => {
    expect(resolveCallerNumber({ From: CALLER, To: TWILIO_NUMBER })).toBe(CALLER);
  });
  it("bails when From is the forwarding/contractor number (would text the contractor)", () => {
    expect(resolveCallerNumber({ From: TWILIO_NUMBER, To: TWILIO_NUMBER })).toBeNull();
    expect(resolveCallerNumber({ From: "+16175551212", ForwardedFrom: "+16175551212" })).toBeNull();
  });
  it("returns null when there is no From", () => {
    expect(resolveCallerNumber({ To: TWILIO_NUMBER })).toBeNull();
  });
});
