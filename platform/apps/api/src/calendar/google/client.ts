import type { TimeRange } from "@leadanswered/core";
import { env } from "../../env.js";

/**
 * Thin Google Calendar REST client (GOOGLE_CALENDAR.md §5B/§7/§9). Plain `fetch` (injectable for tests)
 * — no googleapis dependency. Handles: OAuth code exchange, on-demand token refresh, freebusy, event
 * create/patch/delete, incremental events.list, and push-channel watch/stop. `invalid_grant` on refresh
 * throws `GoogleAuthError` so callers can flip the connection to `needs_reconnect` and fail open to DB.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";

export class GoogleAuthError extends Error {}
export class GoogleSyncGone extends Error {} // 410 → syncToken expired, full resync needed

export interface StoredTokens {
  accessToken: string; // decrypted
  refreshToken: string; // decrypted
  expiresAt: number; // epoch ms
}

export interface RemoteEvent {
  id: string;
  etag: string;
  status?: string; // "confirmed" | "cancelled"
  startIso?: string;
  endIso?: string;
}

export interface EventInput {
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
  timeZone: string;
}

type Fetch = typeof fetch;

/** Decode a JWT payload without verifying (id_token comes straight from Google over TLS; display only). */
function jwtEmail(idToken?: string): string | undefined {
  if (!idToken) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1] ?? "", "base64").toString("utf8"));
    return typeof payload.email === "string" ? payload.email : undefined;
  } catch {
    return undefined;
  }
}

export class GoogleCalendarClient {
  constructor(
    private tokens: StoredTokens,
    private onRefresh?: (t: { accessToken: string; expiresAt: number }) => Promise<void>,
    private fetchImpl: Fetch = fetch,
  ) {}

