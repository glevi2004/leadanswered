import { getPrisma } from "@leadanswered/db";
import { DEFAULT_TIMEZONE } from "@leadanswered/core";
import type {
  OrganizationConfig,
  GatheredInfo,
  NotificationEventType,
  Stage,
  TimeRange,
} from "@leadanswered/core";
import { createConversationLock } from "./conversationLock.js";
import type {
  AddArtifactInput,
  AddDeploymentInput,
  AgentPatch,
  AgentRecord,
  AppointmentPatch,
  AppointmentRecord,
  AppointmentSyncPatch,
  ApprovalRecord,
  ArtifactFilter,
  ArtifactRecord,
  BookOutcome,
  CalendarConnectionPatch,
  CalendarConnectionRecord,
  CanvasNodePatch,
  CanvasNodeRecord,
  CollectionRecord,
  ConversationRecord,
  CreateAgentInput,
  CreateApprovalInput,
  CreateCanvasNodeInput,
  CreateCollectionInput,
  CreateEdgeInput,
  CreateLeadInput,
  CreateDepartmentInput,
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

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToOrganization(r: any): OrganizationConfig {
  return {
    id: r.id,
    name: r.name,
    companyName: r.companyName,
    sarahName: r.sarahName,
    personaNotes: r.sarahPersonaNotes,
    projectTypes: r.projectTypes,
    serviceArea: {
      baseLocations: (r.baseLocations as any) ?? [],
      includeOverrides: r.includeOverrides,
      excludeOverrides: r.excludeOverrides,
    },
    qualificationRules: (r.qualificationRules as any) ?? {},
    standingAvailability: (r.standingAvailability as any) ?? { timezone: DEFAULT_TIMEZONE, windows: [] },
    twilioNumber: r.twilioNumber,
    slug: r.slug ?? null,
    escalationTopics: r.escalationTopics?.length ? r.escalationTopics : null,
  };
}

function mapLead(l: any): LeadRecord {
  return {
    id: l.id,
    organizationId: l.organizationId,
    contactName: l.contactName,
    contactPhone: l.contactPhone,
    projectHint: l.projectHint,
    serviceTown: l.serviceTown,
    serviceZip: l.serviceZip,
    fullAddress: l.fullAddress,
    status: l.status,
    source: l.source,
  };
}

function mapConv(c: any): ConversationRecord {
  return { id: c.id, leadId: c.leadId, state: c.state as Stage, gathered: (c.gathered as GatheredInfo) ?? {} };
}

function mapMsg(m: any): MessageRecord {
  return {
    id: m.id,
    conversationId: m.conversationId,
    direction: m.direction,
    body: m.body,
    providerSid: m.providerSid,
    createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
  };
}

function mapAppt(a: any): AppointmentRecord {
  return {
    id: a.id,
    leadId: a.leadId,
    organizationId: a.organizationId,
    startIso: a.startAt.toISOString(),
    endIso: a.endAt.toISOString(),
    status: a.status,
    timezone: a.timezone,
    externalEventId: a.externalEventId ?? null,
    externalEtag: a.externalEtag ?? null,
  };
}

function mapConn(c: any): CalendarConnectionRecord {
  return {
    id: c.id,
    organizationId: c.organizationId,
    provider: c.provider,
    externalCalendarId: c.externalCalendarId ?? null,
    accessToken: c.accessToken ?? null,
    refreshToken: c.refreshToken ?? null,
    tokenExpiresAt: c.tokenExpiresAt ? c.tokenExpiresAt.toISOString() : null,
    status: c.status,
    scope: c.scope ?? null,
    email: c.email ?? null,
    syncToken: c.syncToken ?? null,
    channelId: c.channelId ?? null,
    resourceId: c.resourceId ?? null,
    channelToken: c.channelToken ?? null,
    channelExpiresAt: c.channelExpiresAt ? c.channelExpiresAt.toISOString() : null,
  };
}

function connData(p: CalendarConnectionPatch): Record<string, unknown> {
  const iso = (v: string | null | undefined) => (v != null ? new Date(v) : v === null ? null : undefined);
  return {
    externalCalendarId: p.externalCalendarId,
    accessToken: p.accessToken,
    refreshToken: p.refreshToken,
    tokenExpiresAt: iso(p.tokenExpiresAt),
    status: p.status,
    scope: p.scope,
    email: p.email,
    syncToken: p.syncToken,
    channelId: p.channelId,
    resourceId: p.resourceId,
    channelToken: p.channelToken,
    channelExpiresAt: iso(p.channelExpiresAt),
  };
}

// ─── Lu Computer agent-backend row mappers (Date → ISO, JSON passthrough) ──────
const iso = (d: any): string | undefined => (d ? new Date(d).toISOString() : undefined);

function mapDepartment(r: any): DepartmentRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    key: r.key,
    status: r.status,
    context: r.context,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapAgent(r: any): AgentRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    departmentKey: r.departmentKey,
    name: r.name,
    role: r.role,
    contract: r.contract,
    models: (r.models as Record<string, unknown>) ?? {},
    status: r.status,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapTask(r: any): TaskRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    departmentKey: r.departmentKey,
    agentId: r.agentId ?? null,
    title: r.title,
    body: r.body,
    status: r.status,
    parentTaskId: r.parentTaskId ?? null,
    input: r.input ?? null,
    result: r.result ?? null,
    model: r.model ?? null,
    assignedBy: r.assignedBy,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapArtifact(r: any): ArtifactRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    taskId: r.taskId ?? null,
    agentId: r.agentId ?? null,
    kind: r.kind,
    title: r.title,
    payload: r.payload ?? {},
    createdAt: iso(r.createdAt),
  };
}

