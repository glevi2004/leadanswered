"use server";

import { revalidatePath } from "next/cache";
import { requireContractor } from "@/lib/dashboard-auth";
import { signContractorHandoff } from "@/lib/calendar";

/** Disconnect the contractor's Google Calendar (revokes + clears tokens via the api). */
export async function disconnectCalendarAction(): Promise<void> {
  const contractor = await requireContractor();
  const cid = signContractorHandoff(contractor.id);
  const url = `${(process.env.API_PUBLIC_URL ?? "").replace(/\/$/, "")}/google/disconnect`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cid }),
  }).catch(() => {});
  revalidatePath("/dashboard/settings");
}
