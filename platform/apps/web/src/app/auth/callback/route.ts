import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";

// Only these post-auth destinations are allowed (prevents open redirects).
const ALLOWED_NEXT = new Set(["/set-password", "/reset-password", "/onboarding", "/status", "/admin", "/"]);

/**
 * Exchanges an invite / recovery / sign-in link for a session, then routes on.
 * Handles both link styles: PKCE `?code=` and OTP `?token_hash=&type=`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const error = searchParams.get("error_description") ?? searchParams.get("error");
  const nextParam = searchParams.get("next") ?? "/";
  const next = ALLOWED_NEXT.has(nextParam) ? nextParam : "/";

  const fail = (msg: string) =>
    NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent(msg)}`);

  if (error) return fail(error);

  const supabase = await createSupabaseServer();
  let authError: { message: string } | null = null;

  if (code) {
    ({ error: authError } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type) {
    ({ error: authError } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else {
    return fail("That link is invalid or has expired.");
  }

  if (authError) return fail(authError.message);
  return NextResponse.redirect(`${origin}${next}`);
}
