"use server";

import { revalidatePath } from "next/cache";
import { requireContractor } from "@/lib/dashboard-auth";
import { signContractorHandoff } from "@/lib/calendar";

/**
 * Dashboard-initiated cancel — the dashboard TRIGGER of the unified appointment-change action. Calls the
 * api, which updates the DB, mirrors to Google (if connected), and asks the contractor before texting
 * the customer (the hard gate). GOOGLE_CALENDAR.md §2.
 */
export async function cancelAppointmentAction(appointmentId: string): Promise<{ ok: boolean }> {
  const contractor = await requireContractor();
  const cid = signContractorHandoff(contractor.id);
  const url = `${(process.env.API_PUBLIC_URL ?? "").replace(/\/$/, "")}/appointments/change`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cid, appointmentId, action: "cancel" }),
  }).catch(() => null);
  revalidatePath("/dashboard/appointments");
  return { ok: !!(res && res.ok) };
}
