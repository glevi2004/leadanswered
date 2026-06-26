"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Catches Supabase implicit-flow auth links that land with tokens in the URL hash
 * (#access_token=…&type=recovery|invite|…). The default email templates use this
 * style, and the server can't read the hash — so we set the session client-side and
 * route by link type. Mounted in the root layout so it runs wherever the link lands.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.includes("access_token")) {
      if (hash.includes("error")) {
        const p = new URLSearchParams(hash.slice(1));
        const msg = (p.get("error_description") ?? p.get("error") ?? "").replace(/\+/g, " ");
        history.replaceState(null, "", window.location.pathname);
        if (msg) router.replace(`/sign-in?error=${encodeURIComponent(msg)}`);
      }
      return;
    }

    const p = new URLSearchParams(hash.slice(1));
    const access_token = p.get("access_token");
    const refresh_token = p.get("refresh_token");
    const type = p.get("type");
    history.replaceState(null, "", window.location.pathname);
    if (!access_token || !refresh_token) return;

    const supabase = createSupabaseBrowser();
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
      if (error) {
        router.replace(`/sign-in?error=${encodeURIComponent(error.message)}`);
        return;
      }
      const dest = type === "recovery" ? "/reset-password" : type === "invite" ? "/set-password" : "/";
      router.replace(dest);
    });
  }, [router]);

  return null;
}
