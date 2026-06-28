import type {
  ContractorConfig,
  GatheredInfo,
  NotificationEventType,
  Stage,
  TimeRange,
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
  /** Idempotency key for email intake (Postmark MessageID, or a synthesized hash). */
  sourceMessageId?: string | null;
}

export type LeadFieldPatch = Partial<
  Pick<LeadRecord, "projectHint" | "serviceTown" | "serviceZip" | "fullAddress" | "status">
>;

export interface AppointmentRecord {
  id: string;
  leadId: string;
  contractorId: string;
  startIso: string;
  endIso: string;
  status: string;
}

export type AppointmentPatch = Partial<{
  startIso: string;
  endIso: string;
  status: string;
  rescheduledFromIso: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}>;

/** Result of a guarded booking. `slot_taken`/`lead_has_active` are DB-constraint outcomes, not errors. */
export type BookOutcome =
  | { ok: true; id: string; startIso: string; endIso: string }
  | { ok: false; reason: "slot_taken" | "lead_has_active" };

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
  /** Email idempotency — has a lead already been created from this email key? */
  findLeadBySourceMessageId(sourceMessageId: string): Promise<{ id: string } | null>;
  findActiveContextByPhones(toNumber: string, fromNumber: string): Promise<LeadContext | null>;
  getContextByLeadId(leadId: string): Promise<LeadContext | null>;

  // --- Concurrency & idempotency ---
  /** Serialize all turns for one conversation (in-process mutex; DB constraints guard cross-instance). */
  withConversationLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T>;
  /** Insert an inbound message; `inserted:false` if its providerSid already exists (idempotent skip). */
  appendInboundIdempotent(
    conversationId: string,
    msg: { body: string; providerSid?: string | null },
  ): Promise<{ inserted: boolean }>;
  appendMessage(
    conversationId: string,
    msg: { direction: "inbound" | "outbound"; body: string; providerSid?: string | null },
  ): Promise<MessageRecord>;
  /** Conditional transition — true only if a row actually moved from one of `from` to `to`. */
  transitionLeadStatus(leadId: string, from: string[], to: string): Promise<boolean>;

  updateLeadFields(leadId: string, patch: LeadFieldPatch): Promise<void>;
  updateConversation(
    conversationId: string,
    patch: { state?: Stage; gathered?: GatheredInfo },
  ): Promise<void>;

  // --- Booking (DB-constraint-guarded; no double-booking possible) ---
  /** Atomically insert the appointment + flip lead/conversation to booked. Conflicts → BookOutcome. */
  bookAppointment(input: {
    leadId: string;
    contractorId: string;
    startIso: string;
    endIso: string;
    timezone: string;
  }): Promise<BookOutcome>;
  /** Active (proposed/confirmed) appointments overlapping the window — for availability subtraction. */
  getBusyTimes(contractorId: string, window: { startIso: string; endIso: string }): Promise<TimeRange[]>;
  /** The lead's single active appointment (guaranteed ≤1 by the DB) — for reschedule/cancel. */
  getActiveAppointmentByLead(leadId: string): Promise<AppointmentRecord | null>;
  /** Reschedule a specific appointment to a new slot, guarded against contractor conflicts. */
  rescheduleAppointment(id: string, startIso: string, endIso: string): Promise<BookOutcome>;
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
  /** Conditional resolve — true only if it actually flipped open→resolved (idempotent relay guard). */
  resolveEscalationIfOpen(id: string, answer: string): Promise<boolean>;
}