  // ---- OAuth (static) ----
  static async exchangeCode(
    code: string,
    redirectUri: string,
    fetchImpl: Fetch = fetch,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: number; scope: string; email?: string }> {
    const res = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      }),
    });
    if (!res.ok) throw new GoogleAuthError(`token exchange failed: ${res.status} ${await res.text()}`);
    const j: any = await res.json();
    if (!j.refresh_token) throw new GoogleAuthError("no refresh_token returned (need access_type=offline + prompt=consent)");
    return {
      accessToken: j.access_token,
      refreshToken: j.refresh_token,
      expiresAt: Date.now() + (j.expires_in ?? 3600) * 1000,
      scope: j.scope ?? "",
      email: jwtEmail(j.id_token),
    };
  }

  static async revoke(token: string, fetchImpl: Fetch = fetch): Promise<void> {
    await fetchImpl(REVOKE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    }).catch(() => {}); // best-effort
  }

  // ---- token refresh ----
  private async accessToken(): Promise<string> {
    if (Date.now() < this.tokens.expiresAt - 60_000) return this.tokens.accessToken;
    const res = await this.fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.tokens.refreshToken,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (body.includes("invalid_grant")) throw new GoogleAuthError("refresh token revoked/expired");
      throw new Error(`token refresh failed: ${res.status} ${body}`);
    }
    const j: any = await res.json();
    this.tokens.accessToken = j.access_token;
    this.tokens.expiresAt = Date.now() + (j.expires_in ?? 3600) * 1000;
    await this.onRefresh?.({ accessToken: this.tokens.accessToken, expiresAt: this.tokens.expiresAt });
    return this.tokens.accessToken;
  }

  private async api(method: string, path: string, body?: unknown): Promise<Response> {
    const token = await this.accessToken();
    return this.fetchImpl(`${CAL_BASE}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  // ---- free/busy (§7.1) ----
  async freeBusy(calendarId: string, range: { startIso: string; endIso: string }): Promise<TimeRange[]> {
    const res = await this.api("POST", "/freeBusy", {
      timeMin: range.startIso,
      timeMax: range.endIso,
      items: [{ id: calendarId }],
    });
    if (!res.ok) throw new Error(`freeBusy failed: ${res.status}`);
    const j: any = await res.json();
    const busy: Array<{ start: string; end: string }> = j.calendars?.[calendarId]?.busy ?? [];
    return busy.map((b) => ({ startAt: new Date(b.start), endAt: new Date(b.end) }));
  }

  // ---- events (§10 push) ----
  async insertEvent(calendarId: string, e: EventInput): Promise<RemoteEvent> {
    const res = await this.api("POST", `/calendars/${encodeURIComponent(calendarId)}/events`, {
      summary: e.summary,
      description: e.description,
      location: e.location,
      start: { dateTime: e.startIso, timeZone: e.timeZone },
      end: { dateTime: e.endIso, timeZone: e.timeZone },
    });
    if (!res.ok) throw new Error(`event insert failed: ${res.status}`);
    return toRemoteEvent(await res.json());
  }

  async patchEvent(calendarId: string, eventId: string, e: Partial<EventInput>): Promise<RemoteEvent> {
    const body: any = {};
    if (e.startIso) body.start = { dateTime: e.startIso, timeZone: e.timeZone };
    if (e.endIso) body.end = { dateTime: e.endIso, timeZone: e.timeZone };
    if (e.summary) body.summary = e.summary;
    const res = await this.api("PATCH", `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, body);
    if (!res.ok) throw new Error(`event patch failed: ${res.status}`);
    return toRemoteEvent(await res.json());
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const res = await this.api("DELETE", `/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`);
    // 410 = already gone; treat as success (idempotent delete).
    if (!res.ok && res.status !== 410 && res.status !== 404) throw new Error(`event delete failed: ${res.status}`);
  }

  // ---- incremental sync (§9) ----
  async listChanged(
    calendarId: string,
    opts: { syncToken?: string; timeMin?: string; timeMax?: string },
  ): Promise<{ events: RemoteEvent[]; nextSyncToken: string | null }> {
    const qs = new URLSearchParams({ showDeleted: "true", singleEvents: "true" });
    if (opts.syncToken) qs.set("syncToken", opts.syncToken);
    else {
      if (opts.timeMin) qs.set("timeMin", opts.timeMin);
      if (opts.timeMax) qs.set("timeMax", opts.timeMax);
    }
    const res = await this.api("GET", `/calendars/${encodeURIComponent(calendarId)}/events?${qs}`);
    if (res.status === 410) throw new GoogleSyncGone("syncToken expired");
    if (!res.ok) throw new Error(`events.list failed: ${res.status}`);
    const j: any = await res.json();
    return {
      events: (j.items ?? []).map(toRemoteEvent),
      nextSyncToken: j.nextSyncToken ?? null,
    };
  }

  // ---- push channels (§9) ----
  async watch(
    calendarId: string,
    ch: { channelId: string; address: string; token: string; ttlSec?: number },
  ): Promise<{ resourceId: string; expiration: number }> {
    const res = await this.api("POST", `/calendars/${encodeURIComponent(calendarId)}/events/watch`, {
      id: ch.channelId,
      type: "web_hook",
      address: ch.address,
      token: ch.token,
      params: ch.ttlSec ? { ttl: String(ch.ttlSec) } : undefined,
    });
    if (!res.ok) throw new Error(`watch failed: ${res.status}`);
    const j: any = await res.json();
    return { resourceId: j.resourceId, expiration: Number(j.expiration ?? 0) };
  }

  async stopChannel(channelId: string, resourceId: string): Promise<void> {
    await this.fetchImpl(`${CAL_BASE}/channels/stop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${await this.accessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: channelId, resourceId }),
    }).catch(() => {}); // best-effort
  }
}

function toRemoteEvent(j: any): RemoteEvent {
  return {
    id: j.id,
    etag: j.etag,
    status: j.status,
    startIso: j.start?.dateTime ?? (j.start?.date ? `${j.start.date}T00:00:00Z` : undefined),
    endIso: j.end?.dateTime ?? (j.end?.date ? `${j.end.date}T00:00:00Z` : undefined),
  };
}