function mapSite(r: any): SiteRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    departmentKey: r.departmentKey ?? null,
    repoFullName: r.repoFullName ?? null,
    vercelProjectId: r.vercelProjectId ?? null,
    domain: r.domain ?? null,
    status: r.status,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapDeployment(r: any): DeploymentRecord {
  return {
    id: r.id,
    siteId: r.siteId,
    env: r.env,
    url: r.url,
    sha: r.sha ?? null,
    prNumber: r.prNumber ?? null,
    status: r.status,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapSession(r: any): SessionRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    sandboxId: r.sandboxId ?? null,
    agentKind: r.agentKind,
    repo: r.repo ?? null,
    status: r.status,
    transcript: r.transcript ?? null,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapApproval(r: any): ApprovalRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    taskId: r.taskId ?? null,
    action: r.action,
    status: r.status,
    decidedBy: r.decidedBy ?? null,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapCanvasNode(r: any): CanvasNodeRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    type: r.type,
    x: r.x,
    y: r.y,
    w: r.w ?? null,
    h: r.h ?? null,
    refId: r.refId ?? null,
    z: r.z ?? null,
    createdBy: r.createdBy ?? null,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapEdge(r: any): EdgeRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    fromId: r.fromId,
    toId: r.toId,
    kind: r.kind,
    createdAt: iso(r.createdAt),
  };
}

