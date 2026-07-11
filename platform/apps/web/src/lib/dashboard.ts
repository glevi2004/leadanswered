import { createSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Read-only dashboard queries (server-only) via supabase-js service role.
 * There is no RLS, so EVERY query is scoped to the caller's `organizationId` —
 * derived from the authenticated owner (getOrganizationByOwnerEmail). Detail
 * lookups also pin `organizationId` in the WHERE clause, so one tenant can never
 * read another's lead by guessing an id.
 */

export interface LeadRow {
  id: string;
  contactName: string | null;
  contactPhone: string | null;
  projectHint: string | null;
  serviceTown: string | null;
  serviceZip: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRow {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  createdAt: string;
}

export interface AppointmentRow {
  id: string;
  startAt: string;
  status: string;
  cancelReason: string | null;
  createdAt: string;
  lead?: { id: string; contactName: string | null; contactPhone: string | null } | null;
}

export interface EscalationRow {
  id: string;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

/** supabase-js may return an embedded to-one relation as an object or a 1-element array. */
function one<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export async function listLeads(organizationId: string): Promise<LeadRow[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Lead")
    .select("id, contactName, contactPhone, projectHint, serviceTown, serviceZip, status, createdAt, updatedAt")
    .eq("organizationId", organizationId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LeadRow[];
}

export interface LeadDetail extends LeadRow {
  fullAddress: string | null;
  source: string | null;
  conversation: { state: string; messages: MessageRow[] } | null;
  appointments: AppointmentRow[];
  escalations: EscalationRow[];
}

/** Full lead view. Returns null if the lead isn't this organization's (→ notFound). */
export async function getLeadDetail(organizationId: string, leadId: string): Promise<LeadDetail | null> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Lead")
    .select(
      "*, conversation:Conversation(state, messages:Message(id, direction, body, createdAt)), appointments:Appointment(*), escalations:Escalation(*)",
    )
    .eq("id", leadId)
    .eq("organizationId", organizationId) // tenant guard: no row for another tenant's lead
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, any>;
  const conv = one<{ state: string; messages: MessageRow[] }>(row.conversation);
  const messages = (conv?.messages ?? [])
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    ...(row as LeadRow),
    fullAddress: row.fullAddress ?? null,
    source: row.source ?? null,
    conversation: conv ? { state: conv.state, messages } : null,
    appointments: ((row.appointments ?? []) as AppointmentRow[])
      .slice()
      .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    escalations: ((row.escalations ?? []) as EscalationRow[])
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function listAppointments(organizationId: string): Promise<AppointmentRow[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Appointment")
    .select("id, startAt, status, cancelReason, createdAt, lead:Lead(id, contactName, contactPhone)")
    .eq("organizationId", organizationId)
    .order("startAt", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Record<string, any>[]).map((a) => ({
    ...(a as AppointmentRow),
    lead: one(a.lead),
  }));
}

export interface DashboardSummary {
  totalLeads: number;
  counts: Record<string, number>;
  recentLeads: LeadRow[];
  upcomingAppointments: AppointmentRow[];
}

/** Overview KPIs + recent leads + upcoming appointments, in one place. */
export async function getDashboardSummary(organizationId: string, nowIso: string): Promise<DashboardSummary> {
  const [leads, appts] = await Promise.all([listLeads(organizationId), listAppointments(organizationId)]);

  const counts: Record<string, number> = {};
  for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;

  const active = new Set(["proposed", "confirmed"]);
  const upcomingAppointments = appts.filter((a) => active.has(a.status) && a.startAt >= nowIso);

  return {
    totalLeads: leads.length,
    counts,
    recentLeads: leads.slice(0, 6),
    upcomingAppointments: upcomingAppointments.slice(0, 6),
  };
}
