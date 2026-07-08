import { describe, it, expect } from "vitest";
import { env } from "../../env.js";
import { GoogleCalendarClient, GoogleAuthError, GoogleSyncGone, type StoredTokens } from "./client.js";

env.GOOGLE_CLIENT_ID = "cid";
env.GOOGLE_CLIENT_SECRET = "secret";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const text = (body: string, status: number) => new Response(body, { status });

/** A fetch stub: hand it a handler that inspects (url, init) and returns a Response. */
function stub(handler: (url: string, init?: RequestInit) => Response): typeof fetch {
  return (async (input: any, init?: RequestInit) => handler(String(input), init)) as unknown as typeof fetch;
}

const idToken = "h." + Buffer.from(JSON.stringify({ email: "owner@apex.com" })).toString("base64") + ".s";
const freshTokens = (): StoredTokens => ({ accessToken: "at", refreshToken: "rt", expiresAt: Date.now() + 3_600_000 });

describe("GoogleCalendarClient", () => {
  it("exchangeCode returns tokens + email from the id_token", async () => {
    const f = stub((url) => {
      expect(url).toContain("oauth2.googleapis.com/token");
      return json({ access_token: "AT", refresh_token: "RT", expires_in: 3600, scope: "cal", id_token: idToken });
    });
    const t = await GoogleCalendarClient.exchangeCode("code", "https://x/callback", f);
    expect(t.accessToken).toBe("AT");
    expect(t.refreshToken).toBe("RT");
    expect(t.email).toBe("owner@apex.com");
  });

  it("exchangeCode throws if Google returns no refresh_token", async () => {
    const f = stub(() => json({ access_token: "AT", expires_in: 3600 }));
    await expect(GoogleCalendarClient.exchangeCode("c", "r", f)).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("freeBusy parses busy blocks into TimeRange (Dates)", async () => {
    const f = stub(() => json({ calendars: { primary: { busy: [{ start: "2026-07-06T14:00:00Z", end: "2026-07-06T15:00:00Z" }] } } }));
    const busy = await new GoogleCalendarClient(freshTokens(), undefined, f).freeBusy("primary", { startIso: "a", endIso: "b" });
    expect(busy).toHaveLength(1);
    expect(busy[0].startAt.toISOString()).toBe("2026-07-06T14:00:00.000Z");
  });

  it("refreshes an expired access token and persists it via onRefresh", async () => {
    let refreshed = "";
    const f = stub((url) => {
      if (url.includes("/token")) return json({ access_token: "NEW", expires_in: 3600 });
      return json({ calendars: { primary: { busy: [] } } });
    });
    const tokens: StoredTokens = { accessToken: "old", refreshToken: "rt", expiresAt: Date.now() - 1000 }; // expired
    const client = new GoogleCalendarClient(tokens, async (t) => { refreshed = t.accessToken; }, f);
    await client.freeBusy("primary", { startIso: "a", endIso: "b" });
    expect(refreshed).toBe("NEW");
    expect(tokens.accessToken).toBe("NEW");
  });

  it("maps invalid_grant on refresh to GoogleAuthError", async () => {
    const f = stub(() => text('{"error":"invalid_grant"}', 400));
    const tokens: StoredTokens = { accessToken: "old", refreshToken: "rt", expiresAt: Date.now() - 1000 };
    await expect(new GoogleCalendarClient(tokens, undefined, f).freeBusy("primary", { startIso: "a", endIso: "b" })).rejects.toBeInstanceOf(GoogleAuthError);
  });

  it("insertEvent returns id + etag", async () => {
    const f = stub(() => json({ id: "ev1", etag: '"abc"', status: "confirmed", start: { dateTime: "2026-07-06T12:00:00Z" }, end: { dateTime: "2026-07-06T13:00:00Z" } }));
    const ev = await new GoogleCalendarClient(freshTokens(), undefined, f).insertEvent("primary", {
      summary: "Estimate — Levi", startIso: "2026-07-06T12:00:00Z", endIso: "2026-07-06T13:00:00Z", timeZone: "America/New_York",
    });
    expect(ev.id).toBe("ev1");
    expect(ev.etag).toBe('"abc"');
  });

  it("listChanged returns events + nextSyncToken; 410 throws GoogleSyncGone", async () => {
    const ok = stub(() => json({ items: [{ id: "ev1", etag: "e", status: "cancelled" }], nextSyncToken: "TOK2" }));
    const r = await new GoogleCalendarClient(freshTokens(), undefined, ok).listChanged("primary", { syncToken: "TOK1" });
    expect(r.events[0].status).toBe("cancelled");
    expect(r.nextSyncToken).toBe("TOK2");

    const gone = stub(() => text("gone", 410));
    await expect(new GoogleCalendarClient(freshTokens(), undefined, gone).listChanged("primary", { syncToken: "old" })).rejects.toBeInstanceOf(GoogleSyncGone);
  });
});
