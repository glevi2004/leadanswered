import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../env.js";

/**
 * HMAC-signed, short-lived tokens (GOOGLE_CALENDAR.md §13) — used for the OAuth `state` (CSRF + binds
 * the callback to the initiating organization) and the web→api "connect this organization" handoff. Format:
 * base64url(payloadJson).base64url(hmac). The web app shares `CALENDAR_STATE_SECRET` to mint handoffs.
 */
function secret(): string {
  if (!env.CALENDAR_STATE_SECRET) throw new Error("CALENDAR_STATE_SECRET is not set");
  return env.CALENDAR_STATE_SECRET;
}

export function signState(payload: Record<string, unknown>, ttlSec = 600): string {
  const body = { ...payload, exp: Date.now() + ttlSec * 1000 };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(json).digest("base64url");
  return `${json}.${sig}`;
}

export function verifyState<T = Record<string, unknown>>(token: string): T | null {
  const [json, sig] = (token ?? "").split(".");
  if (!json || !sig) return null;
  const expected = createHmac("sha256", secret()).update(json).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const body = JSON.parse(Buffer.from(json, "base64url").toString("utf8"));
    if (typeof body.exp === "number" && Date.now() > body.exp) return null;
    return body as T;
  } catch {
    return null;
  }
}
