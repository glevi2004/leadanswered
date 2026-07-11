import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER-ONLY (bypasses RLS). Used for admin ops
 * like inviting a organization's owner by email. Never import from a client component.
 */
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
