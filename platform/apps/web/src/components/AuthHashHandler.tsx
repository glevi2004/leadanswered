"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";

/**
 * Catches Supabase auth email links that land on /auth/land. Supports BOTH flows the
 * SDK/templates produce:
 *  - PKCE (current default): a `?code=…` query param → exchangeCodeForSession.
 *  - Implicit (older templates): `#access_token=…&type=…` in the hash → setSession.
 * The server can't read either before a session exists, so we resolve it client-side
 * and route by link type (`?type=`/hash `type`): recovery → reset, invite → set-password.
 * Mounted in the root layout so it runs wherever the link lands.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const routeByType = (type: string | null) =>
      type === "recovery" ? "/reset-password" : type === "invite" ? "/set-password" : "/reset-password";

    // --- PKCE flow: ?code=… ---
    const search = new URLSearchParams(window.location.search);
    const code = search.get("code");
    const errDesc = search.get("error_description") ?? search.get("error");
    if (code || (errDesc && window.location.pathname.startsWith("/auth"))) {
      const type = search.get("type");
      history.replaceState(null, "", window.location.pathname);
      if (!code) {
        router.replace(`/sign-in?error=${encodeURIComponent((errDesc ?? "").replace(/\+/g, " "))}`);
        return;
      }
      const supabase = createSupabaseBrowser();
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) router.replace(`/sign-in?error=${encodeURIComponent(error.message)}`);
        else router.replace(routeByType(type));
      });
      return;
    }

    // --- Implicit flow: #access_token=…&type=… ---
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
