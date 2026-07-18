import { getPrisma } from "@leadanswered/db";
import type {
  AddArtifactInput,
  AddDeploymentInput,
  AgentPatch,
  AgentRecord,
  ApprovalRecord,
  ArtifactFilter,
  ArtifactRecord,
  CanvasNodePatch,
  CanvasNodeRecord,
  CollectionRecord,
  CreateAgentInput,
  CreateApprovalInput,
  CreateCanvasNodeInput,
  CreateCollectionInput,
  CreateEdgeInput,
  CreateDepartmentInput,
  CreateSessionInput,
  CreateSiteInput,
  CreateTaskInput,
  DepartmentPatch,
  DepartmentRecord,
  DepartmentWithAgent,
  DeploymentRecord,
  EdgeRecord,
  GithubConnectionInput,
  GithubConnectionRecord,
  SessionPatch,
  SessionRecord,
  SitePatch,
  SiteRecord,
  Store,
  SupabaseConnectionInput,
  SupabaseConnectionRecord,
  TaskFilter,
  TaskPatch,
  TaskRecord,
  VercelConnectionInput,
  VercelConnectionRecord,
} from "./types.js";
import type {
  AddAgentEventInput,
  AgentEventRecord,
  CreateUsageEventInput,
  MemoryRecord,
  MessageRecord,
  SubscriptionRecord,
  ThreadRecord,
  UpsertMemoryInput,
  UsageEventRecord,
  UsageSummary,
} from "./types.js";
import { decryptTokenSafe, encryptToken } from "../crypto/tokens.js";

/* eslint-disable @typescript-eslint/no-explicit-any */

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
    acceptance: r.acceptance ?? null,
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
    startedAt: r.startedAt ? iso(r.startedAt) : null,
    endedAt: r.endedAt ? iso(r.endedAt) : null,
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

