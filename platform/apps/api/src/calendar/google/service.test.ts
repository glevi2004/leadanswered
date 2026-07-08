import { describe, it, expect, vi, afterEach } from "vitest";
import { env } from "../../env.js";
import { MemoryStore } from "../../store/memoryStore.js";
import { encryptToken } from "./crypto.js";
import { googleBusy } from "./service.js";

env.CALENDAR_TOKEN_KEY = Buffer.alloc(32, 9).toString("base64");
env.GOOGLE_CLIENT_ID = "cid";
env.GOOGLE_CLIENT_SECRET = "sec";

const CID = "c1";
const RANGE = { startIso: "2026-07-06T00:00:00Z", endIso: "2026-07-07T00:00:00Z" };

async function connect(s: MemoryStore, expiresInMs = 3_600_000): Promise<void> {
  await s.upsertCalendarConnection(CID, "google", {
    status: "connected",
    externalCalendarId: "primary",
    accessToken: encryptToken("AT"),
    refreshToken: encryptToken("RT"),
    tokenExpiresAt: new Date(Date.now() + expiresInMs).toISOString(),
  });
}

const resp = (body: unknown, status = 200) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe("googleBusy (availability merge, fail-open)", () => {
  it("returns Google busy blocks for a connected calendar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp({ calendars: { primary: { busy: [{ start: "2026-07-06T14:00:00Z", end: "2026-07-06T15:00:00Z" }] } } })));
    const s = new MemoryStore();
    await connect(s);
    const busy = await googleBusy(s, CID, RANGE);
    expect(busy).toHaveLength(1);
    expect(busy[0].startAt.toISOString()).toBe("2026-07-06T14:00:00.000Z");
  });

  it("returns [] when the contractor has no connection", async () => {
    expect(await googleBusy(new MemoryStore(), CID, RANGE)).toEqual([]);
  });

  it("fails open to [] when Google errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp("boom", 500)));
    const s = new MemoryStore();
    await connect(s);
    expect(await googleBusy(s, CID, RANGE)).toEqual([]);
  });

  it("flips to needs_reconnect on invalid_grant, still returns []", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => resp('{"error":"invalid_grant"}', 400)));
    const s = new MemoryStore();
    await connect(s, -1000); // expired access token → forces a refresh → invalid_grant
    expect(await googleBusy(s, CID, RANGE)).toEqual([]);
    expect((await s.getCalendarConnection(CID, "google"))?.status).toBe("needs_reconnect");
  });
});
