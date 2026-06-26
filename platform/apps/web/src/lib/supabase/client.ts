import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for Client Components (browser). We consume URL hash tokens
 *  ourselves (AuthHashHandler) so we can route by link type, so disable the SDK's
 *  auto-detection to avoid it racing us and clearing the hash first. */
export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { detectSessionInUrl: false } },
  );
}
