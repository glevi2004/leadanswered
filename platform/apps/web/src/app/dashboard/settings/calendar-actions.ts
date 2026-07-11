"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dashboard-auth";
import { signOrganizationHandoff } from "@/lib/calendar";

/** Disconnect the organization's Google Calendar (revokes + clears tokens via the api). */
export async function disconnectCalendarAction(): Promise<void> {
  const organization = await requireOrganization();
  const cid = signOrganizationHandoff(organization.id);
  const url = `${(process.env.API_PUBLIC_URL ?? "").replace(/\/$/, "")}/google/disconnect`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cid }),
  }).catch(() => {});
  revalidatePath("/dashboard/settings");
}
