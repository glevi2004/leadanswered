import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { OrganizationConfigInput } from "@/lib/config";

/**
 * Organization read/write helpers (server-only) via supabase-js with the service-role
 * key. Access is enforced in our own code (middleware + role checks), so bypassing
 * RLS is intentional. NOTE: Prisma's id/updatedAt are app-side defaults, so inserts
 * must supply them explicitly.
 */

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

/**
 * Map a raw Organization row to the app shape: the DB columns are still `sarahName` /
 * `sarahPersonaNotes` (kept to avoid a prod column rename), but the app reads them as
 * `assistantName` / `personaNotes`.
 */
function aliasOrg<T extends Record<string, unknown>>(row: T | null): (T & { assistantName?: unknown; personaNotes?: unknown }) | null {
  if (!row) return row;
  return { ...row, assistantName: row.sarahName, personaNotes: row.sarahPersonaNotes };
}

export interface OrganizationListRow {
  id: string;
  companyName: string;
  slug: string | null;
  twilioNumber: string | null;
  verificationStatus: string;
  ownerEmail: string | null;
  onboardingComplete: boolean;
}

export async function listOrganizations(): Promise<OrganizationListRow[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Organization")
    .select("id, companyName, slug, twilioNumber, verificationStatus, ownerEmail, onboardingComplete, createdAt")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrganizationListRow[];
}

export async function getOrganizationByOwnerEmail(email: string) {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Organization")
    .select("*")
    .eq("ownerEmail", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return aliasOrg(data);
}

/** Full organization row + recipients by id — seeds the admin-run onboarding wizard. */
export async function getOrganizationConfigById(id: string) {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Organization")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return aliasOrg(data);
}

/**
 * Account lifecycle, DERIVED — never a stored column. Onboarding is ADMIN-LED and precedes the
 * invite (SCOPE §3): no owner → "none"; created, awaiting the admin-run wizard → "new"; onboarded
 * but the invite hasn't gone out (recovery) → "onboarded"; onboarded + invited, awaiting acceptance
 * → "invited"; accepted (email confirmed / signed in) → "live". Distinct from the manual Twilio line
 * `verificationStatus`; neither gates the agent (both are informational).
 */
export type AccountStatus = "none" | "new" | "onboarded" | "invited" | "live";

export interface OrganizationListRowWithStatus extends OrganizationListRow {
  accountStatus: AccountStatus;
}

/** email(lowercased) → has the Supabase user accepted (email_confirmed_at or last_sign_in_at set)? */
async function ownerAcceptanceMap(emails: string[]): Promise<Map<string, boolean>> {
  const sb = createSupabaseAdmin();
  const wanted = new Set(emails.map((e) => e.toLowerCase()));
  const map = new Map<string, boolean>();
  for (let page = 1; wanted.size > 0 && page <= 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) {
      const em = u.email?.toLowerCase();
      if (em && wanted.has(em)) {
        map.set(em, Boolean(u.email_confirmed_at || u.last_sign_in_at));
        wanted.delete(em);
      }
    }
    if (data.users.length < 200) break;
  }
  return map;
}

function accountStatusFrom(
  ownerEmail: string | null,
  onboardingComplete: boolean,
  accepted: boolean | undefined, // true=signed in, false=auth user exists but not accepted, undefined=no auth user
): AccountStatus {
  if (!ownerEmail) return "none";
  if (accepted === true) return "live";
  if (accepted === false) return "invited";
  return onboardingComplete ? "onboarded" : "new"; // no auth user yet → not invited
}

export async function listOrganizationsWithStatus(): Promise<OrganizationListRowWithStatus[]> {
  const rows = await listOrganizations();
  const emails = rows.map((r) => r.ownerEmail).filter((e): e is string => !!e);
  const accepted = emails.length ? await ownerAcceptanceMap(emails) : new Map<string, boolean>();
  return rows.map((r) => ({
    ...r,
    accountStatus: accountStatusFrom(
      r.ownerEmail,
      r.onboardingComplete,
      r.ownerEmail ? accepted.get(r.ownerEmail.toLowerCase()) : undefined,
    ),
  }));
}

