import { describe, it, expect } from "vitest";
import { MemoryStore } from "../store/memoryStore.js";
import { CapturingEmail, CapturingSms } from "../testkit.js";
import { testContractor, testRecipients, TEST_CONTRACTOR_ID } from "../seed.js";
import { buildTools, type ToolDeps, type ToolState } from "./tools.js";

const NOW = new Date("2026-06-15T08:00:00Z"); // Monday 08:00 UTC
const MON_9 = "2026-06-15T09:00:00.000Z";

function setup() {
  const store = new MemoryStore();
  store.seedContractor(testContractor, testRecipients);
  return { store, sms: new CapturingSms(), email: new CapturingEmail() };
}

async function makeTools(store: MemoryStore, sms: CapturingSms, email: CapturingEmail) {
  const ctx = await store.createLeadWithConversation({
    contractorId: TEST_CONTRACTOR_ID,
    contactName: "Levi",
    contactPhone: "+19788105602",
    source: "manual",
  });
  const deps: ToolDeps = { store, sms, email, now: NOW };
  const state: ToolState = {
    contractor: ctx.contractor,
    lead: ctx.lead,
    conversation: ctx.conversation,
    gathered: ctx.conversation.gathered,
  };
  const t = buildTools(deps, state);
  const run = <K extends keyof typeof t>(name: K, input: unknown) =>
    (t[name].execute as (i: unknown, o: unknown) => Promise<unknown>)(input, {});
  return { run, state, leadId: ctx.lead.id };
}

