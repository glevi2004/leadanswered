import { describe, it, expect } from "vitest";
import { MemoryStore } from "../store/memoryStore.js";
import { createLeadAndGreet } from "../leadService.js";
import { handleInbound } from "../conversationService.js";
import { testOrganization, testRecipients, TEST_ORGANIZATION_ID } from "../seed.js";
import { CapturingEmail, CapturingSms, scriptedModel } from "../testkit.js";

const TO = testOrganization.twilioNumber!;
const FROM = "+15555550123";
const OWNER_PHONE = "+18335559999";
const NOW = new Date("2026-06-15T08:00:00Z"); // Monday 08:00 UTC
const ADDR = "100 Linden St, Boston, MA 02134";

function seed(): MemoryStore {
  const s = new MemoryStore();
  s.seedOrganization(testOrganization, testRecipients);
  return s;
}

// Every intake turn calls the extractor once; the model's only job is to READ the reply. We script
// its structured output. All fields must be present (nullable), so fill from a null baseline.
const NULLS = {
  name: null, projectType: null, intent: null, fullAddress: null, town: null, zip: null,
  isDecisionMaker: null, ownerName: null, ownerPhone: null, chosenDayOfWeek: null, chosenDayLabel: null,
  chosenTime: null, addressConfirmed: null, offScript: "none", offScriptQuestion: null,
};
const EX = (o: Record<string, unknown>) => ({ text: JSON.stringify({ ...NULLS, ...o }) });

