import { getLeadDetail, listLeads } from "@/lib/dashboard";
import type { Contact, TimelineEvent } from "../shared";
import type { ContactSidebar, PipelineStage } from "./types";
import { APEX_CONTACTS, APEX_SIDEBARS, APEX_TIMELINES } from "../fixtures/apex";

/**
 * CRM reads behind the mock↔real seam (00 §5, 05-crm §4). Real mode maps
 * today's `Lead` rows onto the `Contact` overlay (lead-side stages 1:1 from
 * Lead.status); demo mode serves the Apex cast. Real partners never see
 * fixture customers — the customer side arrives with import/06/08/09.
 */

export interface ContactDetail {
  contact: Contact;
  timeline: TimelineEvent[];
  sidebar: ContactSidebar;
}

/* ----------------------------------- mock ------------------------------------- */

export function listContactsMock(): Contact[] {
  return APEX_CONTACTS;
}

export function getContactMock(id: string): ContactDetail | null {
  const contact = APEX_CONTACTS.find((c) => c.id === id);
  if (!contact) return null;
  const timeline = (APEX_TIMELINES[id] ?? defaultImportTimeline(contact)).slice().sort((a, b) => a.at.localeCompare(b.at));
  const sidebar = APEX_SIDEBARS[id] ?? {
    openEscalations: 0,
    facts: [
      { label: "Imported", value: "5 days ago" },
      { label: "Source", value: "QuickBooks" },
    ],
  };
  return { contact, timeline, sidebar };
}

function defaultImportTimeline(contact: Contact): TimelineEvent[] {
  return [{ id: `tl_${contact.id}_imp`, contactId: contact.id, at: contact.createdAt, type: "import", source: "QuickBooks" }];
}

/* ----------------------------------- real ------------------------------------- */

export async function listContactsReal(organizationId: string): Promise<Contact[]> {
  const leads = await listLeads(organizationId);
  return leads.map((l) => ({
    id: l.id,
    kind: "lead" as const,
    name: l.contactName || l.contactPhone || "New lead",
    phone: l.contactPhone ?? "",
    town: l.serviceTown ?? undefined,
    zip: l.serviceZip ?? undefined,
    stage: (l.status as PipelineStage) ?? "new",
    source: "—",
    tags: [],
    lastActivityAt: l.updatedAt,
    createdAt: l.createdAt,
  }));
}

export async function getContactReal(organizationId: string, id: string): Promise<ContactDetail | null> {
  const lead = await getLeadDetail(organizationId, id);
  if (!lead) return null;

  const timeline: TimelineEvent[] = [
    ...(lead.conversation?.messages ?? []).map((m) => ({
      id: m.id,
      contactId: id,
      at: m.createdAt,
      type: "message" as const,
      direction: m.direction,
      body: m.body,
      via: "sms" as const,
    })),
    ...lead.appointments.map((a) => ({
      id: a.id,
      contactId: id,
      at: a.createdAt,
      type: "appointment" as const,
      appointmentId: a.id,
      startAt: a.startAt,
      status: a.status,
    })),
    ...lead.escalations.map((e) => ({
      id: e.id,
      contactId: id,
      at: e.createdAt,
      type: "escalation" as const,
      question: e.question,
      status: (e.status as "open" | "resolved" | "expired") ?? "open",
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const nowIso = new Date().toISOString();
  const next = lead.appointments.find((a) => ["proposed", "confirmed"].includes(a.status) && a.startAt >= nowIso);
  const msgCount = lead.conversation?.messages.length ?? 0;

  return {
    contact: {
      id: lead.id,
      kind: "lead",
      name: lead.contactName || lead.contactPhone || "New lead",
      phone: lead.contactPhone ?? "",
      address: lead.fullAddress ?? undefined,
      town: lead.serviceTown ?? undefined,
      zip: lead.serviceZip ?? undefined,
      stage: (lead.status as PipelineStage) ?? "new",
      source: lead.source ?? "—",
      tags: [],
      lastActivityAt: lead.updatedAt,
      createdAt: lead.createdAt,
    },
    timeline,
    sidebar: {
      nextAppointment: next ? { id: next.id, startAt: next.startAt, status: next.status } : undefined,
      openEscalations: lead.escalations.filter((e) => e.status === "open").length,
      facts: [
        { label: "First seen", value: new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) },
        { label: "Messages", value: String(msgCount) },
      ],
    },
  };
}