export interface OrganizationAdminDetail {
  id: string;
  companyName: string;
  slug: string | null;
  twilioNumber: string | null;
  ownerEmail: string | null;
  verificationStatus: string;
  onboardingComplete: boolean;
  accountStatus: AccountStatus;
}

/** Full organization row + derived accountStatus, for the /admin/[id] manage page. */
export async function getOrganizationById(id: string): Promise<OrganizationAdminDetail | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.from("Organization").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as Record<string, any>;
  const accepted = row.ownerEmail ? await ownerAcceptanceMap([row.ownerEmail]) : new Map<string, boolean>();
  return {
    id: row.id,
    companyName: row.companyName,
    slug: row.slug ?? null,
    twilioNumber: row.twilioNumber ?? null,
    ownerEmail: row.ownerEmail ?? null,
    verificationStatus: row.verificationStatus,
    onboardingComplete: Boolean(row.onboardingComplete),
    accountStatus: accountStatusFrom(
      row.ownerEmail ?? null,
      Boolean(row.onboardingComplete),
      row.ownerEmail ? accepted.get(String(row.ownerEmail).toLowerCase()) : undefined,
    ),
  };
}

export async function createOrganizationShell(input: {
  companyName: string;
  slug: string;
  twilioNumber: string;
  ownerEmail: string;
  verificationStatus?: "pending" | "verified" | "failed";
}): Promise<{ id: string }> {
  const sb = createSupabaseAdmin();
  const id = newId();
  const { error } = await sb.from("Organization").insert({
    id,
    name: input.companyName, // owner name captured during onboarding; default to company
    companyName: input.companyName,
    slug: input.slug,
    twilioNumber: input.twilioNumber,
    ownerEmail: input.ownerEmail.toLowerCase(),
    verificationStatus: input.verificationStatus ?? "pending",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (error) throw error;
  return { id };
}

export async function updateOrganizationAdmin(
  id: string,
  patch: {
    companyName?: string;
    slug?: string;
    twilioNumber?: string;
    verificationStatus?: "pending" | "verified" | "failed";
    ownerEmail?: string;
  },
): Promise<void> {
  const sb = createSupabaseAdmin();
  const data: Record<string, unknown> = { updatedAt: nowIso() };
  if (patch.companyName !== undefined) data.companyName = patch.companyName;
  if (patch.slug !== undefined) data.slug = patch.slug || null;
  if (patch.twilioNumber !== undefined) data.twilioNumber = patch.twilioNumber;
  if (patch.verificationStatus !== undefined) data.verificationStatus = patch.verificationStatus;
  if (patch.ownerEmail) data.ownerEmail = patch.ownerEmail.toLowerCase();
  const { error } = await sb.from("Organization").update(data).eq("id", id);
  if (error) throw error;
}

/** Persist the client's self-serve config + replace their notification recipients. */
export async function setOrganizationConfig(id: string, config: OrganizationConfigInput): Promise<void> {
  const sb = createSupabaseAdmin();

  const { error: e1 } = await sb
    .from("Organization")
    .update({
      companyName: config.companyName,
      // DB columns are still named sarahName / sarahPersonaNotes (kept to avoid a prod
      // migration); the app-facing config field is assistantName / personaNotes.
      sarahName: config.assistantName,
      sarahPersonaNotes: config.personaNotes ?? null,
      projectTypes: config.projectTypes,
      qualificationRules: config.qualificationRules,
      standingAvailability: config.standingAvailability,
      baseLocations: config.serviceArea.baseLocations,
      includeOverrides: config.serviceArea.includeOverrides,
      excludeOverrides: config.serviceArea.excludeOverrides,
      escalationTopics: config.escalationTopics,
      onboardingComplete: true,
      updatedAt: nowIso(),
    })
    .eq("id", id);
  if (e1) throw e1;
  // NotificationRecipient/Subscription were dropped with the old lead-response product;
  // config.recipients stays in the type but is no longer persisted here.
}
