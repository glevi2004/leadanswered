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

// ─────────────────────────────────────────────────────────────────────────────
// Lu Computer — agent-backend entities (ADDITIVE). Records mirror the Prisma
// models in packages/db/prisma/schema.prisma (AGENTS-BACKEND.md §2). Every model
// is org-scoped via a scalar `orgId`. Enum-typed columns are surfaced as plain
// strings here (matching how LeadRecord.status / AppointmentRecord.status are
// modeled); JSON columns are typed as `unknown` / `Record<string, unknown>`.
// Timestamps are optional ISO strings (like MessageRecord.createdAt).
// ─────────────────────────────────────────────────────────────────────────────

/** A department (one of the 8) instantiated for an org. */
export interface DepartmentRecord {
  id: string;
  orgId: string;
  key: string;
  active: boolean;
  context: string;
  createdAt?: string;
  updatedAt?: string;
}
export type DepartmentPatch = Partial<{ active: boolean; context: string }>;

/** A hired agent. `contract` = its CONTRACT.md identity file; `models` = model ids. */
export interface AgentRecord {
  id: string;
  orgId: string;
  departmentKey: string;
  name: string;
  role: string;
  contract: string;
  models: Record<string, unknown>;
  status: string; // idle | working
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateAgentInput {
  orgId: string;
  departmentKey: string;
  name: string;
  role: string;
  contract?: string;
  models?: Record<string, unknown>;
  status?: string;
}
export type AgentPatch = Partial<{
  departmentKey: string;
  name: string;
  role: string;
  contract: string;
  models: Record<string, unknown>;
  status: string;
}>;

/** A unit of work. Roadmap steps ARE tasks (ordering + needs_earlier). */
export interface TaskRecord {
  id: string;
  orgId: string;
  departmentKey: string;
  agentId: string | null;
  title: string;
  body: string;
  status: string;
  parentTaskId: string | null;
  input: unknown | null;
  result: unknown | null;
  model: string | null;
  assignedBy: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateTaskInput {
  orgId: string;
  departmentKey: string;
  agentId?: string | null;
  title: string;
  body?: string;
  status?: string;
  parentTaskId?: string | null;
  input?: unknown;
  result?: unknown;
  model?: string | null;
  assignedBy: string;
}
export type TaskPatch = Partial<{
  departmentKey: string;
  agentId: string | null;
  title: string;
  body: string;
  status: string;
  parentTaskId: string | null;
  input: unknown;
  result: unknown;
  model: string | null;
  assignedBy: string;
}>;
export interface TaskFilter {
  departmentKey?: string;
  status?: string;
}

/** An output produced by a task/agent — powers the ArtifactsNav. */
export interface ArtifactRecord {
  id: string;
  orgId: string;
  taskId: string | null;
  agentId: string | null;
  kind: string;
  title: string;
  payload: unknown;
  createdAt?: string;
}
export interface AddArtifactInput {
  orgId: string;
  taskId?: string | null;
  agentId?: string | null;
  kind: string;
  title: string;
  payload?: unknown;
}
/** List artifacts by task (`taskId`) or by org (`orgId`); both may be combined. */
export interface ArtifactFilter {
  taskId?: string;
  orgId?: string;
}

/** A customer / dogfood website. Domain default = {slug}.lu.computer. */
export interface SiteRecord {
  id: string;
  orgId: string;
  departmentKey: string | null;
  repoFullName: string | null;
  vercelProjectId: string | null;
  domain: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateSiteInput {
  orgId: string;
  departmentKey?: string | null;
  repoFullName?: string | null;
  vercelProjectId?: string | null;
  domain?: string | null;
  status?: string;
}
export type SitePatch = Partial<{
  departmentKey: string | null;
  repoFullName: string | null;
  vercelProjectId: string | null;
  domain: string | null;
  status: string;
}>;

/** A preview / production deploy of a Site. */
export interface DeploymentRecord {
  id: string;
  siteId: string;
  env: string;
  url: string;
  sha: string | null;
  prNumber: number | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface AddDeploymentInput {
  siteId: string;
  env: string;
  url: string;
  sha?: string | null;
  prNumber?: number | null;
  status?: string;
}

/** A sandbox / terminal coding session (CANVAS-TOOLS §4). */
export interface SessionRecord {
  id: string;
  orgId: string;
  sandboxId: string | null;
  agentKind: string;
  repo: string | null;
  status: string;
  transcript: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateSessionInput {
  orgId: string;
  agentKind: string;
  sandboxId?: string | null;
  repo?: string | null;
  status?: string;
  transcript?: string | null;
}
export type SessionPatch = Partial<{
  sandboxId: string | null;
  repo: string | null;
  status: string;
  transcript: string | null;
}>;

/** Generalized human-in-the-loop gate (extends the SMS hard-gate). Feeds "Needs you". */
export interface ApprovalRecord {
  id: string;
  orgId: string;
  taskId: string | null;
  action: string;
  status: string;
  decidedBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateApprovalInput {
  orgId: string;
  taskId?: string | null;
  action: string;
}

/** A user-created element on the canvas plane (CANVAS-TOOLS §1). */
export interface CanvasNodeRecord {
  id: string;
  orgId: string;
  type: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  refId: string | null;
  z: number | null;
  createdBy: string | null;
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateCanvasNodeInput {
  orgId: string;
  type: string;
  x: number;
  y: number;
  w?: number | null;
  h?: number | null;
  refId?: string | null;
  z?: number | null;
  createdBy?: string | null;
}
export type CanvasNodePatch = Partial<{
  type: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  refId: string | null;
  z: number | null;
}>;

/** A directed connection between canvas nodes / agents — owns | reads | produces. */
export interface EdgeRecord {
  id: string;
  orgId: string;
  fromId: string;
  toId: string;
  kind: string;
  createdAt?: string;
}
export interface CreateEdgeInput {
  orgId: string;
  fromId: string;
  toId: string;
  kind: string;
}

/** A folder / library — an agent's knowledge + asset store (CANVAS-TOOLS §6). */
export interface CollectionRecord {
  id: string;
  orgId: string;
  agentId: string | null;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface CreateCollectionInput {
  orgId: string;
  agentId?: string | null;
  name: string;
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

  // ─── Lu Computer agent backend (AGENTS-BACKEND.md §2/§3) ───────────────────

  // --- Agents & Departments ---
  createAgent(input: CreateAgentInput): Promise<AgentRecord>;
  getAgent(id: string): Promise<AgentRecord | null>;
  listAgents(orgId: string): Promise<AgentRecord[]>;
  updateAgent(id: string, patch: AgentPatch): Promise<AgentRecord>;
  /** Replace an agent's contract AND append a ContractRevision (diff/revert history, §5a). */
  updateAgentContract(id: string, content: string): Promise<AgentRecord>;
  listDepartments(orgId: string): Promise<DepartmentRecord[]>;
  /** Create-or-update the (orgId, key) department — its `active` flag + `context`. */
  upsertDepartment(orgId: string, key: string, patch: DepartmentPatch): Promise<DepartmentRecord>;

  // --- Tasks ---
  createTask(input: CreateTaskInput): Promise<TaskRecord>;
  getTask(id: string): Promise<TaskRecord | null>;
  listTasks(orgId: string, filter?: TaskFilter): Promise<TaskRecord[]>;
  updateTaskStatus(id: string, status: string): Promise<TaskRecord>;
  updateTask(id: string, patch: TaskPatch): Promise<TaskRecord>;

  // --- Artifacts ---
  addArtifact(input: AddArtifactInput): Promise<ArtifactRecord>;
  listArtifacts(filter: ArtifactFilter): Promise<ArtifactRecord[]>;

  // --- Sites & Deployments ---
  createSite(input: CreateSiteInput): Promise<SiteRecord>;
  getSite(id: string): Promise<SiteRecord | null>;
  updateSite(id: string, patch: SitePatch): Promise<SiteRecord>;
  addDeployment(input: AddDeploymentInput): Promise<DeploymentRecord>;
  listDeployments(siteId: string): Promise<DeploymentRecord[]>;

  // --- Sessions ---
  createSession(input: CreateSessionInput): Promise<SessionRecord>;
  getSession(id: string): Promise<SessionRecord | null>;
  updateSession(id: string, patch: SessionPatch): Promise<SessionRecord>;

  // --- Approvals ---
  createApproval(input: CreateApprovalInput): Promise<ApprovalRecord>;
  /** Resolve a pending approval → approved | rejected (records `decidedBy`). */
  resolveApproval(id: string, decision: string, decidedBy?: string | null): Promise<ApprovalRecord>;
  listPendingApprovals(orgId: string): Promise<ApprovalRecord[]>;

  // --- Canvas (nodes / edges / collections) ---
  createCanvasNode(input: CreateCanvasNodeInput): Promise<CanvasNodeRecord>;
  listCanvasNodes(orgId: string): Promise<CanvasNodeRecord[]>;
  updateCanvasNode(id: string, patch: CanvasNodePatch): Promise<CanvasNodeRecord>;
  deleteCanvasNode(id: string): Promise<void>;
  createEdge(input: CreateEdgeInput): Promise<EdgeRecord>;
  listEdges(orgId: string): Promise<EdgeRecord[]>;
  deleteEdge(id: string): Promise<void>;
  createCollection(input: CreateCollectionInput): Promise<CollectionRecord>;
  listCollections(orgId: string): Promise<CollectionRecord[]>;
}
