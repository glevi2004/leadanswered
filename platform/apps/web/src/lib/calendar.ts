import { createHmac } from "node:crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Web ↔ api handoff for the Google Calendar connect flow (GOOGLE_CALENDAR.md §5B). The web (authenticated)
 * mints a short-lived HMAC-signed token binding the contractorId and links to the api's /google/connect;
 * the api owns the OAuth client_secret + tokens. Same format the api's `verifyState` expects.
 */
const API_URL = process.env.API_PUBLIC_URL ?? "";
const SECRET = process.env.CALENDAR_STATE_SECRET ?? "";

export function signContractorHandoff(contractorId: string, ttlSec = 600): string {
  const body = { contractorId, exp: Date.now() + ttlSec * 1000 };
  const json = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = createHmac("sha256", SECRET).update(json).digest("base64url");
  return `${json}.${sig}`;
}

/** The link the "Connect Google Calendar" button points at (api-owned OAuth initiation). */
export function googleConnectUrl(contractorId: string): string {
  return `${API_URL.replace(/\/$/, "")}/google/connect?cid=${encodeURIComponent(signContractorHandoff(contractorId))}`;
}

export const calendarConfigured = (): boolean => API_URL.length > 0 && SECRET.length > 0;

export interface CalendarConnStatus {
  status: string; // disconnected | connected | needs_reconnect
  email: string | null;
}

/** Read the contractor's Google connection status (direct Supabase, like the rest of the dashboard). */
export async function getCalendarConnection(contractorId: string): Promise<CalendarConnStatus | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("CalendarConnection")
    .select("status, email")
    .eq("contractorId", contractorId)
    .eq("provider", "google")
    .maybeSingle();
  return data ? { status: data.status as string, email: (data.email as string | null) ?? null } : null;
}
