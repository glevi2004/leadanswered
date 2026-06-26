import type {
  ContractorConfig,
  GatheredInfo,
  NotificationEventType,
  Stage,
} from "@leadanswered/core";

export interface LeadRecord {
  id: string;
  contractorId: string;
  contactName: string;
  contactPhone: string;
  projectHint: string | null;
  serviceTown: string | null;
  serviceZip: string | null;
  fullAddress: string | null;
  status: string;
}

export interface ConversationRecord {
  id: string;
  leadId: string;
  state: Stage;
  gathered: GatheredInfo;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  body: string;
  providerSid: string | null;
}

export interface RecipientRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  subscriptions: {
    eventType: NotificationEventType;
    channels: "sms" | "email" | "both";
  }[];
}

export interface LeadContext {
  lead: LeadRecord;
  contractor: ContractorConfig;
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

export interface CreateLeadInput {
  contractorId: string;
  contactName: string;
  contactPhone: string;
  projectHint?: string | null;
  source?: string;
  /** Idempotency key for email intake (Postmark MessageID). */
  sourceMessageId?: string | null;
}

export type LeadFieldPatch = Partial<
  Pick<LeadRecord, "projectHint" | "serviceTown" | "serviceZip" | "fullAddress" | "status">
>;

export interface AppointmentRecord {
  id: string;
  leadId: string;
  contractorId: string;
  slotIso: string;
  status: string;
}

export type AppointmentPatch = Partial<{
  slotIso: string;
  status: string;
  rescheduledFromIso: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}>;

export interface EscalationRecord {
  id: string;
  leadId: string;
  contractorId: string;
  conversationId: string;
  question: string;
  status: string;
}

/** Persistence port. Implemented by MemoryStore (demo/tests) and PrismaStore (production). */
export interface Store {
  getContractor(id: string): Promise<ContractorConfig | null>;
  getContractorByTwilioNumber(toNumber: string): Promise<ContractorConfig | null>;
  /** Match a contractor by their lead-email slug (leads+{slug}@…) — email intake (SCOPE §9). */
  getContractorBySlug(slug: string): Promise<ContractorConfig | null>;
  getRecipients(contractorId: string): Promise<RecipientRecord[]>;
  createLeadWithConversation(input: CreateLeadInput): Promise<LeadContext>;
  /** Email idempotency — has a lead already been created from this email MessageID? */
  findLeadBySourceMessageId(sourceMessageId: string): Promise<{ id: string } | null>;
  findActiveContextByPhones(
    toNumber: string,
    fromNumber: string,
  ): Promise<LeadContext | null>;
  getContextByLeadId(leadId: string): Promise<LeadContext | null>;
  messageExistsByProviderSid(sid: string): Promise<boolean>;
  appendMessage(
    conversationId: string,
    msg: { direction: "inbound" | "outbound"; body: string; providerSid?: string | null },
  ): Promise<MessageRecord>;
  updateLeadFields(leadId: string, patch: LeadFieldPatch): Promise<void>;
  updateConversation(
    conversationId: string,
    patch: { state?: Stage; gathered?: GatheredInfo },
  ): Promise<void>;
  createAppointment(input: {
    leadId: string;
    contractorId: string;
    slotIso: string;
  }): Promise<{ id: string }>;
  /** The lead's current bookable appointment (confirmed, not cancelled) — for reschedule/cancel. */
  getActiveAppointmentByLead(leadId: string): Promise<AppointmentRecord | null>;
  updateAppointment(id: string, patch: AppointmentPatch): Promise<void>;
  // --- Escalations (loop in the contractor; relay their answer back) ---
  createEscalation(input: {
    leadId: string;
    contractorId: string;
    conversationId: string;
    question: string;
  }): Promise<EscalationRecord>;
  /** The most recent OPEN escalation for a contractor — to match their reply. */
  findOpenEscalationByContractorReply(contractorId: string): Promise<EscalationRecord | null>;
  resolveEscalation(id: string, answer: string): Promise<void>;
}
