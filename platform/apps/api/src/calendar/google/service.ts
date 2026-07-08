import type { TimeRange } from "@leadanswered/core";
import type { CalendarConnectionRecord, Store } from "../../store/types.js";
import { GoogleAuthError, GoogleCalendarClient, type StoredTokens } from "./client.js";
import { decryptToken, encryptToken } from "./crypto.js";

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
    await store.upsertCalendarConnection(conn.contractorId, conn.provider, {
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
  contractorId: string,
  range: { startIso: string; endIso: string },
): Promise<TimeRange[]> {
  const conn = await store.getCalendarConnection(contractorId, "google");
  if (!conn || conn.status !== "connected" || !conn.externalCalendarId) return [];
  const client = googleClientFor(store, conn);
  if (!client) return [];
  try {
    return await client.freeBusy(conn.externalCalendarId, range);
  } catch (e) {
    if (e instanceof GoogleAuthError) {
      await store.upsertCalendarConnection(contractorId, "google", { status: "needs_reconnect" }).catch(() => {});
    } else {
      console.error("[calendar] freeBusy failed (fail-open to DB availability):", e);
    }
    return [];
  }
}
