"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dashboard-auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { AvailabilityWindow } from "@/lib/onboarding-state";

/**
 * Save standing availability (07-schedule §5) — the same
 * Organization.standingAvailability JSON the onboarding wizard writes.
 */
export async function saveAvailabilityAction(
  timezone: string,
  windows: AvailabilityWindow[],
): Promise<{ ok: boolean }> {
  const organization = await requireOrganization();
  if (!windows.length) return { ok: false };
  const sb = createSupabaseAdmin();
  const { error } = await sb
    .from("Organization")
    .update({ standingAvailability: { timezone, windows }, updatedAt: new Date().toISOString() })
    .eq("id", organization.id);
  if (error) throw error;
  revalidatePath("/schedule");
  return { ok: true };
}
