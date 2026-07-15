"use server";

import { revalidatePath } from "next/cache";
import { requireOrganization } from "@/lib/dashboard-auth";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { LEAD_STAGES, type PipelineStage } from "@/lib/data/crm/types";

/**
 * Stage change (05-crm §5): REAL for lead-side stages (writes Lead.status,
 * tenant-guarded); customer-side stages are mock until the customer entity
 * ships (the client toasts without calling this).
 */
export async function updateLeadStageAction(leadId: string, stage: PipelineStage): Promise<void> {
  const organization = await requireOrganization();
  if (!LEAD_STAGES.includes(stage)) return; // customer-side: nothing to write yet

  const sb = createSupabaseAdmin();
  const { error } = await sb
    .from("Lead")
    .update({ status: stage, updatedAt: new Date().toISOString() })
    .eq("id", leadId)
    .eq("organizationId", organization.id); // tenant guard
  if (error) throw error;

  revalidatePath("/customers");
  revalidatePath(`/customers/${leadId}`);
}
