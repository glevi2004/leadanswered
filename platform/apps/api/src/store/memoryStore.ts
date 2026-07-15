import { randomUUID } from "node:crypto";
import type { OrganizationConfig, GatheredInfo, Stage, TimeRange } from "@leadanswered/core";
import { createConversationLock } from "./conversationLock.js";
import type {
  AddArtifactInput,
  AddDeploymentInput,
  AgentPatch,
  AgentRecord,
  AppointmentPatch,
  AppointmentSyncPatch,
  ApprovalRecord,
  ArtifactFilter,
  ArtifactRecord,
  CalendarConnectionPatch,
  CalendarConnectionRecord,
  CanvasNodePatch,
  CanvasNodeRecord,
  CollectionRecord,
  AppointmentRecord,
  BookOutcome,
  ConversationRecord,
  CreateAgentInput,
  CreateApprovalInput,
  CreateCanvasNodeInput,
  CreateCollectionInput,
  CreateEdgeInput,
  CreateDepartmentInput,
  CreateLeadInput,
  CreateSessionInput,
  CreateSiteInput,
  CreateTaskInput,
  DepartmentPatch,
  DepartmentRecord,
  DepartmentWithAgent,
  DeploymentRecord,
  EdgeRecord,
  LeadContext,
  LeadFieldPatch,
  LeadRecord,
  MessageRecord,
  RecipientRecord,
  SessionPatch,
  SessionRecord,
  SitePatch,
  SiteRecord,
  Store,
  TaskFilter,
  TaskPatch,
  TaskRecord,
} from "./types.js";

type ApptRow = {
  id: string;
  leadId: string;
  organizationId: string;
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
    organizationId: a.organizationId,
    startIso: a.startIso,
    endIso: a.endIso,
    status: a.status,
    externalEventId: a.externalEventId ?? null,
    externalEtag: a.externalEtag ?? null,
  };
}

/**
 * In-memory Store for demo mode + tests. It MIMICS the DB integrity constraints
 * (no overlapping active appointment per organization; one active per lead) so logic
 * tests behave like prod — but it cannot PROVE them under real concurrency. The
 * race-proof guarantee is the Postgres EXCLUDE constraint, exercised by Tier-B tests.
 */
export class MemoryStore implements Store {
  private organizations = new Map<string, OrganizationConfig>();
  private recipients = new Map<string, RecipientRecord[]>();
  private leads = new Map<string, LeadRecord>();
  private conversations = new Map<string, ConversationRecord>();
  private convIdByLead = new Map<string, string>();
  private messages: MessageRecord[] = [];
  private appointments: ApptRow[] = [];
  private calendarConnections = new Map<string, CalendarConnectionRecord>();
  private leadIdBySourceMessageId = new Map<string, string>();
  // Lu Computer agent-backend entities — Maps keyed by id (AGENTS-BACKEND.md §2/§3).
  private departments = new Map<string, DepartmentRecord>();
  private agents = new Map<string, AgentRecord>();
  private contractRevisions: { id: string; agentId: string; content: string; createdAt: string }[] = [];
  private tasks = new Map<string, TaskRecord>();
  private artifacts = new Map<string, ArtifactRecord>();
  private sites = new Map<string, SiteRecord>();
  private deployments = new Map<string, DeploymentRecord>();
  private sessions = new Map<string, SessionRecord>();
  private approvals = new Map<string, ApprovalRecord>();
  private canvasNodes = new Map<string, CanvasNodeRecord>();
  private edges = new Map<string, EdgeRecord>();
  private collections = new Map<string, CollectionRecord>();
  private lock = createConversationLock();
  private now: () => Date;

  /** Optional injected clock so tests can control message timestamps (recency checks). */
  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  seedOrganization(c: OrganizationConfig, recipients: RecipientRecord[] = []): void {
    this.organizations.set(c.id, c);
    this.recipients.set(c.id, recipients);
  }

  withConversationLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T> {
    return this.lock(conversationId, fn);
  }

  async getOrganization(id: string): Promise<OrganizationConfig | null> {
    return this.organizations.get(id) ?? null;
  }

  async getOrganizationByTwilioNumber(toNumber: string): Promise<OrganizationConfig | null> {
    for (const c of this.organizations.values()) if (c.twilioNumber === toNumber) return c;
    return null;
  }

  async getOrganizationBySlug(slug: string): Promise<OrganizationConfig | null> {
    for (const c of this.organizations.values()) if (c.slug === slug) return c;
    return null;
  }

