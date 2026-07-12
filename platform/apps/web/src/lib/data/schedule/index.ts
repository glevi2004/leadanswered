import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { APEX_ROUTE_THURSDAY, APEX_SCHEDULE_ITEMS } from "../fixtures/apex";
import type { RoutePlan, ScheduleItem } from "./types";

/**
 * Schedule reads (07-schedule §4) behind the mock↔real seam. Real estimates
 * come straight from `Appointment` (+lead join); jobs and the RoutePlan are
 * fixture/preview until their backends ship.
 */

export function listItemsMock(): ScheduleItem[] {
  return APEX_SCHEDULE_ITEMS;
}

export function getRouteMock(date: string): RoutePlan | null {
  return APEX_ROUTE_THURSDAY.date === date ? APEX_ROUTE_THURSDAY : null;
}

export async function listItemsReal(organizationId: string): Promise<ScheduleItem[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Appointment")
    .select("id, startAt, endAt, status, syncState, leadId, lead:Lead(id, contactName, contactPhone, fullAddress, serviceTown)")
    .eq("organizationId", organizationId)
    .order("startAt", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, any>[]).map((a) => {
    const lead = Array.isArray(a.lead) ? a.lead[0] : a.lead;
    return {
      id: a.id,
      kind: "estimate" as const,
      contactId: lead?.id,
      contactName: lead?.contactName || lead?.contactPhone || "Estimate",
      startAt: a.startAt,
      endAt: a.endAt,
      status: a.status,
      address: lead?.fullAddress ?? undefined,
      town: lead?.serviceTown ?? undefined,
      bookedBy: "sarah" as const,
      syncState: a.syncState ?? undefined,
    };
  });
}
