"use server";

import { revalidatePath } from "next/cache";
import {
  createOrganizationShell,
  updateOrganizationAdmin,
  setOrganizationConfig,
  getOrganizationById,
} from "@/lib/organizations";
import { organizationConfigSchema } from "@/lib/config";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { currentUser, isAdminEmail } from "@/lib/auth";

async function requireAdmin() {
  const user = await currentUser();
  if (!isAdminEmail(user?.email)) throw new Error("forbidden");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ActionState = { error?: string; ok?: string };

// Land on a client page so AuthHashHandler can consume the auth link (PKCE ?code= or
// implicit hash tokens) and route by type — a server route can't read the hash fragment.
const INVITE_REDIRECT = (site: string) => `${site}/auth/land?type=invite`;
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3002";

/** Supabase signals an existing user a couple of ways — treat it as "fine, they can sign in". */
function isAlreadyRegistered(e: { code?: string; message: string }): boolean {
  return e.code === "email_exists" || /already (been )?registered|already exists/i.test(e.message);
}

export async function createOrganizationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin();
    const companyName = String(formData.get("companyName") ?? "").trim();
    const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
    const twilioNumber = String(formData.get("twilioNumber") ?? "").trim();
    const slug = (String(formData.get("slug") ?? "").trim() || slugify(companyName)).toLowerCase();
    if (!companyName || !ownerEmail || !twilioNumber || !slug) {
      return { error: "Company, owner email, number, and slug are all required." };
    }

    // Create only — NO invite. Onboarding is admin-led and precedes the invite: the invite goes
    // out when the admin finishes the onboarding wizard (saveOnboardingAdminAction).
    await createOrganizationShell({ companyName, slug, twilioNumber, ownerEmail });

    revalidatePath("/admin");
    return { ok: `Created ${companyName}. Onboard them next — the invite goes out when you finish.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Save organization fields. Editing NEVER emails — inviting is a separate, explicit action
 * (resendInviteAction). This fixes the old "Save & invite" that re-invited on every edit.
 */
export async function saveOrganizationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const companyName = String(formData.get("companyName") ?? "").trim() || undefined;
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = rawSlug ? slugify(rawSlug) : undefined;
  const twilioNumber = String(formData.get("twilioNumber") ?? "").trim() || undefined;
  const verificationStatus = (String(formData.get("verificationStatus") ?? "") || undefined) as
    | "pending"
    | "verified"
    | "failed"
    | undefined;
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase() || undefined;

  await updateOrganizationAdmin(id, { companyName, slug, twilioNumber, verificationStatus, ownerEmail });
  revalidatePath("/admin");
  revalidatePath(`/admin/${id}`);
}

/** Send (or resend) the owner invite — explicit, never triggered by a field save. */
export async function resendInviteAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
  const id = String(formData.get("id") ?? "");
  if (!ownerEmail) return;
  const sb = createSupabaseAdmin();
  // An already-registered owner just signs in — that error is fine.
  const { error } = await sb.auth.admin.inviteUserByEmail(ownerEmail, {
    redirectTo: INVITE_REDIRECT(siteUrl()),
  });
  if (error && !isAlreadyRegistered(error)) throw new Error(error.message);
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/${id}`);
}

/**
 * Admin-led onboarding finish: save the organization's config, then send the FIRST invite. Bound to a
 * organizationId and passed to the wizard's `save` prop. Re-running the wizard to edit config does NOT
 * re-invite — inviteUserByEmail returns email_exists for an already-invited owner and sends nothing.
 */
export async function saveOnboardingAdminAction(
  organizationId: string,
  raw: unknown,
): Promise<{ error?: string; ok?: boolean; warning?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Forbidden." };
  }

  const parsed = organizationConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `${first.path.join(".")}: ${first.message}` : "Please check your entries." };
  }

  try {
    await setOrganizationConfig(organizationId, parsed.data); // sets onboardingComplete = true
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }

  const organization = await getOrganizationById(organizationId);
  const ownerEmail = organization?.ownerEmail;
  let warning: string | undefined;
  if (!ownerEmail) {
    warning = "Setup saved, but there's no owner email — add one on the organization page to invite them.";
  } else {
    const sb = createSupabaseAdmin();
    const { error } = await sb.auth.admin.inviteUserByEmail(ownerEmail, {
      redirectTo: INVITE_REDIRECT(siteUrl()),
    });
    if (error && !isAlreadyRegistered(error)) {
      warning = `Setup saved, but the invite email failed: ${error.message}. Resend it from the organization page.`;
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/${organizationId}`);
  return { ok: true, warning };
}

/**
 * Accept a waitlist entry: create a shell org for that email + send the owner invite (the exact
 * inviteUserByEmail + /auth/land?type=invite path used elsewhere), then mark the row accepted.
 * The number/slug are provisional — the admin sets the real ones on the organization page. From
 * the accepted invite, the un-onboarded owner is routed into the Lu onboarding flow.
 */
export async function acceptWaitlistAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !email) return;

  const companyName = company || name || email;
  const slug = `${slugify(companyName) || "org"}-${Math.random().toString(36).slice(2, 6)}`;

  // Shell only — no Twilio number yet; the admin buys + fills it in on the organization page.
  await createOrganizationShell({ companyName, slug, twilioNumber: "", ownerEmail: email });

  const sb = createSupabaseAdmin();
  const { error } = await sb.auth.admin.inviteUserByEmail(email, {
    redirectTo: INVITE_REDIRECT(siteUrl()),
  });
  if (error && !isAlreadyRegistered(error)) throw new Error(error.message);

  const { error: wErr } = await sb
    .from("Waitlist")
    .update({ status: "accepted", updatedAt: new Date().toISOString() })
    .eq("id", id);
  if (wErr) throw wErr;

  revalidatePath("/admin");
}

/** Decline a waitlist entry — marks the row declined; sends nothing. */
export async function declineWaitlistAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const sb = createSupabaseAdmin();
  const { error } = await sb
    .from("Waitlist")
    .update({ status: "declined", updatedAt: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
}