  async findLeadBySourceMessageId(sourceMessageId: string): Promise<{ id: string } | null> {
    const id = this.leadIdBySourceMessageId.get(sourceMessageId);
    return id ? { id } : null;
  }

  async getRecipients(organizationId: string): Promise<RecipientRecord[]> {
    return this.recipients.get(organizationId) ?? [];
  }

  async createLeadWithConversation(input: CreateLeadInput): Promise<LeadContext> {
    const organization = this.organizations.get(input.organizationId);
    if (!organization) throw new Error(`unknown organization ${input.organizationId}`);
    if (input.sourceMessageId && this.leadIdBySourceMessageId.has(input.sourceMessageId)) {
      const err: any = new Error("duplicate sourceMessageId");
      err.code = "P2002";
      throw err;
    }

    const lead: LeadRecord = {
      id: randomUUID(),
      organizationId: input.organizationId,
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

    return { lead, organization, conversation: conv, messages: [] };
  }

  private contextFor(conv: ConversationRecord): LeadContext | null {
    const lead = this.leads.get(conv.leadId);
    if (!lead) return null;
    const organization = this.organizations.get(lead.organizationId);
    if (!organization) return null;
    const messages = this.messages.filter((m) => m.conversationId === conv.id);
    return { lead, organization, conversation: conv, messages };
  }

  async findActiveContextByPhones(toNumber: string, fromNumber: string): Promise<LeadContext | null> {
    let organizationId: string | null = null;
    for (const c of this.organizations.values()) {
      if (c.twilioNumber === toNumber) {
        organizationId = c.id;
        break;
      }
    }
    if (!organizationId) return null;
    const candidates = [...this.leads.values()].filter(
      (l) => l.organizationId === organizationId && l.contactPhone === fromNumber,
    );
    for (const lead of candidates.reverse()) {
      const convId = this.convIdByLead.get(lead.id);
      const conv = convId ? this.conversations.get(convId) : undefined;
      if (conv) return this.contextFor(conv); // any state — disqualified/terminal follow-ups still handled
    }
    return null;
  }

  async findLeadContextByOrganizationPhone(organizationId: string, phone: string): Promise<LeadContext | null> {
    const candidates = [...this.leads.values()].filter(
      (l) => l.organizationId === organizationId && l.contactPhone === phone,
    );
    for (const lead of candidates.reverse()) {
      const convId = this.convIdByLead.get(lead.id);
      const conv = convId ? this.conversations.get(convId) : undefined;
      if (conv) return this.contextFor(conv);
    }
    return null;
  }

  async findLeadsByName(organizationId: string, name: string): Promise<LeadRecord[]> {
    const q = name.trim().toLowerCase();
    if (!q) return [];
    return [...this.leads.values()]
      .filter((l) => l.organizationId === organizationId && l.contactName.toLowerCase().includes(q))
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
    organizationId: string;
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
        (a) => a.organizationId === input.organizationId && isActive(a.status) && overlaps(a.startIso, a.endIso, start, end),
      )
    ) {
      return { ok: false, reason: "slot_taken" };
    }
    const appt: ApptRow = {
      id: randomUUID(),
      leadId: input.leadId,
      organizationId: input.organizationId,
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
    organizationId: string,
    window: { startIso: string; endIso: string },
  ): Promise<TimeRange[]> {
    const ws = new Date(window.startIso).getTime();
    const we = new Date(window.endIso).getTime();
    return this.appointments
      .filter((a) => a.organizationId === organizationId && isActive(a.status) && overlaps(a.startIso, a.endIso, ws, we))
      .map((a) => ({ startAt: new Date(a.startIso), endAt: new Date(a.endIso) }));
  }

