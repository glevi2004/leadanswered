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
    twilioNumber?: string;
    verificationStatus?: "pending" | "verified" | "failed";
    ownerEmail?: string;
  },
): Promise<void> {
  const sb = createSupabaseAdmin();
  const data: Record<string, unknown> = { updatedAt: nowIso() };
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
