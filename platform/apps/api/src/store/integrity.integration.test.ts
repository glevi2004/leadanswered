import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Tier B — the ONLY tests that prove the database integrity guarantees, because
 * MemoryStore can't enforce constraints. Requires a throwaway Postgres with the
 * migrations applied:
 *
 *   createdb leadanswered_test
 *   DATABASE_URL=postgres://…/leadanswered_test pnpm --filter @leadanswered/db migrate:deploy
 *   TEST_DATABASE_URL=postgres://…/leadanswered_test pnpm --filter @leadanswered/api test:integration
 *
 * Without TEST_DATABASE_URL the suite is skipped (so the default test run stays fast).
 */
const TEST_DB = process.env.TEST_DATABASE_URL;
if (TEST_DB) process.env.DATABASE_URL = TEST_DB; // point the shared client at the test DB

const run = TEST_DB ? describe : describe.skip;

const SLOT = "2027-01-04T15:00:00.000Z";
const SLOT_END = "2027-01-04T16:00:00.000Z";

run("DB integrity (real Postgres) — the constraints prove themselves", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: any, store: any, contractorId: string;

  beforeAll(async () => {
    const { getPrisma } = await import("@leadanswered/db");
    const { PrismaStore } = await import("./prismaStore.js");
    db = getPrisma();
    store = new PrismaStore();
    await resetLeads();
    const c = await db.contractor.upsert({
      where: { id: "itest-contractor" },
      update: {},
      create: {
        id: "itest-contractor",
        name: "Test",
        companyName: "Test Co",
        projectTypes: [],
        standingAvailability: { timezone: "UTC", slots: [] },
      },
    });
    contractorId = c.id;
  });

  async function resetLeads() {
    await db.appointment.deleteMany();
    await db.escalation.deleteMany();
    await db.message.deleteMany();
    await db.conversation.deleteMany();
    await db.lead.deleteMany();
  }
  async function makeLead(phone: string) {
    const ctx = await store.createLeadWithConversation({ contractorId, contactName: "L", contactPhone: phone });
    return ctx.lead.id as string;
  }
  const bk = (leadId: string, startIso: string, endIso: string) =>
    store.bookAppointment({ leadId, contractorId, startIso, endIso, timezone: "UTC" });

  it("KEYSTONE: two CONCURRENT bookings of the same slot → exactly ONE appointment", async () => {
    await resetLeads();
    const a = await makeLead("+1a");
    const b = await makeLead("+1b");
    // Race them on separate pooled connections — the Postgres EXCLUDE constraint must let only one win.
    const [r1, r2] = await Promise.all([bk(a, SLOT, SLOT_END), bk(b, SLOT, SLOT_END)]);
    expect([r1, r2].filter((r) => r.ok)).toHaveLength(1);
    expect([r1, r2].filter((r) => !r.ok && r.reason === "slot_taken")).toHaveLength(1);
    expect(await db.appointment.count({ where: { contractorId, status: "confirmed" } })).toBe(1);
  });

  it("rejects an OVERLAPPING slot; allows back-to-back", async () => {
    await resetLeads();
    const a = await makeLead("+1a");
    const b = await makeLead("+1b");
    const c = await makeLead("+1c");
    expect((await bk(a, SLOT, SLOT_END)).ok).toBe(true);
    expect(await bk(b, "2027-01-04T15:30:00.000Z", "2027-01-04T16:30:00.000Z")).toMatchObject({
      ok: false,
      reason: "slot_taken",
    });
    expect((await bk(c, SLOT_END, "2027-01-04T17:00:00.000Z")).ok).toBe(true); // adjacent
  });

  it("one active appointment per lead", async () => {
    await resetLeads();
    const a = await makeLead("+1a");
    expect((await bk(a, SLOT, SLOT_END)).ok).toBe(true);
    expect(await bk(a, "2027-01-05T15:00:00.000Z", "2027-01-05T16:00:00.000Z")).toMatchObject({
      ok: false,
      reason: "lead_has_active",
    });
  });

  afterAll(async () => {
    await db?.$disconnect?.();
  });
});
