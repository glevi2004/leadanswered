import { randomUUID } from "node:crypto";
import type { ContractorConfig, GatheredInfo, Stage, TimeRange } from "@leadanswered/core";
import { createConversationLock } from "./conversationLock.js";
import type {
  AppointmentPatch,
  AppointmentSyncPatch,
  CalendarConnectionPatch,
  CalendarConnectionRecord,
  AppointmentRecord,
  BookOutcome,
  ConversationRecord,
  CreateLeadInput,
  LeadContext,
  LeadFieldPatch,
  LeadRecord,
  MessageRecord,
  RecipientRecord,
  Store,
} from "./types.js";

type ApptRow = {
  id: string;
  leadId: string;
  contractorId: string;
  startIso: string;
  endIso: string;
  status: string;
  rescheduledFromIso?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  externalProvider?: string | null;
  externalCalendarId?: string | null;
  externalEventId?: string | null;
  externalEtag?: string | null;
  syncState?: string;
  syncedAt?: string | null;
};

const isActive = (status: string) => status === "proposed" || status === "confirmed";
const overlaps = (aStart: string, aEnd: string, start: number, end: number) =>
  new Date(aStart).getTime() < end && new Date(aEnd).getTime() > start; // half-open

function memAppt(a: ApptRow): AppointmentRecord {
  return {
    id: a.id,
    leadId: a.leadId,
    contractorId: a.contractorId,
    startIso: a.startIso,
    endIso: a.endIso,
    status: a.status,
    externalEventId: a.externalEventId ?? null,
    externalEtag: a.externalEtag ?? null,
  };
}

/**
 * In-memory Store for demo mode + tests. It MIMICS the DB integrity constraints
 * (no overlapping active appointment per contractor; one active per lead) so logic
 * tests behave like prod — but it cannot PROVE them under real concurrency. The
 * race-proof guarantee is the Postgres EXCLUDE constraint, exercised by Tier-B tests.
 */
export class MemoryStore implements Store {
  private contractors = new Map<string, ContractorConfig>();
  private recipients = new Map<string, RecipientRecord[]>();
  private leads = new Map<string, LeadRecord>();
  private conversations = new Map<string, ConversationRecord>();
  private convIdByLead = new Map<string, string>();
  private messages: MessageRecord[] = [];
  private appointments: ApptRow[] = [];
  private calendarConnections = new Map<string, CalendarConnectionRecord>();
  private leadIdBySourceMessageId = new Map<string, string>();
  private lock = createConversationLock();
  private now: () => Date;

  /** Optional injected clock so tests can control message timestamps (recency checks). */
  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  seedContractor(c: ContractorConfig, recipients: RecipientRecord[] = []): void {
    this.contractors.set(c.id, c);
    this.recipients.set(c.id, recipients);
  }

  withConversationLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T> {
    return this.lock(conversationId, fn);
  }

  async getContractor(id: string): Promise<ContractorConfig | null> {
    return this.contractors.get(id) ?? null;
  }

  async getContractorByTwilioNumber(toNumber: string): Promise<ContractorConfig | null> {
    for (const c of this.contractors.values()) if (c.twilioNumber === toNumber) return c;
    return null;
  }

  async getContractorBySlug(slug: string): Promise<ContractorConfig | null> {
    for (const c of this.contractors.values()) if (c.slug === slug) return c;
    return null;
  }

  async findLeadBySourceMessageId(sourceMessageId: string): Promise<{ id: string } | null> {
    const id = this.leadIdBySourceMessageId.get(sourceMessageId);
    return id ? { id } : null;
  }

  async getRecipients(contractorId: string): Promise<RecipientRecord[]> {
    return this.recipients.get(contractorId) ?? [];
  }

