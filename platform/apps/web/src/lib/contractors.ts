import { createSupabaseAdmin } from "@/lib/supabase/admin";
import type { ContractorConfigInput } from "@/lib/config";

/**
 * Contractor read/write helpers (server-only) via supabase-js with the service-role
 * key. Access is enforced in our own code (middleware + role checks), so bypassing
 * RLS is intentional. NOTE: Prisma's id/updatedAt are app-side defaults, so inserts
 * must supply them explicitly.
 */

const nowIso = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

export interface ContractorListRow {
  id: string;
  companyName: string;
  slug: string | null;
  twilioNumber: string | null;
  verificationStatus: string;
  ownerEmail: string | null;
  onboardingComplete: boolean;
}

export async function listContractors(): Promise<ContractorListRow[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Contractor")
    .select("id, companyName, slug, twilioNumber, verificationStatus, ownerEmail, onboardingComplete, createdAt")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContractorListRow[];
}

export async function getContractorByOwnerEmail(email: string) {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Contractor")
    .select("*, recipients:NotificationRecipient(*, subscriptions:NotificationSubscription(*))")
    .eq("ownerEmail", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Account lifecycle, DERIVED — never a stored column. no owner → "none"; finished the config
 * wizard (onboardingComplete) → "live"; accepted the invite (email confirmed / signed in) →
 * "accepted"; invite sent but not accepted → "invited". This is distinct from the manual Twilio
 * line `verificationStatus`, and neither gates the agent (both are informational).
 */
export type AccountStatus = "none" | "invited" | "accepted" | "live";

export interface ContractorListRowWithStatus extends ContractorListRow {
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
  accepted: boolean | undefined,
): AccountStatus {
  if (!ownerEmail) return "none";
  if (onboardingComplete) return "live";
  return accepted ? "accepted" : "invited";
}

export async function listContractorsWithStatus(): Promise<ContractorListRowWithStatus[]> {
  const rows = await listContractors();
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

export interface ContractorAdminDetail {
  id: string;
  companyName: string;
  slug: string | null;
  twilioNumber: string | null;
  ownerEmail: string | null;
  verificationStatus: string;
  onboardingComplete: boolean;
  accountStatus: AccountStatus;
}

/** Full contractor row + derived accountStatus, for the /admin/[id] manage page. */
export async function getContractorById(id: string): Promise<ContractorAdminDetail | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb.from("Contractor").select("*").eq("id", id).maybeSingle();
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

export async function createContractorShell(input: {
  companyName: string;
  slug: string;
  twilioNumber: string;
  ownerEmail: string;
  verificationStatus?: "pending" | "verified" | "failed";
}): Promise<{ id: string }> {
  const sb = createSupabaseAdmin();
  const id = newId();
  const { error } = await sb.from("Contractor").insert({
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

export async function updateContractorAdmin(
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
  const { error } = await sb.from("Contractor").update(data).eq("id", id);
  if (error) throw error;
}

/** Persist the client's self-serve config + replace their notification recipients. */
export async function setContractorConfig(id: string, config: ContractorConfigInput): Promise<void> {
  const sb = createSupabaseAdmin();

  const { error: e1 } = await sb
    .from("Contractor")
    .update({
      companyName: config.companyName,
      sarahName: config.sarahName,
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

  // Replace recipients (sequential — onboarding is low-concurrency).
  const { error: e2 } = await sb.from("NotificationRecipient").delete().eq("contractorId", id);
  if (e2) throw e2;

  for (const r of config.recipients) {
    const recipientId = newId();
    const { error: e3 } = await sb.from("NotificationRecipient").insert({
      id: recipientId,
      contractorId: id,
      name: r.name,
      phone: r.phone ?? null,
      email: r.email ?? null,
    });
    if (e3) throw e3;
    if (r.subscriptions.length) {
      const { error: e4 } = await sb.from("NotificationSubscription").insert(
        r.subscriptions.map((s) => ({
          id: newId(),
          recipientId,
          eventType: s.eventType,
          channels: s.channels,
        })),
      );
      if (e4) throw e4;
    }
  }
}
