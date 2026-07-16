import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Waitlist read/write helpers (server-only) via supabase-js with the service-role key —
 * the public join is unauthed and admin reads bypass RLS by design. Accessed via
 * `.from("Waitlist")` (NOT Prisma) so tsc doesn't depend on a regenerated client.
 * NOTE: Prisma's id/createdAt/updatedAt are app-side defaults, so inserts supply them.
 */

export type WaitlistStatus = "pending" | "accepted" | "declined";

export interface WaitlistRow {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  note: string | null;
  status: WaitlistStatus;
  createdAt: string;
}

export async function listWaitlist(status: WaitlistStatus = "pending"): Promise<WaitlistRow[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Waitlist")
    .select("id, email, name, company, note, status, createdAt")
    .eq("status", status)
    .order("createdAt", { ascending: true });
  if (error) throw error;
  return (data ?? []) as WaitlistRow[];
}