  async getActiveAppointmentByLead(leadId: string): Promise<AppointmentRecord | null> {
    const appt = [...this.appointments].reverse().find((a) => a.leadId === leadId && isActive(a.status));
    return appt
      ? {
          id: appt.id,
          leadId: appt.leadId,
          organizationId: appt.organizationId,
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
        organizationId: a.organizationId,
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
          a.id !== id && a.organizationId === appt.organizationId && isActive(a.status) && overlaps(a.startIso, a.endIso, start, end),
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

  async findAppointmentByExternalEventId(organizationId: string, externalEventId: string): Promise<AppointmentRecord | null> {
    const a = this.appointments.find((x) => x.organizationId === organizationId && x.externalEventId === externalEventId);
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

  async getCalendarConnection(organizationId: string, provider = "google"): Promise<CalendarConnectionRecord | null> {
    return this.calendarConnections.get(`${organizationId}:${provider}`) ?? null;
  }

  async getCalendarConnectionByChannel(channelId: string): Promise<CalendarConnectionRecord | null> {
    return [...this.calendarConnections.values()].find((c) => c.channelId === channelId) ?? null;
  }

  async listConnectedCalendars(): Promise<CalendarConnectionRecord[]> {
    return [...this.calendarConnections.values()].filter((c) => c.status === "connected");
  }

  async upsertCalendarConnection(
    organizationId: string,
    provider: string,
    patch: CalendarConnectionPatch,
  ): Promise<CalendarConnectionRecord> {
    const key = `${organizationId}:${provider}`;
    const merged: CalendarConnectionRecord = this.calendarConnections.get(key) ?? {
      id: randomUUID(),
      organizationId,
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
    organizationId: string;
    conversationId: string;
    question: string;
    answer?: string | null;
    status: string;
  }[] = [];

  async createEscalation(input: {
    leadId: string;
    organizationId: string;
    conversationId: string;
    question: string;
  }) {
    const esc = { id: randomUUID(), ...input, status: "open" };
    this.escalations.push(esc);
    return {
      id: esc.id,
      leadId: esc.leadId,
      organizationId: esc.organizationId,
      conversationId: esc.conversationId,
      question: esc.question,
      status: esc.status,
    };
  }

  async findOpenEscalationByOwnerReply(organizationId: string) {
    const esc = [...this.escalations].reverse().find((e) => e.organizationId === organizationId && e.status === "open");
    return esc
      ? {
          id: esc.id,
          leadId: esc.leadId,
          organizationId: esc.organizationId,
          conversationId: esc.conversationId,
          question: esc.question,
          status: esc.status,
        }
      : null;
  }

  async findOpenEscalationByLead(leadId: string) {
    const esc = [...this.escalations].reverse().find((e) => e.leadId === leadId && e.status === "open");
    return esc
      ? { id: esc.id, leadId: esc.leadId, organizationId: esc.organizationId, conversationId: esc.conversationId, question: esc.question, status: esc.status }
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
      ? { id: e.id, leadId: e.leadId, organizationId: e.organizationId, conversationId: e.conversationId, question: e.question, status: e.status }
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

  // ─── Lu Computer agent backend (AGENTS-BACKEND.md §2/§3) ───────────────────
  // Behaviorally mirrors PrismaStore: create → row, update → the mutated row
  // (throws on unknown id, like Prisma's .update()), list → filtered array.

  private mustGet<T>(map: Map<string, T>, id: string, kind: string): T {
    const v = map.get(id);
    if (!v) throw new Error(`${kind} ${id} not found`);
    return v;
  }

  // --- Agents & Departments ---
  async createAgent(input: CreateAgentInput): Promise<AgentRecord> {
    const ts = this.now().toISOString();
    const rec: AgentRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      departmentKey: input.departmentKey,
      name: input.name,
      role: input.role,
      contract: input.contract ?? "",
      models: input.models ?? {},
      status: input.status ?? "idle",
      createdAt: ts,
      updatedAt: ts,
    };
    this.agents.set(rec.id, rec);
    return rec;
  }

  async getAgent(id: string): Promise<AgentRecord | null> {
    return this.agents.get(id) ?? null;
  }

  async listAgents(orgId: string): Promise<AgentRecord[]> {
    return [...this.agents.values()].filter((a) => a.orgId === orgId);
  }

  async getAgentByDepartment(orgId: string, departmentKey: string): Promise<AgentRecord | null> {
    return (
      [...this.agents.values()].find((a) => a.orgId === orgId && a.departmentKey === departmentKey) ?? null
    );
  }

  async updateAgent(id: string, patch: AgentPatch): Promise<AgentRecord> {
    const a = this.mustGet(this.agents, id, "agent");
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (a as any)[k] = v;
    a.updatedAt = this.now().toISOString();
    return a;
  }

  async updateAgentContract(id: string, content: string): Promise<AgentRecord> {
    const a = this.mustGet(this.agents, id, "agent");
    this.contractRevisions.push({ id: randomUUID(), agentId: id, content, createdAt: this.now().toISOString() });
    a.contract = content;
    a.updatedAt = this.now().toISOString();
    return a;
  }

  async createDepartment(input: CreateDepartmentInput): Promise<DepartmentRecord> {
    const ts = this.now().toISOString();
    const rec: DepartmentRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      key: input.key,
      status: input.status,
      context: input.context ?? "",
      createdAt: ts,
      updatedAt: ts,
    };
    this.departments.set(rec.id, rec);
    return rec;
  }

  async listDepartments(orgId: string): Promise<DepartmentWithAgent[]> {
    return [...this.departments.values()]
      .filter((d) => d.orgId === orgId)
      .map((d) => ({
        ...d,
        agent:
          [...this.agents.values()].find((a) => a.orgId === orgId && a.departmentKey === d.key) ?? null,
      }));
  }

  async upsertDepartment(orgId: string, key: string, patch: DepartmentPatch): Promise<DepartmentRecord> {
    const existing = [...this.departments.values()].find((d) => d.orgId === orgId && d.key === key);
    if (existing) {
      if (patch.status !== undefined) existing.status = patch.status;
      if (patch.context !== undefined) existing.context = patch.context;
      existing.updatedAt = this.now().toISOString();
      return existing;
    }
    const ts = this.now().toISOString();
    const rec: DepartmentRecord = {
      id: randomUUID(),
      orgId,
      key,
      status: patch.status ?? "in_development",
      context: patch.context ?? "",
      createdAt: ts,
      updatedAt: ts,
    };
    this.departments.set(rec.id, rec);
    return rec;
  }

  // --- Tasks ---
  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const ts = this.now().toISOString();
    const rec: TaskRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      departmentKey: input.departmentKey,
      agentId: input.agentId ?? null,
      title: input.title,
      body: input.body ?? "",
      status: input.status ?? "agent_can_do",
      parentTaskId: input.parentTaskId ?? null,
      input: input.input ?? null,
      result: input.result ?? null,
      model: input.model ?? null,
      assignedBy: input.assignedBy,
      createdAt: ts,
      updatedAt: ts,
    };
    this.tasks.set(rec.id, rec);
    return rec;
  }

  async getTask(id: string): Promise<TaskRecord | null> {
    return this.tasks.get(id) ?? null;
  }

  async listTasks(orgId: string, filter?: TaskFilter): Promise<TaskRecord[]> {
    return [...this.tasks.values()].filter(
      (t) =>
        t.orgId === orgId &&
        (filter?.departmentKey === undefined || t.departmentKey === filter.departmentKey) &&
        (filter?.status === undefined || t.status === filter.status),
    );
  }

  async updateTaskStatus(id: string, status: string): Promise<TaskRecord> {
    const t = this.mustGet(this.tasks, id, "task");
    t.status = status;
    t.updatedAt = this.now().toISOString();
    return t;
  }

  async updateTask(id: string, patch: TaskPatch): Promise<TaskRecord> {
    const t = this.mustGet(this.tasks, id, "task");
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (t as any)[k] = v;
    t.updatedAt = this.now().toISOString();
    return t;
  }

  // --- Artifacts ---
  async addArtifact(input: AddArtifactInput): Promise<ArtifactRecord> {
    const rec: ArtifactRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      taskId: input.taskId ?? null,
      agentId: input.agentId ?? null,
      kind: input.kind,
      title: input.title,
      payload: input.payload ?? {},
      createdAt: this.now().toISOString(),
    };
    this.artifacts.set(rec.id, rec);
    return rec;
  }