  async createLeadWithConversation(input: CreateLeadInput): Promise<LeadContext> {
    const contractor = this.contractors.get(input.contractorId);
    if (!contractor) throw new Error(`unknown contractor ${input.contractorId}`);
    if (input.sourceMessageId && this.leadIdBySourceMessageId.has(input.sourceMessageId)) {
      const err: any = new Error("duplicate sourceMessageId");
      err.code = "P2002";
      throw err;
    }

    const lead: LeadRecord = {
      id: randomUUID(),
      contractorId: input.contractorId,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      projectHint: input.projectHint ?? null,
      serviceTown: null,
      serviceZip: null,
      fullAddress: null,
      status: "new",
      source: input.source ?? "manual",
    };
    this.leads.set(lead.id, lead);
    if (input.sourceMessageId) this.leadIdBySourceMessageId.set(input.sourceMessageId, lead.id);

    const gathered: GatheredInfo = { projectType: input.projectHint ?? null };
    const conv: ConversationRecord = { id: randomUUID(), leadId: lead.id, state: "intake", gathered };
    this.conversations.set(conv.id, conv);
    this.convIdByLead.set(lead.id, conv.id);

    return { lead, contractor, conversation: conv, messages: [] };
  }

  private contextFor(conv: ConversationRecord): LeadContext | null {
    const lead = this.leads.get(conv.leadId);
    if (!lead) return null;
    const contractor = this.contractors.get(lead.contractorId);
    if (!contractor) return null;
    const messages = this.messages.filter((m) => m.conversationId === conv.id);
    return { lead, contractor, conversation: conv, messages };
  }

  async findActiveContextByPhones(toNumber: string, fromNumber: string): Promise<LeadContext | null> {
    let contractorId: string | null = null;
    for (const c of this.contractors.values()) {
      if (c.twilioNumber === toNumber) {
        contractorId = c.id;
        break;
      }
    }
    if (!contractorId) return null;
    const candidates = [...this.leads.values()].filter(
      (l) => l.contractorId === contractorId && l.contactPhone === fromNumber,
    );
    for (const lead of candidates.reverse()) {
      const convId = this.convIdByLead.get(lead.id);
      const conv = convId ? this.conversations.get(convId) : undefined;
      if (conv) return this.contextFor(conv); // any state — disqualified/terminal follow-ups still handled
    }
    return null;
  }

  async findLeadContextByContractorPhone(contractorId: string, phone: string): Promise<LeadContext | null> {
    const candidates = [...this.leads.values()].filter(
      (l) => l.contractorId === contractorId && l.contactPhone === phone,
    );
    for (const lead of candidates.reverse()) {
      const convId = this.convIdByLead.get(lead.id);
      const conv = convId ? this.conversations.get(convId) : undefined;
      if (conv) return this.contextFor(conv);
    }
    return null;
  }

  async findLeadsByName(contractorId: string, name: string): Promise<LeadRecord[]> {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return [...this.leads.values()]
      .filter((l) => l.contractorId === contractorId && l.contactName.toLowerCase().includes(q))
      .slice(0, 10);
  }

  async getContextByLeadId(leadId: string): Promise<LeadContext | null> {
    const convId = this.convIdByLead.get(leadId);
    const conv = convId ? this.conversations.get(convId) : undefined;
    return conv ? this.contextFor(conv) : null;
  }

  async appendInboundIdempotent(
    conversationId: string,
    msg: { body: string; providerSid?: string | null },
  ): Promise<{ inserted: boolean }> {
    if (msg.providerSid && this.messages.some((m) => m.providerSid === msg.providerSid)) {
      return { inserted: false };
    }
    await this.appendMessage(conversationId, { direction: "inbound", body: msg.body, providerSid: msg.providerSid });
    return { inserted: true };
  }

  async appendMessage(
    conversationId: string,
    msg: { direction: "inbound" | "outbound"; body: string; providerSid?: string | null },
  ): Promise<MessageRecord> {
    const rec: MessageRecord = {
      id: randomUUID(),
      conversationId,
      direction: msg.direction,
      body: msg.body,
      providerSid: msg.providerSid ?? null,
      createdAt: this.now().toISOString(),
    };
    this.messages.push(rec);
    return rec;
  }

  async transitionLeadStatus(leadId: string, from: string[], to: string): Promise<boolean> {
    const lead = this.leads.get(leadId);
    if (lead && from.includes(lead.status)) {
      lead.status = to;
      return true;
    }
    return false;
  }

  async updateLeadFields(leadId: string, patch: LeadFieldPatch): Promise<void> {
    const lead = this.leads.get(leadId);
    if (lead) Object.assign(lead, patch);
  }