describe("agent tools", () => {
  it("qualify_lead: full info qualifies and notifies the owner once", async () => {
    const { store, sms } = setup();
    const { run } = await makeTools(store, sms, new CapturingEmail());
    const r1 = (await run("qualify_lead", { projectType: "roof leak", zip: "02134", isDecisionMaker: true })) as any;
    expect(r1.qualified).toBe(true);
    expect(r1.inArea).toBe(true);
    expect(sms.sent.filter((s) => s.body.includes("Qualified lead"))).toHaveLength(1);
    await run("qualify_lead", { projectType: "roof leak" });
    expect(sms.sent.filter((s) => s.body.includes("Qualified lead"))).toHaveLength(1);
  });

  it("qualify_lead: out-of-area zip disqualifies (code decides, not the model)", async () => {
    const { store, sms } = setup();
    const { run, leadId } = await makeTools(store, sms, new CapturingEmail());
    const r = (await run("qualify_lead", { projectType: "roof leak", zip: "02601", isDecisionMaker: true })) as any;
    expect(r.inArea).toBe(false);
    expect(r.qualified).toBe(false);
    const ctx = await store.getContextByLeadId(leadId);
    expect(ctx?.lead.status).toBe("disqualified");
  });

  it("qualify_lead: not the homeowner + owner phone → deterministic hand-off pings the contractor once", async () => {
    const { store, sms } = setup();
    const { run } = await makeTools(store, sms, new CapturingEmail());
    const r = (await run("qualify_lead", { projectType: "roof leak", zip: "02134", isDecisionMaker: false, ownerPhone: "+16175551234" })) as any;
    expect(r.ownerHandoff).toBe("done");
    expect(sms.sent.filter((s) => s.body.includes("isn't the homeowner") && s.body.includes("+16175551234"))).toHaveLength(1);
    // idempotent — a second qualify_lead does NOT re-ping
    await run("qualify_lead", { projectType: "roof leak", isDecisionMaker: false, ownerPhone: "+16175551234" });
    expect(sms.sent.filter((s) => s.body.includes("isn't the homeowner"))).toHaveLength(1);
  });

  it("qualify_lead: not the homeowner but no phone yet → need_owner_contact, no ping", async () => {
    const { store, sms } = setup();
    const { run } = await makeTools(store, sms, new CapturingEmail());
    const r = (await run("qualify_lead", { projectType: "roof leak", zip: "02134", isDecisionMaker: false })) as any;
    expect(r.ownerHandoff).toBe("need_owner_contact");
    expect(sms.sent.some((s) => s.body.includes("isn't the homeowner"))).toBe(false);
  });

  it("check_availability: overview returns windows; a focused day returns bookable times with ids", async () => {
    const { store, sms } = setup();
    const { run, state } = await makeTools(store, sms, new CapturingEmail());

    // General question → open WINDOWS (day + range labels), no id map.
    const overview = (await run("check_availability", {})) as { windows: string[] };
    expect(Array.isArray(overview.windows)).toBe(true);
    expect(overview.windows.length).toBeGreaterThan(0);

    // Focused on Monday → concrete start TIMES with short ids; first Monday start is 9:00.
    const mon = (await run("check_availability", { dayOfWeek: 1 })) as { times: { id: string; label: string }[] };
    expect(mon.times[0].id).toBe("1");
    expect(state.gathered.offeredSlots!["1"]).toBe(MON_9);

    // next_week + Monday → the FOLLOWING Monday, not this one.
    await run("check_availability", { range: "next_week", dayOfWeek: 1 });
    const first = state.gathered.offeredSlots!["1"];
    expect(new Date(first).getTime()).toBeGreaterThan(new Date(MON_9).getTime() + 5 * 24 * 3600 * 1000);
  });

  it("book_appointment: the deterministic gate", async () => {
    const { store, sms } = setup();
    const { run, leadId } = await makeTools(store, sms, new CapturingEmail());

    // not qualified yet → refused
    expect((await run("book_appointment", { slotId: MON_9, fullAddress: "100 Linden St" })) as any).toMatchObject({ ok: false, reason: "not_qualified" });

    await run("qualify_lead", { projectType: "roof leak", zip: "02134", isDecisionMaker: true });

    // qualified but a time outside any standing window → refused
    expect((await run("book_appointment", { slotId: "2030-01-01T00:00:00.000Z", fullAddress: "100 Linden St" })) as any).toMatchObject({ ok: false, reason: "slot_unavailable" });

    // qualified but no address → refused
    expect((await run("book_appointment", { slotId: MON_9, fullAddress: "" })) as any).toMatchObject({ ok: false, reason: "need_address" });

    // real in-window time + address → booked + owner notified
    const ok = (await run("book_appointment", { slotId: MON_9, fullAddress: "100 Linden St, Boston, MA 02134" })) as any;
    expect(ok.ok).toBe(true);
    expect(ok.slotIso).toBe(MON_9);
    expect(store.getAppointments()).toHaveLength(1);
    expect(sms.sent.some((s) => s.body.includes("New booking"))).toBe(true);
    const ctx = await store.getContextByLeadId(leadId);
    expect(ctx?.lead.status).toBe("booked");
  });

  it("reschedule_appointment and cancel_appointment (post-booking)", async () => {
    const MON_2 = "2026-06-15T14:00:00.000Z";
    const { store, sms } = setup();
    const { run } = await makeTools(store, sms, new CapturingEmail());
    await run("qualify_lead", { projectType: "roof leak", zip: "02134", isDecisionMaker: true });
    await run("book_appointment", { slotId: MON_9, fullAddress: "100 Linden St" });

    const rr = (await run("reschedule_appointment", { newSlotId: MON_2 })) as any;
    expect(rr.ok).toBe(true);
    expect(store.getAppointments()[0].startIso).toBe(MON_2);
    expect(store.getAppointments()[0].rescheduledFromIso).toBe(MON_9);
    expect(sms.sent.some((s) => s.body.includes("Rescheduled"))).toBe(true);

    expect((await run("reschedule_appointment", { newSlotId: "2030-01-01T00:00:00.000Z" })) as any).toMatchObject({ ok: false, reason: "slot_unavailable" });

    expect((await run("cancel_appointment", { reason: "changed my mind" })) as any).toMatchObject({ ok: true });
    expect(store.getAppointments()[0].status).toBe("cancelled");
    expect(sms.sent.some((s) => s.body.includes("cancelled"))).toBe(true);

    expect((await run("reschedule_appointment", { newSlotId: MON_9 })) as any).toMatchObject({ ok: false, reason: "no_appointment" });
  });
});