  async listArtifacts(filter: ArtifactFilter): Promise<ArtifactRecord[]> {
    return [...this.artifacts.values()].filter(
      (a) =>
        (filter.taskId === undefined || a.taskId === filter.taskId) &&
        (filter.orgId === undefined || a.orgId === filter.orgId),
    );
  }

  // --- Sites & Deployments ---
  async createSite(input: CreateSiteInput): Promise<SiteRecord> {
    const ts = this.now().toISOString();
    const rec: SiteRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      departmentKey: input.departmentKey ?? null,
      repoFullName: input.repoFullName ?? null,
      vercelProjectId: input.vercelProjectId ?? null,
      domain: input.domain ?? null,
      status: input.status ?? "draft",
      createdAt: ts,
      updatedAt: ts,
    };
    this.sites.set(rec.id, rec);
    return rec;
  }

  async getSite(id: string): Promise<SiteRecord | null> {
    return this.sites.get(id) ?? null;
  }

  async updateSite(id: string, patch: SitePatch): Promise<SiteRecord> {
    const s = this.mustGet(this.sites, id, "site");
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (s as any)[k] = v;
    s.updatedAt = this.now().toISOString();
    return s;
  }

  async addDeployment(input: AddDeploymentInput): Promise<DeploymentRecord> {
    const ts = this.now().toISOString();
    const rec: DeploymentRecord = {
      id: randomUUID(),
      siteId: input.siteId,
      env: input.env,
      url: input.url,
      sha: input.sha ?? null,
      prNumber: input.prNumber ?? null,
      status: input.status ?? "queued",
      createdAt: ts,
      updatedAt: ts,
    };
    this.deployments.set(rec.id, rec);
    return rec;
  }

  async listDeployments(siteId: string): Promise<DeploymentRecord[]> {
    return [...this.deployments.values()].filter((d) => d.siteId === siteId);
  }

  // --- Sessions ---
  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const ts = this.now().toISOString();
    const rec: SessionRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      sandboxId: input.sandboxId ?? null,
      agentKind: input.agentKind,
      repo: input.repo ?? null,
      status: input.status ?? "starting",
      transcript: input.transcript ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.sessions.set(rec.id, rec);
    return rec;
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    return this.sessions.get(id) ?? null;
  }

  async updateSession(id: string, patch: SessionPatch): Promise<SessionRecord> {
    const s = this.mustGet(this.sessions, id, "session");
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (s as any)[k] = v;
    s.updatedAt = this.now().toISOString();
    return s;
  }

  // --- Approvals ---
  async createApproval(input: CreateApprovalInput): Promise<ApprovalRecord> {
    const ts = this.now().toISOString();
    const rec: ApprovalRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      taskId: input.taskId ?? null,
      action: input.action,
      status: "pending",
      decidedBy: null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.approvals.set(rec.id, rec);
    return rec;
  }

  async resolveApproval(id: string, decision: string, decidedBy?: string | null): Promise<ApprovalRecord> {
    const a = this.mustGet(this.approvals, id, "approval");
    a.status = decision;
    a.decidedBy = decidedBy ?? null;
    a.updatedAt = this.now().toISOString();
    return a;
  }

  async listPendingApprovals(orgId: string): Promise<ApprovalRecord[]> {
    return [...this.approvals.values()].filter((a) => a.orgId === orgId && a.status === "pending");
  }

  // --- Canvas (nodes / edges / collections) ---
  async createCanvasNode(input: CreateCanvasNodeInput): Promise<CanvasNodeRecord> {
    const ts = this.now().toISOString();
    const rec: CanvasNodeRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      type: input.type,
      x: input.x,
      y: input.y,
      w: input.w ?? null,
      h: input.h ?? null,
      refId: input.refId ?? null,
      z: input.z ?? null,
      createdBy: input.createdBy ?? null,
      createdAt: ts,
      updatedAt: ts,
    };
    this.canvasNodes.set(rec.id, rec);
    return rec;
  }

  async listCanvasNodes(orgId: string): Promise<CanvasNodeRecord[]> {
    return [...this.canvasNodes.values()].filter((n) => n.orgId === orgId);
  }

  async updateCanvasNode(id: string, patch: CanvasNodePatch): Promise<CanvasNodeRecord> {
    const n = this.mustGet(this.canvasNodes, id, "canvasNode");
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) (n as any)[k] = v;
    n.updatedAt = this.now().toISOString();
    return n;
  }

  async deleteCanvasNode(id: string): Promise<void> {
    this.canvasNodes.delete(id);
  }

  async createEdge(input: CreateEdgeInput): Promise<EdgeRecord> {
    const rec: EdgeRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      fromId: input.fromId,
      toId: input.toId,
      kind: input.kind,
      createdAt: this.now().toISOString(),
    };
    this.edges.set(rec.id, rec);
    return rec;
  }

  async listEdges(orgId: string): Promise<EdgeRecord[]> {
    return [...this.edges.values()].filter((e) => e.orgId === orgId);
  }

  async deleteEdge(id: string): Promise<void> {
    this.edges.delete(id);
  }

  async createCollection(input: CreateCollectionInput): Promise<CollectionRecord> {
    const ts = this.now().toISOString();
    const rec: CollectionRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      agentId: input.agentId ?? null,
      name: input.name,
      createdAt: ts,
      updatedAt: ts,
    };
    this.collections.set(rec.id, rec);
    return rec;
  }

  async listCollections(orgId: string): Promise<CollectionRecord[]> {
    return [...this.collections.values()].filter((c) => c.orgId === orgId);
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
