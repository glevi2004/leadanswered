import type { Request, Response } from "express";
import { env } from "../../env.js";
import type { Store } from "../../store/types.js";
import { GoogleCalendarClient } from "./client.js";
import { decryptToken, encryptToken } from "./crypto.js";
import { googleClientFor, registerWatch } from "./service.js";
import { signState, verifyState } from "./state.js";

/**
 * Google Calendar OAuth endpoints (GOOGLE_CALENDAR.md §5B) — the CALENDAR grant (separate from the
 * Supabase Google LOGIN, §5A). The web dashboard (authenticated) mints a short-lived `cid` handoff token
 * (signed with the shared CALENDAR_STATE_SECRET) and links here; the api owns client_secret + tokens.
 */

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "openid",
  "email",
].join(" ");

/** GET /google/connect?cid=<signed organization handoff> → 302 to Google's consent screen. */
export function createGoogleConnectRoute() {
  return (req: Request, res: Response): void => {
    const handoff = verifyState<{ organizationId: string }>(String(req.query.cid ?? ""));
    if (!handoff?.organizationId) {
      res.status(400).send("Invalid or expired connect link.");
      return;
    }
    const state = signState({ organizationId: handoff.organizationId });
    const url = new URL(AUTH_URL);
    url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
    url.searchParams.set("redirect_uri", env.GOOGLE_OAUTH_REDIRECT_URI);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent"); // force a refresh token even on re-consent
    url.searchParams.set("include_granted_scopes", "true");
    url.searchParams.set("state", state);
    res.redirect(url.toString());
  };
}

/** GET /google/callback?code&state → exchange, store (encrypted), watch, back to the dashboard. */
export function createGoogleCallbackRoute(store: Store) {
  return async (req: Request, res: Response): Promise<void> => {
    const back = (status: string) => res.redirect(`${env.APP_BASE_URL}/dashboard/settings?calendar=${status}`);
    const code = String(req.query.code ?? "");
    const payload = verifyState<{ organizationId: string }>(String(req.query.state ?? ""));
    if (!payload?.organizationId || !code) {
      back("error");
      return;
    }
    try {
      const t = await GoogleCalendarClient.exchangeCode(code, env.GOOGLE_OAUTH_REDIRECT_URI);
      await store.upsertCalendarConnection(payload.organizationId, "google", {
        status: "connected",
        externalCalendarId: "primary",
        accessToken: encryptToken(t.accessToken),
        refreshToken: encryptToken(t.refreshToken),
        tokenExpiresAt: new Date(t.expiresAt).toISOString(),
        scope: t.scope,
        email: t.email ?? null,
      });
      // Best-effort inbound push channel; failure just means we rely on polling. Never blocks connect.
      await registerWatch(store, payload.organizationId).catch((e) => console.error("[calendar] watch register failed:", e));
      back("connected");
    } catch (e) {
      console.error("[calendar] oauth callback failed:", e);
      back("error");
    }
  };
}

/** POST /google/disconnect { cid } → stop the channel, revoke at Google, clear tokens. */
export function createGoogleDisconnectRoute(store: Store) {
  return async (req: Request, res: Response): Promise<void> => {
    const handoff = verifyState<{ organizationId: string }>(String(req.body?.cid ?? req.query.cid ?? ""));
    if (!handoff?.organizationId) {
      res.status(400).json({ ok: false, error: "invalid_token" });
      return;
    }
    const conn = await store.getCalendarConnection(handoff.organizationId, "google");
    if (conn) {
      const client = conn.refreshToken ? googleClientFor(store, conn) : null;
      if (client && conn.channelId && conn.resourceId) {
        await client.stopChannel(conn.channelId, conn.resourceId).catch(() => {});
      }
      if (conn.refreshToken) await GoogleCalendarClient.revoke(decryptToken(conn.refreshToken)).catch(() => {});
    }
    await store.upsertCalendarConnection(handoff.organizationId, "google", {
      status: "disconnected",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      syncToken: null,
      channelId: null,
      resourceId: null,
      channelToken: null,
      channelExpiresAt: null,
    });
    res.json({ ok: true });
  };
}