  async updateConversation(
    conversationId: string,
    patch: { state?: Stage; gathered?: GatheredInfo },
  ): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;
    if (patch.state) conv.state = patch.state;
    if (patch.gathered) conv.gathered = patch.gathered;
  }

  async bookAppointment(input: {
    leadId: string;
    contractorId: string;
    startIso: string;
    endIso: string;
    timezone: string;
  }): Promise<BookOutcome> {
    if (this.appointments.some((a) => a.leadId === input.leadId && isActive(a.status))) {
      return { ok: false, reason: "lead_has_active" };
    }
    const start = new Date(input.startIso).getTime();
    const end = new Date(input.endIso).getTime();
    if (
      this.appointments.some(
        (a) => a.contractorId === input.contractorId && isActive(a.status) && overlaps(a.startIso, a.endIso, start, end),
      )
    ) {
      return { ok: false, reason: "slot_taken" };
    }
    const appt: ApptRow = {
      id: randomUUID(),
      leadId: input.leadId,
      contractorId: input.contractorId,
      startIso: input.startIso,
      endIso: input.endIso,
      status: "confirmed",
    };
    this.appointments.push(appt);
    const lead = this.leads.get(input.leadId);
    if (lead) lead.status = "booked";
    const convId = this.convIdByLead.get(input.leadId);
    const conv = convId ? this.conversations.get(convId) : undefined;
    if (conv) conv.state = "agent";
    return { ok: true, id: appt.id, startIso: input.startIso, endIso: input.endIso };
  }

  async getBusyTimes(
    contractorId: string,
    window: { startIso: string; endIso: string },
  ): Promise<TimeRange[]> {
    const ws = new Date(window.startIso).getTime();
    const we = new Date(window.endIso).getTime();
    return this.appointments
      .filter((a) => a.contractorId === contractorId && isActive(a.status) && overlaps(a.startIso, a.endIso, ws, we))
      .map((a) => ({ startAt: new Date(a.startIso), endAt: new Date(a.endIso) }));
  }

  async getActiveAppointmentByLead(leadId: string): Promise<AppointmentRecord | null> {
    const appt = [...this.appointments].reverse().find((a) => a.leadId === leadId && isActive(a.status));
    return appt
      ? {
          id: appt.id,
          leadId: appt.leadId,
          contractorId: appt.contractorId,
          startIso: appt.startIso,
          endIso: appt.endIso,
          status: appt.status,
        }
      : null;
  }

  async getAppointmentsByLead(leadId: string): Promise<AppointmentRecord[]> {
    return this.appointments
      .filter((a) => a.leadId === leadId)
      .map((a) => ({
        id: a.id,
        leadId: a.leadId,
        contractorId: a.contractorId,
        startIso: a.startIso,
        endIso: a.endIso,
        status: a.status,
      }));
  }

  async rescheduleAppointment(id: string, startIso: string, endIso: string): Promise<BookOutcome> {
    const appt = this.appointments.find((a) => a.id === id);
    if (!appt) return { ok: false, reason: "slot_taken" };
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    if (
      this.appointments.some(
        (a) =>
          a.id !== id && a.contractorId === appt.contractorId && isActive(a.status) && overlaps(a.startIso, a.endIso, start, end),
      )
    ) {
      return { ok: false, reason: "slot_taken" };
    }
    appt.rescheduledFromIso = appt.startIso;
    appt.startIso = startIso;
    appt.endIso = endIso;
    appt.status = "confirmed";
    return { ok: true, id: appt.id, startIso, endIso };
  }

  async updateAppointment(id: string, patch: AppointmentPatch): Promise<void> {
    const appt = this.appointments.find((a) => a.id === id);
    if (!appt) return;
    if (patch.startIso !== undefined) appt.startIso = patch.startIso;
    if (patch.endIso !== undefined) appt.endIso = patch.endIso;
    if (patch.status !== undefined) appt.status = patch.status;
    if (patch.rescheduledFromIso !== undefined) appt.rescheduledFromIso = patch.rescheduledFromIso;
    if (patch.cancelledAt !== undefined) appt.cancelledAt = patch.cancelledAt;
    if (patch.cancelReason !== undefined) appt.cancelReason = patch.cancelReason;
  }

  async getAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const a = this.appointments.find((x) => x.id === id);
    return a ? memAppt(a) : null;
  }

  async findAppointmentByExternalEventId(contractorId: string, externalEventId: string): Promise<AppointmentRecord | null> {
    const a = this.appointments.find((x) => x.contractorId === contractorId && x.externalEventId === externalEventId);
    return a ? memAppt(a) : null;
  }

  async updateAppointmentSync(id: string, patch: AppointmentSyncPatch): Promise<void> {
    const a = this.appointments.find((x) => x.id === id);
    if (!a) return;
    if (patch.externalProvider !== undefined) a.externalProvider = patch.externalProvider;
    if (patch.externalCalendarId !== undefined) a.externalCalendarId = patch.externalCalendarId;
    if (patch.externalEventId !== undefined) a.externalEventId = patch.externalEventId;
    if (patch.externalEtag !== undefined) a.externalEtag = patch.externalEtag;
    if (patch.syncState !== undefined) a.syncState = patch.syncState;
    if (patch.syncedAt !== undefined) a.syncedAt = patch.syncedAt;
  }

  async getCalendarConnection(contractorId: string, provider = "google"): Promise<CalendarConnectionRecord | null> {
    return this.calendarConnections.get(`${contractorId}:${provider}`) ?? null;
  }

  async getCalendarConnectionByChannel(channelId: string): Promise<CalendarConnectionRecord | null> {
    return [...this.calendarConnections.values()].find((c) => c.channelId === channelId) ?? null;
  }

  async listConnectedCalendars(): Promise<CalendarConnectionRecord[]> {
    return [...this.calendarConnections.values()].filter((c) => c.status === "connected");
  }

  async upsertCalendarConnection(
    contractorId: string,
    provider: string,
    patch: CalendarConnectionPatch,
  ): Promise<CalendarConnectionRecord> {
    const key = `${contractorId}:${provider}`;
    const merged: CalendarConnectionRecord = this.calendarConnections.get(key) ?? {
      id: randomUUID(),
      contractorId,
      provider,
      externalCalendarId: null,
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      status: "disconnected",
      scope: null,
      email: null,
      syncToken: null,
      channelId: null,
      resourceId: null,
      channelToken: null,
      channelExpiresAt: null,
    };
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (merged as any)[k] = v;
    this.calendarConnections.set(key, merged);
    return merged;
  }

  private escalations: {
    id: string;
    leadId: string;
    contractorId: string;
    conversationId: string;
    question: string;
    answer?: string | null;
    status: string;
  }[] = [];

  async createEscalation(input: {
    leadId: string;
    contractorId: string;
    conversationId: string;
    question: string;
  }) {
    const esc = { id: randomUUID(), ...input, status: "open" };
    this.escalations.push(esc);
    return {
      id: esc.id,
      leadId: esc.leadId,
      contractorId: esc.contractorId,
      conversationId: esc.conversationId,
      question: esc.question,
      status: esc.status,
    };
  }

  async findOpenEscalationByContractorReply(contractorId: string) {
    const esc = [...this.escalations].reverse().find((e) => e.contractorId === contractorId && e.status === "open");
    return esc
      ? {
          id: esc.id,
          leadId: esc.leadId,
          contractorId: esc.contractorId,
          conversationId: esc.conversationId,
          question: esc.question,
          status: esc.status,
        }
      : null;
  }

  async findOpenEscalationByLead(leadId: string) {
    const esc = [...this.escalations].reverse().find((e) => e.leadId === leadId && e.status === "open");
    return esc
      ? { id: esc.id, leadId: esc.leadId, contractorId: esc.contractorId, conversationId: esc.conversationId, question: esc.question, status: esc.status }
      : null;
  }

  async resolveEscalationIfOpen(id: string, answer: string): Promise<boolean> {
    const esc = this.escalations.find((e) => e.id === id);
    if (esc && esc.status === "open") {
      esc.answer = answer;
      esc.status = "resolved";
      return true;
    }
    return false;
  }

  async getEscalation(id: string) {
    const e = this.escalations.find((x) => x.id === id);
    return e
      ? { id: e.id, leadId: e.leadId, contractorId: e.contractorId, conversationId: e.conversationId, question: e.question, status: e.status }
      : null;
  }

  async expireEscalation(id: string): Promise<boolean> {
    const e = this.escalations.find((x) => x.id === id);
    if (e && e.status === "open") {
      e.status = "expired";
      return true;
    }
    return false;
  }

  // ---- test/demo inspection helpers ----
  getAppointments() {
    return this.appointments;
  }
  getEscalations() {
    return this.escalations;
  }
  getMessages() {
    return this.messages;
  }
}
