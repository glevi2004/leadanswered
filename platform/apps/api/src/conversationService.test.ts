import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store/memoryStore.js";
import { createLeadAndGreet } from "./leadService.js";
import { handleInbound } from "./conversationService.js";
import { testContractor, testRecipients, TEST_CONTRACTOR_ID } from "./seed.js";
import { CapturingEmail, CapturingSms, scriptedModel, throwingModel } from "./testkit.js";

const TO = testContractor.twilioNumber!; // contractor's dedicated number
const FROM = "+15555550123"; // the homeowner/lead
const OWNER_PHONE = "+18335559999";
const OWNER_EMAIL = "marcus@apexroofing.example";
const NOW = new Date("2026-06-15T08:00:00Z"); // Monday 08:00 UTC
const MON_9 = "2026-06-15T09:00:00.000Z";
const ADDR = "100 Linden St, Boston, MA 02134";

function seed(): MemoryStore {
  const s = new MemoryStore();
  s.seedContractor(testContractor, testRecipients);
  return s;
}

describe("Sarah agent engine (SCOPE §5, §7.5)", () => {
  it("end-to-end booking: agent qualifies → offers times → books → appointment + notifications", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const email = new CapturingEmail();
    // One model "brain" scripts every doGenerate call across the opening + turns.
    const model = scriptedModel([
      { text: "Hi Levi! I'm Sarah with Apex Roofing. What's the full address of the property?" }, // opening
      // turn 1: learns everything, qualifies, offers times
      { tool: "qualify_lead", input: { projectType: "roof leak", town: "Boston", zip: "02134", fullAddress: ADDR, isDecisionMaker: true } },
      { tool: "check_availability", input: {} },
      { text: "Great! I can do Monday 9am, Monday 2pm, or Tuesday 11am. Which works?" },
      // turn 2: books the chosen slot
      { tool: "book_appointment", input: { chosenTime: MON_9, fullAddress: ADDR } },
      { text: "You're all set for Monday at 9am! See you then." },
    ]);
    const deps = { store, model, sms, email, now: () => NOW };

    const lead = await createLeadAndGreet(deps, {
      contractorId: TEST_CONTRACTOR_ID,
      contactName: "Levi",
      contactPhone: FROM,
    });
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: FROM, body });

    expect((await send("roof leak at 100 Linden St, Boston 02134, it's my home")).status).toBe("ok");
    expect((await send("Monday at 9 works")).status).toBe("ok");

    const appts = store.getAppointments();
    expect(appts).toHaveLength(1);
    expect(appts[0].startIso).toBe(MON_9);

    const ctx = await store.getContextByLeadId(lead.leadId);
    expect(ctx?.lead.status).toBe("booked");
    expect(ctx?.lead.fullAddress).toBe(ADDR);

    const ownerSms = sms.sent.filter((s) => s.to === OWNER_PHONE);
    expect(ownerSms.some((s) => s.body.includes("Qualified lead"))).toBe(true);
    expect(ownerSms.some((s) => s.body.includes("New booking"))).toBe(true);

    const booking = email.sent.filter((e) => e.to === OWNER_EMAIL).find((e) => e.subject.startsWith("New booking"));
    expect(booking).toBeTruthy();
    expect(booking!.body).toContain("100 Linden St");
    expect(booking!.body).toContain("Monday");
  });

  it("post-booking: a booked lead can text back to reschedule (conversation stays reachable)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const MON_2 = "2026-06-15T14:00:00.000Z";
    const model = scriptedModel([
      { text: "Hi Levi! What's the property address?" }, // opening
      { tool: "qualify_lead", input: { projectType: "roof leak", town: "Boston", zip: "02134", fullAddress: ADDR, isDecisionMaker: true } },
      { tool: "book_appointment", input: { chosenTime: MON_9, fullAddress: ADDR } },
      { text: "You're booked for Monday at 9am!" },
      // ...later, the lead texts back to reschedule
      { tool: "reschedule_appointment", input: { chosenTime: MON_2 } },
      { text: "Done — I moved you to Monday at 2pm." },
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: FROM });

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "roof leak at 100 Linden St Boston 02134, my home, Monday 9 works" });
    expect(store.getAppointments()[0].startIso).toBe(MON_9);

    // the booked lead texts back later — must still be found (state "booked", not "done")
    const r = await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "actually can we do Monday afternoon instead?" });
    expect(r.status).toBe("ok");
    expect(store.getAppointments()[0].startIso).toBe(MON_2);
  });

  it("disqualifies an out-of-area lead and never books (CODE decides — §5.1)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: "Hi, what do you need?" },
      { tool: "qualify_lead", input: { zip: "02601", projectType: "roof leak", isDecisionMaker: true } }, // Cape Cod — out
      { text: "Sorry, we don't cover the Cape — best of luck!" },
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    const lead = await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Sam", contactPhone: FROM });

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "02601, roof leak, my place" });

    expect(store.getAppointments()).toHaveLength(0);
    const ctx = await store.getContextByLeadId(lead.leadId);
    expect(ctx?.lead.status).toBe("disqualified");
    expect(sms.sent.filter((s) => s.to === OWNER_PHONE)).toHaveLength(0); // owner not subscribed to disqualified
  });

  it("deterministic hand-off: a not-homeowner lead who texts a number pings the contractor even if the model doesn't", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: "Hi! What's the property address?" }, // opening
      { tool: "qualify_lead", input: { projectType: "roof leak", town: "Boston", zip: "02134", isDecisionMaker: false } },
      { text: "Got it — since you're not the owner, can you share the homeowner's name and phone?" },
      // the tenant texts the owner's number; the model just replies (never passes ownerPhone) → code backstop fires
      { text: "Thanks! I'll pass this along to the team." },
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Sam", contactPhone: FROM });

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "roof leak at 100 Linden St Boston 02134, I just rent here" });
    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "the owner is Jane, her number is 617-555-9090" });

    expect(
      sms.sent.some((s) => s.to === OWNER_PHONE && s.body.includes("isn't the homeowner") && s.body.includes("6175559090")),
    ).toBe(true);
  });

  it("escalation loop: agent escalates → contractor notified → contractor's reply relayed to the homeowner", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: "Hi Levi! How can I help?" }, // opening
      { tool: "escalate_to_contractor", input: { question: "Customer asks if we install metal roofs. Not sure." } },
      { text: "Great question! Let me check with the team and I'll be right back to you." },
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Levi", contactPhone: FROM });

    // homeowner asks something the agent can't answer → escalates
    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "do you guys install metal roofs?" });
    expect(sms.sent.some((s) => s.to === OWNER_PHONE && s.body.includes("metal roofs"))).toBe(true);
    expect(store.getEscalations().filter((e) => e.status === "open")).toHaveLength(1);

    // contractor texts back (From = owner phone, To = the Twilio number) → relayed to homeowner
    const r = await handleInbound(deps, { toNumber: TO, fromNumber: OWNER_PHONE, body: "Yep, we do metal roofs!" });
    expect(r.status).toBe("ok");
    expect(sms.sent.some((s) => s.to === FROM && s.body.includes("metal roofs"))).toBe(true);
    expect(store.getEscalations().filter((e) => e.status === "open")).toHaveLength(0); // resolved
  });

  it("is idempotent — the same Twilio MessageSid yields exactly one reply (§7)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: "opening" },
      { tool: "qualify_lead", input: { projectType: "roof leak" } },
      { text: "What's the full address?" },
    ]);
    const deps = { store, model, sms, now: () => NOW };
    await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Jane", contactPhone: FROM });
    const before = sms.sent.length;

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "leak", providerSid: "SM123" });
    const dup = await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "leak", providerSid: "SM123" });

    expect(dup.status).toBe("skipped");
    expect(sms.sent.slice(before).filter((s) => s.to === FROM)).toHaveLength(1);
  });

  it("never books from a price question (§7.5)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      { text: "opening" },
      { text: "Pricing really needs an on-site look — and the estimate is free. Want me to find a time?" },
    ]);
    const deps = { store, model, sms, now: () => NOW };
    await createLeadAndGreet(deps, { contractorId: TEST_CONTRACTOR_ID, contactName: "Jane", contactPhone: FROM });

    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "how much does a new roof cost?" });
    expect(store.getAppointments()).toHaveLength(0);
  });

  it("fails safe on AI error — no reply sent, no crash (§7)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    await createLeadAndGreet(
      { store, model: scriptedModel([{ text: "opening" }]), sms, now: () => NOW },
      { contractorId: TEST_CONTRACTOR_ID, contactName: "Jane", contactPhone: FROM },
    );
    const before = sms.sent.length;

    const res = await handleInbound(
      { store, model: throwingModel(), sms, now: () => NOW },
      { toNumber: TO, fromNumber: FROM, body: "hello" },
    );

    expect(res.status).toBe("error");
    expect(sms.sent.length).toBe(before);
  });

  it("cold inbound auto-starts a conversation when allowColdInbound is on", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([{ text: "Hi! Sarah with Apex Roofing — what's going on with your roof?" }]);
    const r = await handleInbound(
      { store, model, sms, now: () => NOW, allowColdInbound: true },
      { toNumber: TO, fromNumber: FROM, body: "do y'all fix roof leaks?" },
    );
    expect(r.status).toBe("ok");
    expect(sms.sent.some((s) => s.to === FROM)).toBe(true);
  });

  it("cold inbound is ignored by default (lead-initiated product flow)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const r = await handleInbound(
      { store, model: scriptedModel([]), sms, now: () => NOW },
      { toNumber: TO, fromNumber: FROM, body: "hi" },
    );
    expect(r.status).toBe("skipped");
    expect(sms.sent).toHaveLength(0);
  });
});
