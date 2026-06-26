"use server";

import { revalidatePath } from "next/cache";
import { createContractorShell, updateContractorAdmin } from "@/lib/contractors";
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

// Land on a client page so AuthHashHandler can consume implicit-flow hash tokens
// and route by type (a server route can't read the URL hash fragment).
const INVITE_REDIRECT = (site: string) => `${site}/auth/land`;
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

    await createContractorShell({ companyName, slug, twilioNumber, ownerEmail });

    const sb = createSupabaseAdmin();
    const { error } = await sb.auth.admin.inviteUserByEmail(ownerEmail, {
      redirectTo: INVITE_REDIRECT(siteUrl()),
    });
    if (error && !isAlreadyRegistered(error)) {
      return { error: `Contractor created, but the invite failed: ${error.message}` };
    }

    revalidatePath("/admin");
    return {
      ok: error
        ? `Created ${companyName}. ${ownerEmail} already has an account — they can sign in.`
        : `Created ${companyName} and invited ${ownerEmail}.`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateContractorAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id"));
  const twilioNumber = String(formData.get("twilioNumber") ?? "").trim() || undefined;
  const verificationStatus = (String(formData.get("verificationStatus") ?? "") || undefined) as
    | "pending"
    | "verified"
    | "failed"
    | undefined;
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase() || undefined;

  await updateContractorAdmin(id, { twilioNumber, verificationStatus, ownerEmail });

  // If an owner email was set/changed, send an invite (to set a password). An
  // already-registered owner just signs in — ignore that error.
  if (ownerEmail) {
    const sb = createSupabaseAdmin();
    await sb.auth.admin
      .inviteUserByEmail(ownerEmail, { redirectTo: INVITE_REDIRECT(siteUrl()) })
      .catch(() => {});
  }
  revalidatePath("/admin");
}