// BYO connect — decrypt the stored token on the way out (best-effort; null on failure).
function mapGithubConnection(r: any): GithubConnectionRecord {
  return {
    orgId: r.orgId,
    installationId: r.installationId ?? null,
    login: r.login ?? null,
    userToken: decryptTokenSafe(r.userToken),
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapVercelConnection(r: any): VercelConnectionRecord {
  return {
    orgId: r.orgId,
    accessToken: decryptTokenSafe(r.accessToken),
    teamId: r.teamId ?? null,
    vercelUserId: r.vercelUserId ?? null,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

function mapSupabaseConnection(r: any): SupabaseConnectionRecord {
  return {
    orgId: r.orgId,
    projectRef: r.projectRef,
    serviceKey: decryptTokenSafe(r.serviceKey),
    managementToken: decryptTokenSafe(r.managementToken),
    refreshToken: decryptTokenSafe(r.refreshToken),
    expiresAt: r.expiresAt ? iso(r.expiresAt) ?? null : null,
    createdAt: iso(r.createdAt),
    updatedAt: iso(r.updatedAt),
  };
}

/** Production Store backed by Postgres via Prisma. Only constructed when DATABASE_URL is set. */
export class PrismaStore implements Store {
  private db = getPrisma();

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
        acceptance: (input.acceptance ?? undefined) as any,
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

  async listStuckTasks(olderThanISO: string): Promise<TaskRecord[]> {
    const rows = await this.db.task.findMany({
      where: { status: "in_progress" as any, updatedAt: { lt: new Date(olderThanISO) } },
      orderBy: { updatedAt: "asc" },
      take: 100,
    });
    return rows.map(mapTask);
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
        acceptance: patch.acceptance as any,
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

  async listSites(orgId: string): Promise<SiteRecord[]> {
    const rows = await this.db.site.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
    return rows.map(mapSite);
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
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
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
        startedAt: typeof patch.startedAt === "string" ? new Date(patch.startedAt) : patch.startedAt,
        endedAt: typeof patch.endedAt === "string" ? new Date(patch.endedAt) : patch.endedAt,
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

  // --- BYO connect (per-org GitHub / Vercel connections; tokens encrypted at rest) ---
  // No @@unique(orgId) on these models (only @@index), so we upsert manually by
  // findFirst → update/create rather than db.upsert, keeping "one per org" in app logic.
  async getGithubConnection(orgId: string): Promise<GithubConnectionRecord | null> {
    const r = await this.db.githubConnection.findFirst({ where: { orgId } });
    return r ? mapGithubConnection(r) : null;
  }

  async upsertGithubConnection(orgId: string, input: GithubConnectionInput): Promise<GithubConnectionRecord> {
    const enc = input.userToken !== undefined ? encryptToken(input.userToken) : undefined;
    const existing = await this.db.githubConnection.findFirst({ where: { orgId } });
    if (existing) {
      const r = await this.db.githubConnection.update({
        where: { id: existing.id },
        data: {
          userToken: enc, // undefined → left unchanged
          login: input.login ?? undefined,
          installationId: input.installationId ?? undefined,
        },
      });
      return mapGithubConnection(r);
    }
    const r = await this.db.githubConnection.create({
      data: {
        orgId,
        userToken: enc ?? null,
        login: input.login ?? null,
        installationId: input.installationId ?? null,
      },
    });
    return mapGithubConnection(r);
  }

  async deleteGithubConnection(orgId: string): Promise<void> {
    await this.db.githubConnection.deleteMany({ where: { orgId } });
  }

  async getVercelConnection(orgId: string): Promise<VercelConnectionRecord | null> {
    const r = await this.db.vercelConnection.findFirst({ where: { orgId } });
    return r ? mapVercelConnection(r) : null;
  }

  async upsertVercelConnection(orgId: string, input: VercelConnectionInput): Promise<VercelConnectionRecord> {
    const enc = input.accessToken !== undefined ? encryptToken(input.accessToken) : undefined;
    const existing = await this.db.vercelConnection.findFirst({ where: { orgId } });
    if (existing) {
      const r = await this.db.vercelConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: enc, // undefined → left unchanged
          teamId: input.teamId ?? undefined,
          vercelUserId: input.vercelUserId ?? undefined,
        },
      });
      return mapVercelConnection(r);
    }
    if (enc === undefined) {
      throw new Error("upsertVercelConnection: accessToken is required to create a connection");
    }
    const r = await this.db.vercelConnection.create({
      data: {
        orgId,
        accessToken: enc,
        teamId: input.teamId ?? null,
        vercelUserId: input.vercelUserId ?? null,
      },
    });
    return mapVercelConnection(r);
  }

  async deleteVercelConnection(orgId: string): Promise<void> {
    await this.db.vercelConnection.deleteMany({ where: { orgId } });
  }

  async getSupabaseConnection(orgId: string): Promise<SupabaseConnectionRecord | null> {
    const r = await this.db.supabaseConnection.findFirst({ where: { orgId } });
    return r ? mapSupabaseConnection(r) : null;
  }

  async upsertSupabaseConnection(
    orgId: string,
    input: SupabaseConnectionInput,
  ): Promise<SupabaseConnectionRecord> {
    const encService = input.serviceKey !== undefined ? encryptToken(input.serviceKey) : undefined;
    const encMgmt =
      input.managementToken !== undefined ? encryptToken(input.managementToken) : undefined;
    const encRefresh =
      input.refreshToken !== undefined ? encryptToken(input.refreshToken) : undefined;
    const expiresAt =
      input.expiresAt !== undefined ? (input.expiresAt ? new Date(input.expiresAt) : null) : undefined;
    const existing = await this.db.supabaseConnection.findFirst({ where: { orgId } });
    if (existing) {
      const r = await this.db.supabaseConnection.update({
        where: { id: existing.id },
        data: {
          projectRef: input.projectRef ?? undefined,
          serviceKey: encService, // undefined → left unchanged
          managementToken: encMgmt,
          refreshToken: encRefresh,
          expiresAt, // undefined → unchanged; null → cleared
        },
      });
      return mapSupabaseConnection(r);
    }
    // Create needs a projectRef (may be "" for an OAuth connection with no project picked yet)
    // plus at least one credential — the service key (paste) OR a management token (OAuth).
    if (input.projectRef === undefined || (encService === undefined && encMgmt === undefined)) {
      throw new Error(
        "upsertSupabaseConnection: projectRef and (serviceKey or managementToken) are required to create a connection",
      );
    }
    const r = await this.db.supabaseConnection.create({
      data: {
        orgId,
        projectRef: input.projectRef,
        serviceKey: encService ?? null,
        managementToken: encMgmt ?? null,
        refreshToken: encRefresh ?? null,
        expiresAt: expiresAt ?? null,
      },
    });
    return mapSupabaseConnection(r);
  }

  async deleteSupabaseConnection(orgId: string): Promise<void> {
    await this.db.supabaseConnection.deleteMany({ where: { orgId } });
  }

  // --- Metering (agent compute → the usage bucket) ---
  async createUsageEvent(input: CreateUsageEventInput): Promise<UsageEventRecord> {
    const e = await this.db.usageEvent.create({
      data: {
        orgId: input.orgId,
        kind: input.kind as any,
        model: input.model ?? null,
        inputTokens: input.inputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        sandboxSeconds: input.sandboxSeconds ?? null,
        costMicros: input.costMicros,
        taskId: input.taskId ?? null,
        agentId: input.agentId ?? null,
      },
    });
    return {
      id: e.id,
      orgId: e.orgId,
      at: e.at.toISOString(),
      kind: e.kind as "llm" | "sandbox",
      model: e.model ?? null,
      inputTokens: e.inputTokens ?? null,
      outputTokens: e.outputTokens ?? null,
      sandboxSeconds: e.sandboxSeconds ?? null,
      costMicros: e.costMicros,
      taskId: e.taskId ?? null,
      agentId: e.agentId ?? null,
    };
  }

  async sumUsageSince(orgId: string, sinceISO: string): Promise<UsageSummary> {
    const agg = await this.db.usageEvent.aggregate({
      where: { orgId, at: { gte: new Date(sinceISO) } },
      _sum: { costMicros: true, inputTokens: true, outputTokens: true, sandboxSeconds: true },
      _count: true,
    });
    return {
      costMicros: agg._sum.costMicros ?? 0,
      inputTokens: agg._sum.inputTokens ?? 0,
      outputTokens: agg._sum.outputTokens ?? 0,
      sandboxSeconds: agg._sum.sandboxSeconds ?? 0,
      events: agg._count ?? 0,
    };
  }

  async getOrCreateSubscription(orgId: string): Promise<SubscriptionRecord> {
    const existing = await this.db.subscription.findUnique({ where: { orgId } });
    const s = existing ?? (await this.db.subscription.create({ data: { orgId } }));
    return {
      id: s.id,
      orgId: s.orgId,
      plan: s.plan,
      bucketMicros: s.bucketMicros,
      overageOptIn: s.overageOptIn,
      periodStart: s.periodStart.toISOString(),
      createdAt: iso(s.createdAt),
      updatedAt: iso(s.updatedAt),
    };
  }

  // --- Memory: working (persisted conversation) ---
  async getOrCreateMainThread(orgId: string): Promise<ThreadRecord> {
    const existing = await this.db.thread.findFirst({
      where: { orgId },
      orderBy: { createdAt: "asc" },
    });
    const t = existing ?? (await this.db.thread.create({ data: { orgId, title: "" } }));
    return {
      id: t.id,
      orgId: t.orgId,
      title: t.title,
      createdAt: iso(t.createdAt),
      updatedAt: iso(t.updatedAt),
    };
  }

  async appendMessage(input: {
    threadId: string;
    orgId: string;
    role: "user" | "assistant";
    content: string;
    meta?: Record<string, unknown> | null;
  }): Promise<MessageRecord> {
    const m = await this.db.message.create({
      data: {
        threadId: input.threadId,
        orgId: input.orgId,
        role: input.role,
        content: input.content,
        meta: (input.meta ?? undefined) as any,
      },
    });
    await this.db.thread
      .update({ where: { id: input.threadId }, data: { updatedAt: new Date() } })
      .catch(() => {});
    return {
      id: m.id,
      threadId: m.threadId,
      orgId: m.orgId,
      role: m.role as "user" | "assistant",
      content: m.content,
      meta: (m.meta as Record<string, unknown> | null) ?? null,
      createdAt: iso(m.createdAt),
    };
  }

  async listRecentMessages(threadId: string, limit: number): Promise<MessageRecord[]> {
    const rows = await this.db.message.findMany({
      where: { threadId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse().map((m) => ({
      id: m.id,
      threadId: m.threadId,
      orgId: m.orgId,
      role: m.role as "user" | "assistant",
      content: m.content,
      meta: (m.meta as Record<string, unknown> | null) ?? null,
      createdAt: iso(m.createdAt),
    }));
  }

  // --- The event journal (docs/workflow.md §1) ---
  async addAgentEvent(input: AddAgentEventInput): Promise<AgentEventRecord> {
    const e = await this.db.agentEvent.create({
      data: {
        orgId: input.orgId,
        taskId: input.taskId ?? null,
        kind: input.kind,
        message: input.message,
        payload: (input.payload ?? undefined) as any,
      },
    });
    return {
      id: e.id,
      orgId: e.orgId,
      taskId: e.taskId ?? null,
      kind: e.kind,
      message: e.message,
      payload: e.payload ?? null,
      createdAt: iso(e.createdAt),
    };
  }

  async listAgentEvents(orgId: string, limit: number): Promise<AgentEventRecord[]> {
    const rows = await this.db.agentEvent.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((e) => ({
      id: e.id,
      orgId: e.orgId,
      taskId: e.taskId ?? null,
      kind: e.kind,
      message: e.message,
      payload: e.payload ?? null,
      createdAt: iso(e.createdAt),
    }));
  }

  // --- Memory: core + long-term ---
  async upsertMemory(input: UpsertMemoryInput): Promise<MemoryRecord> {
    let row;
    if (input.key) {
      const existing = await this.db.memory.findFirst({
        where: { orgId: input.orgId, tier: input.tier as any, key: input.key },
      });
      row = existing
        ? await this.db.memory.update({
            where: { id: existing.id },
            data: { content: input.content, source: input.source ?? "" },
          })
        : await this.db.memory.create({
            data: {
              orgId: input.orgId,
              tier: input.tier as any,
              key: input.key,
              content: input.content,
              source: input.source ?? "",
            },
          });
    } else {
      row = await this.db.memory.create({
        data: {
          orgId: input.orgId,
          tier: input.tier as any,
          key: null,
          content: input.content,
          source: input.source ?? "",
        },
      });
    }
    return {
      id: row.id,
      orgId: row.orgId,
      tier: row.tier as "core" | "longterm",
      key: row.key ?? null,
      content: row.content,
      source: row.source,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    };
  }

  async listMemory(orgId: string, tier: "core" | "longterm"): Promise<MemoryRecord[]> {
    const rows = await this.db.memory.findMany({
      where: { orgId, tier: tier as any },
      orderBy: { updatedAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      orgId: r.orgId,
      tier: r.tier as "core" | "longterm",
      key: r.key ?? null,
      content: r.content,
      source: r.source,
      createdAt: iso(r.createdAt),
      updatedAt: iso(r.updatedAt),
    }));
  }
}
