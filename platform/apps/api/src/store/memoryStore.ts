import { randomUUID } from "node:crypto";
import type { ContractorConfig, GatheredInfo } from "@leadanswered/core";
import type {
  ConversationRecord,
  CreateLeadInput,
  LeadContext,
  LeadFieldPatch,
  LeadRecord,
  MessageRecord,
  RecipientRecord,
  Store,
} from "./types.js";

/** In-memory Store for the demo mode and tests — no external services required. */
export class MemoryStore implements Store {
  private contractors = new Map<string, ContractorConfig>();
  private recipients = new Map<string, RecipientRecord[]>();
  private leads = new Map<string, LeadRecord>();
  private conversations = new Map<string, ConversationRecord>();
  private convIdByLead = new Map<string, string>();
  private messages: MessageRecord[] = [];
  private appointments: {
    id: string;
    leadId: string;
    contractorId: string;
    slotIso: string;
    status: string;
    rescheduledFromIso?: string | null;
    cancelledAt?: string | null;
    cancelReason?: string | null;
  }[] = [];

  seedContractor(c: ContractorConfig, recipients: RecipientRecord[] = []): void {
    this.contractors.set(c.id, c);
    this.recipients.set(c.id, recipients);
  }

  async getContractor(id: string): Promise<ContractorConfig | null> {
    return this.contractors.get(id) ?? null;
  }

  async getContractorByTwilioNumber(
    toNumber: string,
  ): Promise<ContractorConfig | null> {
    for (const c of this.contractors.values()) {
      if (c.twilioNumber === toNumber) return c;
    }
    return null;
  }

  async getContractorBySlug(slug: string): Promise<ContractorConfig | null> {
    for (const c of this.contractors.values()) {
      if (c.slug === slug) return c;
    }
    return null;
  }

  private leadIdBySourceMessageId = new Map<string, string>();

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
    };
    this.leads.set(lead.id, lead);
    if (input.sourceMessageId) this.leadIdBySourceMessageId.set(input.sourceMessageId, lead.id);

    const gathered: GatheredInfo = { projectType: input.projectHint ?? null };
    const conv: ConversationRecord = {
      id: randomUUID(),
      leadId: lead.id,
      state: "greeting",
      gathered,
    };
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

  async findActiveContextByPhones(
    toNumber: string,
    fromNumber: string,
  ): Promise<LeadContext | null> {
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
      if (conv && conv.state !== "done") return this.contextFor(conv);
    }
    return null;
  }

  async getContextByLeadId(leadId: string): Promise<LeadContext | null> {
    const convId = this.convIdByLead.get(leadId);
    const conv = convId ? this.conversations.get(convId) : undefined;
    return conv ? this.contextFor(conv) : null;
  }

  async messageExistsByProviderSid(sid: string): Promise<boolean> {
    return this.messages.some((m) => m.providerSid === sid);
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
    };
    this.messages.push(rec);
    return rec;
  }

  async updateLeadFields(leadId: string, patch: LeadFieldPatch): Promise<void> {
    const lead = this.leads.get(leadId);
    if (lead) Object.assign(lead, patch);
  }

  async updateConversation(
    conversationId: string,
    patch: { state?: import("@leadanswered/core").Stage; gathered?: GatheredInfo },
  ): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;
    if (patch.state) conv.state = patch.state;
    if (patch.gathered) conv.gathered = patch.gathered;
  }

  async createAppointment(input: {
    leadId: string;
    contractorId: string;
    slotIso: string;
  }): Promise<{ id: string }> {
    const appt = { id: randomUUID(), ...input, status: "confirmed" };
    this.appointments.push(appt);
    return { id: appt.id };
  }

  async getActiveAppointmentByLead(leadId: string) {
    const appt = [...this.appointments]
      .reverse()
      .find((a) => a.leadId === leadId && (a.status === "confirmed" || a.status === "proposed"));
    return appt
      ? { id: appt.id, leadId: appt.leadId, contractorId: appt.contractorId, slotIso: appt.slotIso, status: appt.status }
      : null;
  }

  async updateAppointment(
    id: string,
    patch: import("./types.js").AppointmentPatch,
  ): Promise<void> {
    const appt = this.appointments.find((a) => a.id === id);
    if (!appt) return;
    if (patch.slotIso !== undefined) appt.slotIso = patch.slotIso;
    if (patch.status !== undefined) appt.status = patch.status;
    if (patch.rescheduledFromIso !== undefined) appt.rescheduledFromIso = patch.rescheduledFromIso;
    if (patch.cancelledAt !== undefined) appt.cancelledAt = patch.cancelledAt;
    if (patch.cancelReason !== undefined) appt.cancelReason = patch.cancelReason;
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
    return { id: esc.id, leadId: esc.leadId, contractorId: esc.contractorId, conversationId: esc.conversationId, question: esc.question, status: esc.status };
  }

  async findOpenEscalationByContractorReply(contractorId: string) {
    const esc = [...this.escalations].reverse().find((e) => e.contractorId === contractorId && e.status === "open");
    return esc
      ? { id: esc.id, leadId: esc.leadId, contractorId: esc.contractorId, conversationId: esc.conversationId, question: esc.question, status: esc.status }
      : null;
  }

  async resolveEscalation(id: string, answer: string): Promise<void> {
    const esc = this.escalations.find((e) => e.id === id);
    if (esc) {
      esc.answer = answer;
      esc.status = "resolved";
    }
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