describe("intake engine — Workflow 1 (website) + Workflow 2 (missed call)", () => {
  it("website happy path: opening → address → customer → windows → times → book (+ captures the name)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const email = new CapturingEmail();
    const model = scriptedModel([
      EX({ fullAddress: ADDR, town: "Boston", zip: "02134", projectType: "roof leak", intent: "new_project", name: "Levi" }),
      EX({ isDecisionMaker: true }),
      EX({ chosenDayOfWeek: 1, chosenDayLabel: "Monday" }),
      EX({ chosenTime: "9 am" }),
    ]);
    const deps = { store, model, sms, email, now: () => NOW };
    // Lead starts with a PLACEHOLDER name (as a cold/website lead would) — the intake must capture it.
    const lead = await createLeadAndGreet(deps, { organizationId: TEST_ORGANIZATION_ID, contactName: "New lead", contactPhone: FROM });
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: FROM, body });

    // opening asks for the address (locked copy), no model call needed
    expect(lead.opening).toMatch(/property address/i);
    expect(lead.opening).toMatch(/street, city, and ZIP/);

    const r1 = await send("Levi here, roof leak at 100 Linden St, Boston 02134");
    expect(r1.reply).toMatch(/are you the decision-maker/i);
    const r2 = await send("yep it's my house");
    expect(r2.reply).toMatch(/here's when we could get someone out/i);
    const r3 = await send("Monday works");
    expect(r3.reply).toMatch(/On Monday I've got/);
    const r4 = await send("9am please");
    expect(r4.reply).toMatch(/You're all set for/);

    const appts = store.getAppointments();
    expect(appts).toHaveLength(1);
    const ctx = await store.getContextByLeadId(lead.leadId);
    expect(ctx?.lead.status).toBe("booked");
    expect(ctx?.lead.contactName).toBe("Levi"); // the "no name" fix, in the intake flow
    expect(ctx?.conversation.state).toBe("agent"); // intake ended → agent phase
    expect(sms.sent.some((s) => s.to === OWNER_PHONE && s.body.includes("New booking"))).toBe(true);
  });

  it("Branch A — not the customer: asks for the owner's contact, then reaches out to them as a new lead", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      EX({ fullAddress: ADDR, town: "Boston", zip: "02134", projectType: "roof leak", intent: "new_project", isDecisionMaker: false }),
      EX({ ownerName: "Jane", ownerPhone: "617-555-9090" }),
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    const lead = await createLeadAndGreet(deps, { organizationId: TEST_ORGANIZATION_ID, contactName: "Sam", contactPhone: FROM });
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: FROM, body });

    const r1 = await send("roof leak at 100 Linden St Boston 02134, I just rent here");
    expect(r1.reply).toMatch(/decision-maker's name and best phone/i);
    const r2 = await send("the owner is Jane, 617-555-9090");
    expect(r2.reply).toMatch(/reach out to Jane directly/i);

    // a NEW lead was created for the customer, and Sarah texted them the A3 outreach
    const owner = await store.findLeadContextByOrganizationPhone(TEST_ORGANIZATION_ID, "+16175559090");
    expect(owner?.lead.contactName).toBe("Jane");
    expect(sms.sent.some((s) => s.to === "+16175559090" && /passed along your number/i.test(s.body))).toBe(true);
    // the referrer thread is closed
    const ctx = await store.getContextByLeadId(lead.leadId);
    expect(ctx?.conversation.state).toBe("done");
  });

  it("Branch B — out of area: confirms the address first, then declines (never books)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      EX({ fullAddress: "5 Ocean St, Hyannis MA 02601", zip: "02601", projectType: "roof leak", intent: "new_project", isDecisionMaker: true }),
      EX({ addressConfirmed: true }),
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    await createLeadAndGreet(deps, { organizationId: TEST_ORGANIZATION_ID, contactName: "Pat", contactPhone: FROM });
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: FROM, body });

    const r1 = await send("roof leak at 5 Ocean St, Hyannis 02601, my place");
    expect(r1.reply).toMatch(/outside our service area/i);
    expect(r1.reply).toMatch(/confirm again/i);
    const r2 = await send("yes that's right");
    expect(r2.reply).toMatch(/it really is outside our service area/i);
    expect(store.getAppointments()).toHaveLength(0);
  });

  it("missed call — new job → asks name + address; not a job → escalates", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([EX({ intent: "new_project", projectType: "roof leak" })]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    const lead = await createLeadAndGreet(deps, { organizationId: TEST_ORGANIZATION_ID, contactName: "Caller", contactPhone: FROM, source: "missed_call" });
    expect(lead.opening).toMatch(/Sorry we missed your call/i);
    const r = await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "yeah my roof is leaking" });
    expect(r.reply).toMatch(/name and property address/i);

    // a different caller with an existing-customer intent → escalate, hand to the team
    const sms2 = new CapturingSms();
    const model2 = scriptedModel([EX({ intent: "existing_customer" })]);
    const deps2 = { store, model: model2, sms: sms2, email: new CapturingEmail(), now: () => NOW };
    const FROM2 = "+15555550999";
    await createLeadAndGreet(deps2, { organizationId: TEST_ORGANIZATION_ID, contactName: "Caller", contactPhone: FROM2, source: "missed_call" });
    const r2 = await handleInbound(deps2, { toNumber: TO, fromNumber: FROM2, body: "when's my appointment tomorrow?" });
    expect(r2.reply).toMatch(/let the team know/i);
    expect(store.getEscalations().some((e) => e.status === "open")).toBe(true);
  });

  it("requires the NAME — re-asks instead of proceeding as a placeholder", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      EX({ fullAddress: ADDR, town: "Boston", zip: "02134", projectType: "roof leak", intent: "new_project", isDecisionMaker: true }),
      EX({ name: "Levi" }),
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    // Lead starts as a placeholder (missed-call "Caller"); the customer gives the address but no name.
    const lead = await createLeadAndGreet(deps, { organizationId: TEST_ORGANIZATION_ID, contactName: "Caller", contactPhone: FROM });
    const send = (body: string) => handleInbound(deps, { toNumber: TO, fromNumber: FROM, body });

    const r1 = await send("roof leak at 100 Linden St, Boston 02134, yep I own it");
    expect(r1.reply).toMatch(/what's your name/i); // re-asks, does NOT proceed as "Caller"
    expect((await store.getContextByLeadId(lead.leadId))?.lead.contactName).toBe("Caller");

    const r2 = await send("oh sorry, it's Levi");
    expect((await store.getContextByLeadId(lead.leadId))?.lead.contactName).toBe("Levi");
    expect(r2.reply).toMatch(/here's when we could get someone out/i); // now proceeds
  });

  it("offers only the NEAREST occurrence of a chosen day (never the same weekday next week)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const model = scriptedModel([
      EX({ fullAddress: ADDR, town: "Boston", zip: "02134", projectType: "roof leak", intent: "new_project", name: "Levi", isDecisionMaker: true }),
      EX({ chosenDayOfWeek: 1, chosenDayLabel: "Monday" }),
    ]);
    const deps = { store, model, sms, email: new CapturingEmail(), now: () => NOW };
    const lead = await createLeadAndGreet(deps, { organizationId: TEST_ORGANIZATION_ID, contactName: "New lead", contactPhone: FROM });
    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "roof leak at 100 Linden St Boston 02134, I own it, I'm Levi" });
    await handleInbound(deps, { toNumber: TO, fromNumber: FROM, body: "Monday works" });

    const slots = Object.values((await store.getContextByLeadId(lead.leadId))!.conversation.gathered!.offeredSlots ?? {});
    expect(slots.length).toBeGreaterThan(0);
    const dates = new Set(slots.map((iso) => iso.slice(0, 10))); // UTC organization → all times on ONE day
    expect(dates.size).toBe(1);
  });
});
