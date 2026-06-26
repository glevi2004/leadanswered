import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store/memoryStore.js";
import { testContractor, testRecipients } from "./seed.js";
import { CapturingEmail, CapturingSms, scriptedModel } from "./testkit.js";
import { handleInboundEmail, type PostmarkInbound } from "./emailIntake.js";

const NOW = new Date("2026-06-15T08:00:00Z");
const HOMEOWNER = "+19788105602";

function setup() {
  const store = new MemoryStore();
  store.seedContractor(testContractor, testRecipients);
  const sms = new CapturingSms();
  const deps = {
    store,
    model: scriptedModel([{ text: "Hi! Thanks for reaching out, what's the address?" }]),
    sms,
    email: new CapturingEmail(),
    now: () => NOW,
  };
  return { store, sms, deps };
}

const basePayload = (over: Partial<PostmarkInbound> = {}): PostmarkInbound => ({
  MessageID: "msg-1",
  OriginalRecipient: "leads+apex@leads.leadanswered.com",
  Subject: "New lead from your website",
  TextBody: "Name: John Smith\nPhone: (978) 810-5602\nMessage: My roof is leaking.",
  ...over,
});

describe("handleInboundEmail", () => {
  it("matches the contractor by slug, creates a lead, and fires Sarah's opening SMS", async () => {
    const { store, sms, deps } = setup();
    const r = await handleInboundEmail(deps, basePayload());
    expect(r.status).toBe("ok");
    expect(r.leadId).toBeTruthy();
    expect(sms.sent.some((s) => s.to === HOMEOWNER)).toBe(true); // opening went to the homeowner
    const ctx = await store.getContextByLeadId(r.leadId!);
    expect(ctx?.lead.contactName).toBe("John Smith");
    expect(ctx?.lead.contactPhone).toBe(HOMEOWNER);
  });

  it("skips an unknown contractor slug (no lead, no SMS)", async () => {
    const { sms, deps } = setup();
    const r = await handleInboundEmail(deps, basePayload({ OriginalRecipient: "leads+nope@leads.leadanswered.com" }));
    expect(r.status).toBe("skipped");
    expect(r.reason).toBe("unknown_contractor");
    expect(sms.sent).toHaveLength(0);
  });

  it("skips gracefully when no phone can be parsed", async () => {
    const { sms, deps } = setup();
    const r = await handleInboundEmail(deps, basePayload({ TextBody: "Name: Sam\nMessage: please email me" }));
    expect(r.status).toBe("skipped");
    expect(r.reason).toBe("no_phone");
    expect(sms.sent).toHaveLength(0);
  });

  it("is idempotent — the same Postmark MessageID yields one lead + one text", async () => {
    const { store, sms, deps } = setup();
    const first = await handleInboundEmail(deps, basePayload());
    const second = await handleInboundEmail(deps, basePayload());
    expect(first.status).toBe("ok");
    expect(second.status).toBe("skipped");
    expect(second.reason).toBe("duplicate");
    expect(sms.sent.filter((s) => s.to === HOMEOWNER)).toHaveLength(1);
  });
});
