"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { createSiteMock, deleteSiteMock, siteStoreKey } from "@/lib/data/website";
import type { SitePresetId } from "@/lib/data/website/types";

/**
 * Create a site from a preset (mock seam). Returns the new siteId so the picker
 * can navigate straight into its builder. No real hosting is provisioned.
 */
export async function createSiteAction(preset: SitePresetId): Promise<{ siteId: string }> {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const orgId = siteStoreKey(organization, demo);
  const site = createSiteMock(orgId, preset);
  revalidatePath("/sites");
  return { siteId: site.id };
}

/** Remove a site from the org's store (mock seam). */
export async function deleteSiteAction(siteId: string): Promise<{ ok: boolean }> {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const orgId = siteStoreKey(organization, demo);
  const ok = deleteSiteMock(orgId, siteId);
  revalidatePath("/sites");
  return { ok };
}
