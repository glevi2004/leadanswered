import { describe, it, expect } from "vitest";
import { MemoryStore } from "./store/memoryStore.js";
import { Scheduler } from "./scheduler/scheduler.js";
import { testContractor, TEST_CONTRACTOR_ID } from "./seed.js";

/**
 * Tier A integrity tests — prove the booking/concurrency LOGIC against MemoryStore,
 * which mimics the DB constraints. The race-proof guarantee under real concurrency is
 * the Postgres EXCLUDE constraint, exercised by the Tier B suite (integrity.integration.test.ts).
 */

const TZ = "America/New_York";
const SLOT_9 = "2026-06-15T09:00:00.000Z";
const SLOT_930 = "2026-06-15T09:30:00.000Z";
const SLOT_10 = "2026-06-15T10:00:00.000Z";

function seed() {
  const s = new MemoryStore();
  s.seedContractor(testContractor);
  return s;
}
async function makeLead(store: MemoryStore, phone: string) {
  const ctx = await store.createLeadWithConversation({
    contractorId: TEST_CONTRACTOR_ID,
    contactName: "Lead",
    contactPhone: phone,
  });
  return ctx;
}
const book = (sched: Scheduler, leadId: string, startIso: string) =>
  sched.book({ leadId, contractorId: TEST_CONTRACTOR_ID, startIso, timezone: TZ });

describe("booking integrity", () => {
  it("refuses a second booking at the same slot — no double-booking", async () => {
    const store = seed();
    const sched = new Scheduler(store);
    const a = (await makeLead(store, "+15555550001")).lead.id;
    const b = (await makeLead(store, "+15555550002")).lead.id;

    expect((await book(sched, a, SLOT_9)).ok).toBe(true);
    expect(await book(sched, b, SLOT_9)).toEqual({ ok: false, reason: "slot_taken" });
    expect(store.getAppointments().filter((x) => x.status === "confirmed")).toHaveLength(1);
  });

  it("refuses an OVERLAPPING slot but allows back-to-back", async () => {
    const store = seed();
    const sched = new Scheduler(store);
    const a = (await makeLead(store, "+1a")).lead.id;
    const b = (await makeLead(store, "+1b")).lead.id;
    const c = (await makeLead(store, "+1c")).lead.id;

    expect((await book(sched, a, SLOT_9)).ok).toBe(true); // 9:00–10:00
    expect(await book(sched, b, SLOT_930)).toEqual({ ok: false, reason: "slot_taken" }); // 9:30 overlaps
    expect((await book(sched, c, SLOT_10)).ok).toBe(true); // 10:00–11:00 adjacent, fine
  });

  it("allows only ONE active appointment per lead", async () => {
    const store = seed();
    const sched = new Scheduler(store);
    const a = (await makeLead(store, "+1a")).lead.id;

    expect((await book(sched, a, SLOT_9)).ok).toBe(true);
    expect(await book(sched, a, SLOT_10)).toEqual({ ok: false, reason: "lead_has_active" });
  });

  it("availability subtracts booked times — Sarah can't offer a taken slot", async () => {
    const store = seed();
    const sched = new Scheduler(store);
    const a = (await makeLead(store, "+1a")).lead.id;
    await book(sched, a, SLOT_9);

    const free = await sched.filterAvailable(TEST_CONTRACTOR_ID, [
      { iso: SLOT_9, label: "9am" },
      { iso: SLOT_10, label: "10am" },
    ]);
    expect(free.map((s) => s.iso)).toEqual([SLOT_10]);
  });

  it("a freed (cancelled) slot becomes bookable again", async () => {
    const store = seed();
    const sched = new Scheduler(store);
    const a = (await makeLead(store, "+1a")).lead.id;
    const b = (await makeLead(store, "+1b")).lead.id;
    const r = await book(sched, a, SLOT_9);
    expect(r.ok).toBe(true);
    if (r.ok) await sched.cancel(r.id, "changed mind", new Date().toISOString());
    expect((await book(sched, b, SLOT_9)).ok).toBe(true); // slot is free again
  });

  it("transitionLeadStatus fires once — exactly-once notifications", async () => {
    const store = seed();
    const a = (await makeLead(store, "+1a")).lead.id;
    expect(await store.transitionLeadStatus(a, ["new", "contacted"], "qualifying")).toBe(true);
    expect(await store.transitionLeadStatus(a, ["new", "contacted"], "qualifying")).toBe(false);
  });

  it("appendInboundIdempotent dedupes by providerSid", async () => {
    const store = seed();
    const ctx = await makeLead(store, "+1a");
    expect((await store.appendInboundIdempotent(ctx.conversation.id, { body: "hi", providerSid: "SM1" })).inserted).toBe(true);
    expect((await store.appendInboundIdempotent(ctx.conversation.id, { body: "hi", providerSid: "SM1" })).inserted).toBe(false);
  });

  it("resolveEscalationIfOpen relays at most once", async () => {
    const store = seed();
    const ctx = await makeLead(store, "+1a");
    const esc = await store.createEscalation({
      leadId: ctx.lead.id,
      contractorId: TEST_CONTRACTOR_ID,
      conversationId: ctx.conversation.id,
      question: "do you finance?",
    });
    expect(await store.resolveEscalationIfOpen(esc.id, "yes we do")).toBe(true);
    expect(await store.resolveEscalationIfOpen(esc.id, "yes we do")).toBe(false);
  });

  it("withConversationLock serializes turns for one conversation", async () => {
    const store = seed();
    const ctx = await makeLead(store, "+1a");
    const order: number[] = [];
    const slow = (n: number, ms: number) =>
      store.withConversationLock(ctx.conversation.id, async () => {
        await new Promise((r) => setTimeout(r, ms));
        order.push(n);
      });
    await Promise.all([slow(1, 20), slow(2, 1)]); // started together; #1 sleeps longer
    expect(order).toEqual([1, 2]); // but #2 waits for #1 → serialized in order
  });
});
