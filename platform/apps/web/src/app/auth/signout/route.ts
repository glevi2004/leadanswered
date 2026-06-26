import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Clears the Supabase session and returns to sign-in. */
export async function GET(request: Request) {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/sign-in`);
}
