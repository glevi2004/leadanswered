import { randomUUID } from "node:crypto";
import type { TimeRange } from "@leadanswered/core";
import { env } from "../../env.js";
import type { CalendarConnectionRecord, Store } from "../../store/types.js";
import { GoogleAuthError, GoogleCalendarClient, type StoredTokens } from "./client.js";
import { decryptToken, encryptToken } from "./crypto.js";

const WATCH_TTL_SEC = 7 * 24 * 3600; // Google's calendar watch channels last ~a week; renewed by the worker.

/**
 * Glue between the Store's `CalendarConnection` rows and the `GoogleCalendarClient` — builds a client
 * with decrypted tokens + a refresh-persist callback, and the fail-open free/busy read the provider
 * merges. Higher-level sync (push, inbound reconcile, watch) lives in the worker job.
 */

/** Build a client for a connection; persists refreshed access tokens back (encrypted). null if no refresh token. */
export function googleClientFor(store: Store, conn: CalendarConnectionRecord): GoogleCalendarClient | null {
  if (!conn.refreshToken) return null;
  const tokens: StoredTokens = {
    accessToken: conn.accessToken ? decryptToken(conn.accessToken) : "",
    refreshToken: decryptToken(conn.refreshToken),
    expiresAt: conn.tokenExpiresAt ? Date.parse(conn.tokenExpiresAt) : 0,
  };
  return new GoogleCalendarClient(tokens, async (t) => {
    await store.upsertCalendarConnection(conn.organizationId, conn.provider, {
      accessToken: encryptToken(t.accessToken),
      tokenExpiresAt: new Date(t.expiresAt).toISOString(),
    });
  });
}

/**
 * Google busy blocks for the range, merged into availability by the provider. FAIL-OPEN: any error
 * returns [] (DB-only availability) so Google never blocks the agent. An `invalid_grant` flips the
 * connection to `needs_reconnect` so the dashboard can prompt a reconnect.
 */
export async function googleBusy(
  store: Store,
  organizationId: string,
  range: { startIso: string; endIso: string },
): Promise<TimeRange[]> {
  const conn = await store.getCalendarConnection(organizationId, "google");
  if (!conn || conn.status !== "connected" || !conn.externalCalendarId) return [];
  const client = googleClientFor(store, conn);
  if (!client) return [];
  try {
    return await client.freeBusy(conn.externalCalendarId, range);
  } catch (e) {
    if (e instanceof GoogleAuthError) {
      await store.upsertCalendarConnection(organizationId, "google", { status: "needs_reconnect" }).catch(() => {});
    } else {
      console.error("[calendar] freeBusy failed (fail-open to DB availability):", e);
    }
    return [];
  }
}

/**
 * Register (or re-register) a Google push channel so calendar changes hit our webhook (§9). Best-effort:
 * with no public API URL we skip it and rely on polling. Stores the channel id/resource/token/expiry.
 */
export async function registerWatch(store: Store, organizationId: string): Promise<void> {
  if (!env.API_PUBLIC_URL) return; // no public webhook endpoint → polling-only
  const conn = await store.getCalendarConnection(organizationId, "google");
  if (!conn || conn.status !== "connected" || !conn.externalCalendarId) return;
  const client = googleClientFor(store, conn);
  if (!client) return;
  const channelId = randomUUID();
  const channelToken = randomUUID();
  const address = `${env.API_PUBLIC_URL.replace(/\/$/, "")}/google/notifications`;
  const { resourceId, expiration } = await client.watch(conn.externalCalendarId, {
    channelId,
    address,
    token: channelToken,
    ttlSec: WATCH_TTL_SEC,
  });
  await store.upsertCalendarConnection(organizationId, "google", {
    channelId,
    resourceId,
    channelToken,
    channelExpiresAt: expiration ? new Date(expiration).toISOString() : null,
  });
}