function mapCollection(r: any): CollectionRecord {
  return {
    id: r.id,
    orgId: r.orgId,
    agentId: r.agentId ?? null,
    name: r.name,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

/**
 * Classify a Postgres integrity-constraint error from a booking write. Our constraints
 * (defined in the migration) put their names in the error detail, so we match on them.
 * Returns null for anything that isn't one of our booking conflicts (re-thrown).
 */
function classifyAppointmentConflict(e: unknown): "slot_taken" | "lead_has_active" | null {
  const err = e as any;
  const blob = `${err?.message ?? ""} ${JSON.stringify(err?.meta ?? "")} ${String(err?.cause ?? "")}`;
  if (blob.includes("appt_one_active_per_lead")) return "lead_has_active";
  if (blob.includes("appt_no_overlap_per_organization") || blob.includes("appt_unique_active_start_per_organization"))
    return "slot_taken";
  // 23P01 = exclusion_violation, 23505 = unique_violation; P2002 = Prisma unique. Default to slot_taken.
  if (blob.includes("23P01") || blob.includes("23505") || err?.code === "P2002") return "slot_taken";
  return null;
}

/** Production Store backed by Postgres via Prisma. Only constructed when DATABASE_URL is set. */
export class PrismaStore implements Store {
  private db = getPrisma();
  private lock = createConversationLock();

  withConversationLock<T>(conversationId: string, fn: () => Promise<T>): Promise<T> {
    return this.lock(conversationId, fn);
  }

  async getOrganization(id: string): Promise<OrganizationConfig | null> {
    const r = await this.db.organization.findUnique({ where: { id } });
    return r ? rowToOrganization(r) : null;
  }

  async getOrganizationByTwilioNumber(toNumber: string): Promise<OrganizationConfig | null> {
    const r = await this.db.organization.findFirst({ where: { twilioNumber: toNumber } });
    return r ? rowToOrganization(r) : null;
  }

  async getOrganizationBySlug(slug: string): Promise<OrganizationConfig | null> {
    const r = await this.db.organization.findUnique({ where: { slug } });
    return r ? rowToOrganization(r) : null;
  }

  async findLeadBySourceMessageId(sourceMessageId: string): Promise<{ id: string } | null> {
    const l = await this.db.lead.findUnique({ where: { sourceMessageId }, select: { id: true } });
    return l ?? null;
  }

  async getRecipients(organizationId: string): Promise<RecipientRecord[]> {
    const rs = await this.db.notificationRecipient.findMany({
      where: { organizationId },
      include: { subscriptions: true },
    });
    return rs.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      subscriptions: r.subscriptions.map((s) => ({
        eventType: s.eventType as NotificationEventType,
        channels: s.channels as "sms" | "email" | "both",
      })),
    }));
  }

  async createLeadWithConversation(input: CreateLeadInput): Promise<LeadContext> {
    const organization = await this.getOrganization(input.organizationId);
    if (!organization) throw new Error(`unknown organization ${input.organizationId}`);
    const lead = await this.db.lead.create({
      data: {
        organizationId: input.organizationId,
        contactName: input.contactName,
        contactPhone: input.contactPhone,
        projectHint: input.projectHint ?? null,
        source: input.source ?? "manual",
        sourceMessageId: input.sourceMessageId ?? null,
        status: "new",
      },
    });
    const gathered: GatheredInfo = { projectType: input.projectHint ?? null };
    const conv = await this.db.conversation.create({
      data: { leadId: lead.id, state: "intake", gathered: gathered as any },
    });
    return { lead: mapLead(lead), organization, conversation: mapConv(conv), messages: [] };
  }

  async findActiveContextByPhones(toNumber: string, fromNumber: string): Promise<LeadContext | null> {
    const organization = await this.db.organization.findFirst({ where: { twilioNumber: toNumber } });
    if (!organization) return null;
    const lead = await this.db.lead.findFirst({
      // Match the lead's conversation regardless of state — a disqualified/terminal lead's follow-up
      // must still be persisted + answered, never silently dropped (state was "done" pre-fix).
      where: { organizationId: organization.id, contactPhone: fromNumber, conversation: { isNot: null } },
      orderBy: { createdAt: "desc" },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!lead || !lead.conversation) return null;
    return {
      lead: mapLead(lead),
      organization: rowToOrganization(organization),
      conversation: mapConv(lead.conversation),
      messages: lead.conversation.messages.map(mapMsg),
    };
  }

  async findLeadContextByOrganizationPhone(organizationId: string, phone: string): Promise<LeadContext | null> {
    const lead = await this.db.lead.findFirst({
      where: { organizationId, contactPhone: phone, conversation: { isNot: null } },
      orderBy: { createdAt: "desc" },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!lead || !lead.conversation) return null;
    const organization = await this.getOrganization(organizationId);
    if (!organization) return null;
    return {
      lead: mapLead(lead),
      organization,
      conversation: mapConv(lead.conversation),
      messages: lead.conversation.messages.map(mapMsg),
    };
  }

  async findLeadsByName(organizationId: string, name: string): Promise<LeadRecord[]> {
    const q = name.trim();
    if (!q) return [];
    const rows = await this.db.lead.findMany({
      where: { organizationId, contactName: { contains: q, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    return rows.map(mapLead);
  }

  async getContextByLeadId(leadId: string): Promise<LeadContext | null> {
    const lead = await this.db.lead.findUnique({
      where: { id: leadId },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
    });
    if (!lead || !lead.conversation) return null;
    const organization = await this.getOrganization(lead.organizationId);
    if (!organization) return null;
    return {
      lead: mapLead(lead),
      organization,
      conversation: mapConv(lead.conversation),
      messages: lead.conversation.messages.map(mapMsg),
    };
  }

  async appendInboundIdempotent(
    conversationId: string,
    msg: { body: string; providerSid?: string | null },
  ): Promise<{ inserted: boolean }> {
    try {
      await this.db.message.create({
        data: { conversationId, direction: "inbound", body: msg.body, providerSid: msg.providerSid ?? null },
      });
      return { inserted: true };
    } catch (e) {
      if ((e as any)?.code === "P2002") return { inserted: false }; // duplicate providerSid → already handled
      throw e;
    }
  }

  async appendMessage(
    conversationId: string,
    msg: { direction: "inbound" | "outbound"; body: string; providerSid?: string | null },
  ): Promise<MessageRecord> {
    const m = await this.db.message.create({
      data: { conversationId, direction: msg.direction, body: msg.body, providerSid: msg.providerSid ?? null },
    });
    return mapMsg(m);
  }

  async transitionLeadStatus(leadId: string, from: string[], to: string): Promise<boolean> {
    const r = await this.db.lead.updateMany({
      where: { id: leadId, status: { in: from as any } },
      data: { status: to as any },
    });
    return r.count > 0;
  }

  async updateLeadFields(leadId: string, patch: LeadFieldPatch): Promise<void> {
    await this.db.lead.update({
      where: { id: leadId },
      data: {
        contactName: patch.contactName,
        projectHint: patch.projectHint,
        serviceTown: patch.serviceTown,
        serviceZip: patch.serviceZip,
        fullAddress: patch.fullAddress,
        status: patch.status as any,
      },
    });
  }

  async updateConversation(
    conversationId: string,
    patch: { state?: Stage; gathered?: GatheredInfo },
  ): Promise<void> {
    await this.db.conversation.update({
      where: { id: conversationId },
      data: { state: patch.state as any, gathered: patch.gathered as any },
    });
  }

  async bookAppointment(input: {
    leadId: string;
    organizationId: string;
    startIso: string;
    endIso: string;
    timezone: string;
  }): Promise<BookOutcome> {
    try {
      const a = await this.db.$transaction(async (tx) => {
        const appt = await tx.appointment.create({
          data: {
            leadId: input.leadId,
            organizationId: input.organizationId,
            startAt: new Date(input.startIso),
            endAt: new Date(input.endIso),
            timezone: input.timezone,
            status: "confirmed",
          },
        });
        await tx.lead.update({ where: { id: input.leadId }, data: { status: "booked" } });
        await tx.conversation.update({ where: { leadId: input.leadId }, data: { state: "agent" } });
        return appt;
      });
      return { ok: true, id: a.id, startIso: a.startAt.toISOString(), endIso: a.endAt.toISOString() };
    } catch (e) {
      const reason = classifyAppointmentConflict(e);
      if (reason) return { ok: false, reason };
      throw e;
    }
  }

  async getBusyTimes(
    organizationId: string,
    window: { startIso: string; endIso: string },
  ): Promise<TimeRange[]> {
    const rows = await this.db.appointment.findMany({
      where: {
        organizationId,
        status: { in: ["proposed", "confirmed"] },
        startAt: { lt: new Date(window.endIso) },
        endAt: { gt: new Date(window.startIso) },
      },
      select: { startAt: true, endAt: true },
    });
    return rows.map((r) => ({ startAt: r.startAt, endAt: r.endAt }));
  }

  async getActiveAppointmentByLead(leadId: string): Promise<AppointmentRecord | null> {
    const a = await this.db.appointment.findFirst({
      where: { leadId, status: { in: ["confirmed", "proposed"] } },
      orderBy: { createdAt: "desc" },
    });
    return a ? mapAppt(a) : null;
  }

  async getAppointmentsByLead(leadId: string): Promise<AppointmentRecord[]> {
    const rows = await this.db.appointment.findMany({ where: { leadId }, orderBy: { startAt: "asc" } });
    return rows.map(mapAppt);
  }

  async rescheduleAppointment(id: string, startIso: string, endIso: string): Promise<BookOutcome> {
    try {
      const a = await this.db.$transaction(async (tx) => {
        const cur = await tx.appointment.findUnique({ where: { id } });
        if (!cur) throw new Error(`appointment ${id} not found`);
        return tx.appointment.update({
          where: { id },
          data: {
            startAt: new Date(startIso),
            endAt: new Date(endIso),
            status: "confirmed",
            rescheduledFromIso: cur.startAt,
          },
        });
      });
      return { ok: true, id: a.id, startIso: a.startAt.toISOString(), endIso: a.endAt.toISOString() };
    } catch (e) {
      const reason = classifyAppointmentConflict(e);
      if (reason) return { ok: false, reason };
      throw e;
    }
  }

  async updateAppointment(id: string, patch: AppointmentPatch): Promise<void> {
    await this.db.appointment.update({
      where: { id },
      data: {
        startAt: patch.startIso !== undefined ? new Date(patch.startIso) : undefined,
        endAt: patch.endIso !== undefined ? new Date(patch.endIso) : undefined,
        status: patch.status as any,
        rescheduledFromIso:
          patch.rescheduledFromIso != null
            ? new Date(patch.rescheduledFromIso)
            : patch.rescheduledFromIso === null
              ? null
              : undefined,
        cancelledAt:
          patch.cancelledAt != null ? new Date(patch.cancelledAt) : patch.cancelledAt === null ? null : undefined,
        cancelReason: patch.cancelReason,
      },
    });
  }

  async getAppointmentById(id: string): Promise<AppointmentRecord | null> {
    const a = await this.db.appointment.findUnique({ where: { id } });
    return a ? mapAppt(a) : null;
  }

  async findAppointmentByExternalEventId(organizationId: string, externalEventId: string): Promise<AppointmentRecord | null> {
    const a = await this.db.appointment.findFirst({ where: { organizationId, externalEventId } });
    return a ? mapAppt(a) : null;
  }

  async updateAppointmentSync(id: string, patch: AppointmentSyncPatch): Promise<void> {
    await this.db.appointment.update({
      where: { id },
      data: {
        externalProvider: patch.externalProvider,
        externalCalendarId: patch.externalCalendarId,
        externalEventId: patch.externalEventId,
        externalEtag: patch.externalEtag,
        syncState: patch.syncState as any,
        syncedAt: patch.syncedAt != null ? new Date(patch.syncedAt) : undefined,
      },
    });
  }

  async getCalendarConnection(organizationId: string, provider = "google"): Promise<CalendarConnectionRecord | null> {
    const c = await this.db.calendarConnection.findUnique({
      where: { organizationId_provider: { organizationId, provider } },
    });
    return c ? mapConn(c) : null;
  }

  async getCalendarConnectionByChannel(channelId: string): Promise<CalendarConnectionRecord | null> {
    const c = await this.db.calendarConnection.findFirst({ where: { channelId } });
    return c ? mapConn(c) : null;
  }

  async listConnectedCalendars(): Promise<CalendarConnectionRecord[]> {
    const rows = await this.db.calendarConnection.findMany({ where: { status: "connected" } });
    return rows.map(mapConn);
  }

  async upsertCalendarConnection(
    organizationId: string,
    provider: string,
    patch: CalendarConnectionPatch,
  ): Promise<CalendarConnectionRecord> {
    const data = connData(patch);
    const c = await this.db.calendarConnection.upsert({
      where: { organizationId_provider: { organizationId, provider } },
      create: { organizationId, provider, ...data },
      update: data,
    });
    return mapConn(c);
  }

  async createEscalation(input: {
    leadId: string;
    organizationId: string;
    conversationId: string;
    question: string;
  }) {
    const e = await this.db.escalation.create({ data: { ...input, status: "open" } });
    return {
      id: e.id,
      leadId: e.leadId,
      organizationId: e.organizationId,
      conversationId: e.conversationId,
      question: e.question,
      status: e.status,
    };
  }

  async findOpenEscalationByOwnerReply(organizationId: string) {
    const e = await this.db.escalation.findFirst({
      where: { organizationId, status: "open" },
      orderBy: { createdAt: "desc" },
    });
    return e
      ? {
          id: e.id,
          leadId: e.leadId,
          organizationId: e.organizationId,
          conversationId: e.conversationId,
          question: e.question,
          status: e.status,
        }
      : null;
  }

  async findOpenEscalationByLead(leadId: string) {
    const e = await this.db.escalation.findFirst({
      where: { leadId, status: "open" },
      orderBy: { createdAt: "desc" },
    });
    return e
      ? { id: e.id, leadId: e.leadId, organizationId: e.organizationId, conversationId: e.conversationId, question: e.question, status: e.status }
      : null;
  }

  async resolveEscalationIfOpen(id: string, answer: string): Promise<boolean> {
    const r = await this.db.escalation.updateMany({
      where: { id, status: "open" },
      data: { answer, status: "resolved", resolvedAt: new Date() },
    });
    return r.count > 0;
  }

  async getEscalation(id: string) {
    const e = await this.db.escalation.findUnique({ where: { id } });
    return e
      ? { id: e.id, leadId: e.leadId, organizationId: e.organizationId, conversationId: e.conversationId, question: e.question, status: e.status }
      : null;
  }

  async expireEscalation(id: string): Promise<boolean> {
    const r = await this.db.escalation.updateMany({ where: { id, status: "open" }, data: { status: "expired" } });
    return r.count > 0;
  }

  // ─── Lu Computer agent backend (AGENTS-BACKEND.md §2/§3) ───────────────────

  // --- Agents & Departments ---
  async createAgent(input: CreateAgentInput): Promise<AgentRecord> {
    const a = await this.db.agent.create({
      data: {
        orgId: input.orgId,
        departmentKey: input.departmentKey,
        name: input.name,
        role: input.role,
        contract: input.contract ?? undefined,
        models: (input.models ?? undefined) as any,
        status: input.status as any,
      },
    });
    return mapAgent(a);
  }

  async getAgent(id: string): Promise<AgentRecord | null> {
    const a = await this.db.agent.findUnique({ where: { id } });
    return a ? mapAgent(a) : null;
  }

  async listAgents(orgId: string): Promise<AgentRecord[]> {
    const rows = await this.db.agent.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapAgent);
  }

  async getAgentByDepartment(orgId: string, departmentKey: string): Promise<AgentRecord | null> {
    const a = await this.db.agent.findFirst({
      where: { orgId, departmentKey },
      orderBy: { createdAt: "asc" },
    });
    return a ? mapAgent(a) : null;
  }

  async updateAgent(id: string, patch: AgentPatch): Promise<AgentRecord> {
    const a = await this.db.agent.update({
      where: { id },
      data: {
        departmentKey: patch.departmentKey,
        name: patch.name,
        role: patch.role,
        contract: patch.contract,
        models: (patch.models ?? undefined) as any,
        status: patch.status as any,
      },
    });
    return mapAgent(a);
  }

  async updateAgentContract(id: string, content: string): Promise<AgentRecord> {
    const a = await this.db.$transaction(async (tx) => {
      await tx.contractRevision.create({ data: { agentId: id, content } });
      return tx.agent.update({ where: { id }, data: { contract: content } });
    });
    return mapAgent(a);
  }

  async createDepartment(input: CreateDepartmentInput): Promise<DepartmentRecord> {
    const d = await this.db.department.create({
      data: {
        orgId: input.orgId,
        key: input.key,
        status: input.status as any,
        context: input.context ?? undefined,
      },
    });
    return mapDepartment(d);
  }

  async listDepartments(orgId: string): Promise<DepartmentWithAgent[]> {
    const [rows, agentRows] = await Promise.all([
      this.db.department.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } }),
      this.db.agent.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } }),
    ]);
    const byKey = new Map<string, AgentRecord>();
    for (const a of agentRows.map(mapAgent)) if (!byKey.has(a.departmentKey)) byKey.set(a.departmentKey, a);
    return rows.map(mapDepartment).map((d) => ({ ...d, agent: byKey.get(d.key) ?? null }));
  }

  async upsertDepartment(orgId: string, key: string, patch: DepartmentPatch): Promise<DepartmentRecord> {
    const d = await this.db.department.upsert({
      where: { orgId_key: { orgId, key } },
      create: { orgId, key, status: (patch.status ?? undefined) as any, context: patch.context ?? undefined },
      update: { status: patch.status as any, context: patch.context },
    });
    return mapDepartment(d);
  }

  // --- Tasks ---
  async createTask(input: CreateTaskInput): Promise<TaskRecord> {
    const t = await this.db.task.create({
      data: {
        orgId: input.orgId,
        departmentKey: input.departmentKey,
        agentId: input.agentId ?? null,
        title: input.title,
        body: input.body ?? "",
        status: input.status as any,
        parentTaskId: input.parentTaskId ?? null,
        input: (input.input ?? undefined) as any,
        result: (input.result ?? undefined) as any,
        model: input.model ?? null,
        assignedBy: input.assignedBy,
      },
    });
    return mapTask(t);
  }

  async getTask(id: string): Promise<TaskRecord | null> {
    const t = await this.db.task.findUnique({ where: { id } });
    return t ? mapTask(t) : null;
  }

  async listTasks(orgId: string, filter?: TaskFilter): Promise<TaskRecord[]> {
    const rows = await this.db.task.findMany({
      where: {
        orgId,
        departmentKey: filter?.departmentKey,
        status: filter?.status as any,
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapTask);
  }

  async updateTaskStatus(id: string, status: string): Promise<TaskRecord> {
    const t = await this.db.task.update({ where: { id }, data: { status: status as any } });
    return mapTask(t);
  }

  async updateTask(id: string, patch: TaskPatch): Promise<TaskRecord> {
    const t = await this.db.task.update({
      where: { id },
      data: {
        departmentKey: patch.departmentKey,
        agentId: patch.agentId,
        title: patch.title,
        body: patch.body,
        status: patch.status as any,
        parentTaskId: patch.parentTaskId,
        input: patch.input as any,
        result: patch.result as any,
        model: patch.model,
        assignedBy: patch.assignedBy,
      },
    });
    return mapTask(t);
  }

  // --- Artifacts ---
  async addArtifact(input: AddArtifactInput): Promise<ArtifactRecord> {
    const a = await this.db.artifact.create({
      data: {
        orgId: input.orgId,
        taskId: input.taskId ?? null,
        agentId: input.agentId ?? null,
        kind: input.kind as any,
        title: input.title,
        payload: (input.payload ?? undefined) as any,
      },
    });
    return mapArtifact(a);
  }

  async listArtifacts(filter: ArtifactFilter): Promise<ArtifactRecord[]> {
    const rows = await this.db.artifact.findMany({
      where: { taskId: filter.taskId, orgId: filter.orgId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapArtifact);
  }

  // --- Sites & Deployments ---
  async createSite(input: CreateSiteInput): Promise<SiteRecord> {
    const s = await this.db.site.create({
      data: {
        orgId: input.orgId,
        departmentKey: input.departmentKey ?? null,
        repoFullName: input.repoFullName ?? null,
        vercelProjectId: input.vercelProjectId ?? null,
        domain: input.domain ?? null,
        status: input.status as any,
      },
    });
    return mapSite(s);
  }

  async getSite(id: string): Promise<SiteRecord | null> {
    const s = await this.db.site.findUnique({ where: { id } });
    return s ? mapSite(s) : null;
  }

  async updateSite(id: string, patch: SitePatch): Promise<SiteRecord> {
    const s = await this.db.site.update({
      where: { id },
      data: {
        departmentKey: patch.departmentKey,
        repoFullName: patch.repoFullName,
        vercelProjectId: patch.vercelProjectId,
        domain: patch.domain,
        status: patch.status as any,
      },
    });
    return mapSite(s);
  }

  async addDeployment(input: AddDeploymentInput): Promise<DeploymentRecord> {
    const d = await this.db.deployment.create({
      data: {
        siteId: input.siteId,
        env: input.env as any,
        url: input.url,
        sha: input.sha ?? null,
        prNumber: input.prNumber ?? null,
        status: input.status as any,
      },
    });
    return mapDeployment(d);
  }

  async listDeployments(siteId: string): Promise<DeploymentRecord[]> {
    const rows = await this.db.deployment.findMany({ where: { siteId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapDeployment);
  }

  // --- Sessions ---
  async createSession(input: CreateSessionInput): Promise<SessionRecord> {
    const s = await this.db.session.create({
      data: {
        orgId: input.orgId,
        agentKind: input.agentKind,
        sandboxId: input.sandboxId ?? null,
        repo: input.repo ?? null,
        status: input.status as any,
        transcript: input.transcript ?? null,
      },
    });
    return mapSession(s);
  }

  async getSession(id: string): Promise<SessionRecord | null> {
    const s = await this.db.session.findUnique({ where: { id } });
    return s ? mapSession(s) : null;
  }

  async updateSession(id: string, patch: SessionPatch): Promise<SessionRecord> {
    const s = await this.db.session.update({
      where: { id },
      data: {
        sandboxId: patch.sandboxId,
        repo: patch.repo,
        status: patch.status as any,
        transcript: patch.transcript,
      },
    });
    return mapSession(s);
  }

  // --- Approvals ---
  async createApproval(input: CreateApprovalInput): Promise<ApprovalRecord> {
    const a = await this.db.approval.create({
      data: { orgId: input.orgId, taskId: input.taskId ?? null, action: input.action },
    });
    return mapApproval(a);
  }

  async resolveApproval(id: string, decision: string, decidedBy?: string | null): Promise<ApprovalRecord> {
    const a = await this.db.approval.update({
      where: { id },
      data: { status: decision as any, decidedBy: decidedBy ?? null },
    });
    return mapApproval(a);
  }

  async listPendingApprovals(orgId: string): Promise<ApprovalRecord[]> {
    const rows = await this.db.approval.findMany({
      where: { orgId, status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapApproval);
  }

  // --- Canvas (nodes / edges / collections) ---
  async createCanvasNode(input: CreateCanvasNodeInput): Promise<CanvasNodeRecord> {
    const n = await this.db.canvasNode.create({
      data: {
        orgId: input.orgId,
        type: input.type as any,
        x: input.x,
        y: input.y,
        w: input.w ?? null,
        h: input.h ?? null,
        refId: input.refId ?? null,
        z: input.z ?? null,
        createdBy: input.createdBy ?? null,
      },
    });
    return mapCanvasNode(n);
  }

  async listCanvasNodes(orgId: string): Promise<CanvasNodeRecord[]> {
    const rows = await this.db.canvasNode.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapCanvasNode);
  }

  async updateCanvasNode(id: string, patch: CanvasNodePatch): Promise<CanvasNodeRecord> {
    const n = await this.db.canvasNode.update({
      where: { id },
      data: {
        type: patch.type as any,
        x: patch.x,
        y: patch.y,
        w: patch.w,
        h: patch.h,
        refId: patch.refId,
        z: patch.z,
      },
    });
    return mapCanvasNode(n);
  }

  async deleteCanvasNode(id: string): Promise<void> {
    await this.db.canvasNode.delete({ where: { id } });
  }

  async createEdge(input: CreateEdgeInput): Promise<EdgeRecord> {
    const e = await this.db.edge.create({
      data: { orgId: input.orgId, fromId: input.fromId, toId: input.toId, kind: input.kind as any },
    });
    return mapEdge(e);
  }

  async listEdges(orgId: string): Promise<EdgeRecord[]> {
    const rows = await this.db.edge.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapEdge);
  }

  async deleteEdge(id: string): Promise<void> {
    await this.db.edge.delete({ where: { id } });
  }

  async createCollection(input: CreateCollectionInput): Promise<CollectionRecord> {
    const c = await this.db.collection.create({
      data: { orgId: input.orgId, agentId: input.agentId ?? null, name: input.name },
    });
    return mapCollection(c);
  }

  async listCollections(orgId: string): Promise<CollectionRecord[]> {
    const rows = await this.db.collection.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } });
    return rows.map(mapCollection);
  }
}
