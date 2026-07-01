"use server";

import { revalidatePath } from "next/cache";
import {
  createContractorShell,
  updateContractorAdmin,
  setContractorConfig,
  getContractorById,
} from "@/lib/contractors";
import { contractorConfigSchema } from "@/lib/config";
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

export async function createContractorAction(
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
    await createContractorShell({ companyName, slug, twilioNumber, ownerEmail });

    revalidatePath("/admin");
    return { ok: `Created ${companyName}. Onboard them next — the invite goes out when you finish.` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/**
 * Save contractor fields. Editing NEVER emails — inviting is a separate, explicit action
 * (resendInviteAction). This fixes the old "Save & invite" that re-invited on every edit.
 */
export async function saveContractorAction(formData: FormData): Promise<void> {
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

  await updateContractorAdmin(id, { companyName, slug, twilioNumber, verificationStatus, ownerEmail });
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
 * Admin-led onboarding finish: save the contractor's config, then send the FIRST invite. Bound to a
 * contractorId and passed to the wizard's `save` prop. Re-running the wizard to edit config does NOT
 * re-invite — inviteUserByEmail returns email_exists for an already-invited owner and sends nothing.
 */
export async function saveOnboardingAdminAction(
  contractorId: string,
  raw: unknown,
): Promise<{ error?: string; ok?: boolean; warning?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Forbidden." };
  }

  const parsed = contractorConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { error: first ? `${first.path.join(".")}: ${first.message}` : "Please check your entries." };
  }

  try {
    await setContractorConfig(contractorId, parsed.data); // sets onboardingComplete = true
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save." };
  }

  const contractor = await getContractorById(contractorId);
  const ownerEmail = contractor?.ownerEmail;
  let warning: string | undefined;
  if (!ownerEmail) {
    warning = "Setup saved, but there's no owner email — add one on the contractor page to invite them.";
  } else {
    const sb = createSupabaseAdmin();
    const { error } = await sb.auth.admin.inviteUserByEmail(ownerEmail, {
      redirectTo: INVITE_REDIRECT(siteUrl()),
    });
    if (error && !isAlreadyRegistered(error)) {
      warning = `Setup saved, but the invite email failed: ${error.message}. Resend it from the contractor page.`;
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/${contractorId}`);
  return { ok: true, warning };
}
