import type {
  OrganizationConfig,
  GatheredInfo,
  NotificationEventType,
  Stage,
  TimeRange,
} from "@leadanswered/core";

export interface LeadRecord {
  id: string;
  organizationId: string;
  contactName: string;
  contactPhone: string;
  projectHint: string | null;
  serviceTown: string | null;
  serviceZip: string | null;
  fullAddress: string | null;
  status: string;
  /** Intake channel ("manual" | "email" | "missed_call" | "inbound_sms" | "referral"). Selects the intake workflow (website vs missed-call). */
  source?: string;
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
  /** When the message was recorded (ISO). Used for conversation-recency checks. */
  createdAt?: string;
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
  organization: OrganizationConfig;
  conversation: ConversationRecord;
  messages: MessageRecord[];
}

export interface CreateLeadInput {
  organizationId: string;
  contactName: string;
  contactPhone: string;
  projectHint?: string | null;
  source?: string;
  /** Idempotency key for email intake (Postmark MessageID, or a synthesized hash). */
  sourceMessageId?: string | null;
}

export type LeadFieldPatch = Partial<
  Pick<LeadRecord, "contactName" | "projectHint" | "serviceTown" | "serviceZip" | "fullAddress" | "status">
>;

export interface AppointmentRecord {
  id: string;
  leadId: string;
  organizationId: string;
  startIso: string;
  endIso: string;
  status: string;
  /** IANA timezone the organization was in when booked (for correct display if their tz later changes). */
  timezone?: string;
  /** Calendar-sync mirror (for inbound reconcile + loop prevention). */
  externalEventId?: string | null;
  externalEtag?: string | null;
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

/** A calendar-sync mutation on an appointment — external ids/etag/state. NEVER inside a booking tx. */
export type AppointmentSyncPatch = Partial<{
  externalProvider: string;
  externalCalendarId: string;
  externalEventId: string | null;
  externalEtag: string | null;
  syncState: string;
  syncedAt: string; // ISO
}>;

/** A organization's connected external calendar (Google today). Tokens are stored ENCRYPTED at rest. */
export interface CalendarConnectionRecord {
  id: string;
  organizationId: string;
  provider: string;
  externalCalendarId: string | null;
  accessToken: string | null; // encrypted
  refreshToken: string | null; // encrypted
  tokenExpiresAt: string | null; // ISO
  status: string; // disconnected | connected | needs_reconnect
  scope: string | null;
  email: string | null;
  syncToken: string | null;
  channelId: string | null;
  resourceId: string | null;
  channelToken: string | null;
  channelExpiresAt: string | null; // ISO
}
export type CalendarConnectionPatch = Partial<Omit<CalendarConnectionRecord, "id" | "organizationId" | "provider">>;

export interface EscalationRecord {
  id: string;
  leadId: string;
  organizationId: string;
  conversationId: string;
  question: string;
  status: string;
}

/** Persistence port. Implemented by MemoryStore (demo/tests) and PrismaStore (production). */
export interface Store {
  getOrganization(id: string): Promise<OrganizationConfig | null>;
  getOrganizationByTwilioNumber(toNumber: string): Promise<OrganizationConfig | null>;
  /** Match a organization by their lead-email slug (leads+{slug}@…) — email intake (SCOPE §9). */
  getOrganizationBySlug(slug: string): Promise<OrganizationConfig | null>;
  getRecipients(organizationId: string): Promise<RecipientRecord[]>;
  createLeadWithConversation(input: CreateLeadInput): Promise<LeadContext>;
  /** Email idempotency — has a lead already been created from this email key? */
  findLeadBySourceMessageId(sourceMessageId: string): Promise<{ id: string } | null>;
  findActiveContextByPhones(toNumber: string, fromNumber: string): Promise<LeadContext | null>;
  /** Most recent lead+conversation for this organization+phone — dedupe at intake (one lead per contact). */
  findLeadContextByOrganizationPhone(organizationId: string, phone: string): Promise<LeadContext | null>;
  /** Fuzzy-search a organization's leads by contact name (organization "text {name}" commands). */
  findLeadsByName(organizationId: string, name: string): Promise<LeadRecord[]>;
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
    organizationId: string;
    startIso: string;
    endIso: string;
    timezone: string;
  }): Promise<BookOutcome>;
  /** Active (proposed/confirmed) appointments overlapping the window — for availability subtraction. */
  getBusyTimes(organizationId: string, window: { startIso: string; endIso: string }): Promise<TimeRange[]>;
  /** The lead's single active appointment (guaranteed ≤1 by the DB) — for reschedule/cancel. */
  getActiveAppointmentByLead(leadId: string): Promise<AppointmentRecord | null>;
  /** All appointments for a lead (history) — relationship memory for the prompt. */
  getAppointmentsByLead(leadId: string): Promise<AppointmentRecord[]>;
  /** Reschedule a specific appointment to a new slot, guarded against organization conflicts. */
  rescheduleAppointment(id: string, startIso: string, endIso: string): Promise<BookOutcome>;
  updateAppointment(id: string, patch: AppointmentPatch): Promise<void>;
  /** Fetch one appointment by id — the calendar-sync worker + the appointment-change handler use it. */
  getAppointmentById(id: string): Promise<AppointmentRecord | null>;
  /** Reverse-map a Google event id → our appointment, for inbound reconcile. */
  findAppointmentByExternalEventId(organizationId: string, externalEventId: string): Promise<AppointmentRecord | null>;
  /** Record the OUTBOUND-sync state of an appointment (external ids / etag / syncState). Never in a tx. */
  updateAppointmentSync(id: string, patch: AppointmentSyncPatch): Promise<void>;

  // --- Calendar connections (Google Calendar two-way sync) ---
  getCalendarConnection(organizationId: string, provider?: string): Promise<CalendarConnectionRecord | null>;
  /** Look up a connection by its Google push-channel id (webhook → which organization). */
  getCalendarConnectionByChannel(channelId: string): Promise<CalendarConnectionRecord | null>;
  /** All currently-connected calendars (worker polling / channel-renewal sweep). */
  listConnectedCalendars(): Promise<CalendarConnectionRecord[]>;
  upsertCalendarConnection(organizationId: string, provider: string, patch: CalendarConnectionPatch): Promise<CalendarConnectionRecord>;

  // --- Escalations (loop in the organization; relay their answer back) ---
  createEscalation(input: {
    leadId: string;
    organizationId: string;
    conversationId: string;
    question: string;
  }): Promise<EscalationRecord>;
  /** The most recent OPEN escalation for a organization — to match their reply. */
  findOpenEscalationByOwnerReply(organizationId: string): Promise<EscalationRecord | null>;
  /** The most recent OPEN escalation for a lead — to suppress nudges while they wait on the organization. */
  findOpenEscalationByLead(leadId: string): Promise<EscalationRecord | null>;
  /** Conditional resolve — true only if it actually flipped open→resolved (idempotent relay guard). */
  resolveEscalationIfOpen(id: string, answer: string): Promise<boolean>;
  /** Fetch an escalation by id — the SLA job checks whether it's still open. */
  getEscalation(id: string): Promise<EscalationRecord | null>;
  /** Conditional expire — true only if it flipped open→expired (idempotent). */
  expireEscalation(id: string): Promise<boolean>;
}
