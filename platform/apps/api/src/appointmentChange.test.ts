import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { env } from "./env.js";
import { MemoryStore } from "./store/memoryStore.js";
import { applyOwnerChange } from "./appointmentChange.js";
import { handleInbound } from "./conversationService.js";
import { __resetOwnerAgent } from "./agent/ownerAgent.js";
import { runInboundSync } from "./calendar/google/inbound.js";
import { encryptToken } from "./calendar/google/crypto.js";
import { testOrganization, testRecipients, TEST_ORGANIZATION_ID } from "./seed.js";
import { CapturingSms, scriptedModel } from "./testkit.js";

env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 5).toString("base64");
env.GOOGLE_CLIENT_ID = "cid";
env.GOOGLE_CLIENT_SECRET = "sec";

const OWNER = "+18335559999";
const LEAD = "+15557778888";
const TO = testOrganization.twilioNumber!;

function seed(): MemoryStore {
  const s = new MemoryStore();
  s.seedOrganization(testOrganization, testRecipients);
  return s;
}
async function bookLead(store: MemoryStore): Promise<{ leadId: string; apptId: string }> {
  const ctx = await store.createLeadWithConversation({ organizationId: TEST_ORGANIZATION_ID, contactName: "Levi Ramos", contactPhone: LEAD, projectHint: "roof leak" });
  const book = await store.bookAppointment({ leadId: ctx.lead.id, organizationId: TEST_ORGANIZATION_ID, startIso: "2026-07-06T13:00:00.000Z", endIso: "2026-07-06T14:00:00.000Z", timezone: "UTC" });
  return { leadId: ctx.lead.id, apptId: book.ok ? book.id : "" };
}

afterEach(() => vi.unstubAllGlobals());

describe("applyOwnerChange — one action, hard-gate notify", () => {
  beforeEach(() => __resetOwnerAgent());

  it("dashboard cancel: DB cancelled + organization ASKED; lead texted only after the owner's yes", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const { apptId } = await bookLead(store);

    const r = await applyOwnerChange({ store, sms }, apptId, { type: "cancel" }, { source: "dashboard", pushToGoogle: false });
    expect(r.ok).toBe(true);
    expect((await store.getAppointmentById(apptId))?.status).toBe("cancelled");
    // Organization was asked; the lead is NOT texted yet (hard gate).
    expect(sms.sent.some((s) => s.to === OWNER && /want me to let them know/i.test(s.body))).toBe(true);
    expect(sms.sent.some((s) => s.to === LEAD)).toBe(false);

    // Owner replies "yes" → the staged notice reaches the lead.
    await handleInbound({ store, model: scriptedModel([]), sms }, { toNumber: TO, fromNumber: OWNER, body: "yes" });
    expect(sms.sent.some((s) => s.to === LEAD && /cancel/i.test(s.body))).toBe(true);
  });

  it("google inbound: a cancel made in Google flows into the SAME handler (no push-back, hard gate)", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const { apptId } = await bookLead(store);
    await store.updateAppointmentSync(apptId, { externalProvider: "google", externalCalendarId: "primary", externalEventId: "gev1", externalEtag: "old", syncState: "synced" });
    await store.upsertCalendarConnection(TEST_ORGANIZATION_ID, "google", {
      status: "connected",
      externalCalendarId: "primary",
      accessToken: encryptToken("AT"),
      refreshToken: encryptToken("RT"),
      tokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    // Google's incremental sync returns OUR event as cancelled.
    vi.stubGlobal("fetch", vi.fn(async (url: any) =>
      String(url).includes("/events?")
        ? new Response(JSON.stringify({ items: [{ id: "gev1", etag: "new", status: "cancelled" }], nextSyncToken: "T2" }), { status: 200 })
        : new Response("{}", { status: 200 }),
    ));

    await runInboundSync({ store, sms }, TEST_ORGANIZATION_ID);

    expect((await store.getAppointmentById(apptId))?.status).toBe("cancelled");
    expect(sms.sent.some((s) => s.to === OWNER && /in your calendar/i.test(s.body))).toBe(true);
  });

  it("loop prevention: our own event echo (matching etag) is skipped", async () => {
    const store = seed();
    const sms = new CapturingSms();
    const { apptId } = await bookLead(store);
    await store.updateAppointmentSync(apptId, { externalEventId: "gev1", externalEtag: "same", syncState: "synced" });
    await store.upsertCalendarConnection(TEST_ORGANIZATION_ID, "google", {
      status: "connected", externalCalendarId: "primary", accessToken: encryptToken("AT"), refreshToken: encryptToken("RT"),
      tokenExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    vi.stubGlobal("fetch", vi.fn(async (url: any) =>
      String(url).includes("/events?")
        ? new Response(JSON.stringify({ items: [{ id: "gev1", etag: "same", status: "cancelled" }], nextSyncToken: "T2" }), { status: 200 })
        : new Response("{}", { status: 200 }),
    ));

    await runInboundSync({ store, sms }, TEST_ORGANIZATION_ID);

    // Same etag we last wrote → skipped: still confirmed, no organization ask.
    expect((await store.getAppointmentById(apptId))?.status).toBe("confirmed");
    expect(sms.sent.length).toBe(0);
  });
});
