"use server";

import { createSupabaseAdmin } from "@/lib/supabase/admin";

export type JoinState = { error?: string; ok?: boolean };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Public, unauthed waitlist join. Upserts a Waitlist row (status pending) keyed on email via
 * the service-role client — re-submitting refreshes the entry rather than erroring. Admin then
 * accepts/declines from the dashboard. Access via `.from("Waitlist")` (NOT Prisma).
 */
export async function joinWaitlistAction(_prev: JoinState, formData: FormData): Promise<JoinState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const company = String(formData.get("company") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };

  const sb = createSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb.from("Waitlist").upsert(
    {
      id: crypto.randomUUID(),
      email,
      name: name || null,
      company: company || null,
      note: note || null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    },
    { onConflict: "email" },
  );
  if (error) return { error: "Something went wrong. Please try again." };
  return { ok: true };
}
