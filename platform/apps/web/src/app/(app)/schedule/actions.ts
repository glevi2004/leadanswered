"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dashboard-auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { signOrganizationHandoff } from "@/lib/calendar";

/**
 * Dashboard-initiated cancel — the dashboard TRIGGER of the unified appointment-change action. Calls the
 * api, which updates the DB, mirrors to Google (if connected), and asks the organization before texting
 * the customer (the hard gate). GOOGLE_CALENDAR.md §2.
 */
export async function cancelAppointmentAction(appointmentId: string): Promise<{ ok: boolean }> {
  const organization = await requireOrganization();
  const cid = signOrganizationHandoff(organization.id);
  const url = `${(process.env.API_PUBLIC_URL ?? "").replace(/\/$/, "")}/appointments/change`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cid, appointmentId, action: "cancel" }),
  }).catch(() => null);
  revalidatePath("/schedule");
  return { ok: !!(res && res.ok) };
}

/** Dashboard-initiated reschedule — same unified endpoint, new start time. */
export async function rescheduleAppointmentAction(
  appointmentId: string,
  newStartIso: string,
): Promise<{ ok: boolean }> {
  const organization = await requireOrganization();
  const cid = signOrganizationHandoff(organization.id);
  const url = `${(process.env.API_PUBLIC_URL ?? "").replace(/\/$/, "")}/appointments/change`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cid, appointmentId, action: "reschedule", newStartIso }),
  }).catch(() => null);
  revalidatePath("/schedule");
  return { ok: !!(res && res.ok) };
}

/**
 * Mark how a past visit went (07-schedule §5) — REAL, direct status write (shown | no_show),
 * tenant-guarded. No customer texting involved, so no api/hard-gate round trip needed.
 */
export async function markAppointmentOutcomeAction(
  appointmentId: string,
  outcome: "shown" | "no_show",
): Promise<{ ok: boolean }> {
  const organization = await requireOrganization();
  const sb = createSupabaseAdmin();
  const { error } = await sb
    .from("Appointment")
    .update({ status: outcome, updatedAt: new Date().toISOString() })
    .eq("id", appointmentId)
    .eq("organizationId", organization.id); // tenant guard
  revalidatePath("/schedule");
  return { ok: !error };
}
