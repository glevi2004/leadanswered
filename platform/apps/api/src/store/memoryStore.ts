import { randomUUID } from "node:crypto";
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

/** Internal encrypted-at-rest row shapes (mirrors PrismaStore: token ciphertext only). */
interface StoredGithubConnection {
  orgId: string;
  installationId: string | null;
  login: string | null;
  userTokenEnc: string | null;
  createdAt: string;
  updatedAt: string;
}
interface StoredVercelConnection {
  orgId: string;
  accessTokenEnc: string;
  teamId: string | null;
  vercelUserId: string | null;
  createdAt: string;
  updatedAt: string;
}
interface StoredSupabaseConnection {
  orgId: string;
  projectRef: string;
  serviceKeyEnc: string;
  managementTokenEnc: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * In-memory Store for demo mode + tests. Behaviorally mirrors PrismaStore:
 * create → row, update → the mutated row (throws on unknown id, like Prisma's
 * .update()), list → filtered array.
 */
export class MemoryStore implements Store {
  // Lu Computer agent-backend entities — Maps keyed by id (AGENTS-BACKEND.md §2/§3).
  private departments = new Map<string, DepartmentRecord>();
  private agents = new Map<string, AgentRecord>();
  private contractRevisions: { id: string; agentId: string; content: string; createdAt: string }[] = [];
  private tasks = new Map<string, TaskRecord>();
  private artifacts = new Map<string, ArtifactRecord>();
  private sites = new Map<string, SiteRecord>();
  private deployments = new Map<string, DeploymentRecord>();
  private sessions = new Map<string, SessionRecord>();
  private usageEvents: UsageEventRecord[] = [];
  private threads = new Map<string, ThreadRecord>();
  private threadMessages: MessageRecord[] = [];
  private memories: MemoryRecord[] = [];
  private subscriptions = new Map<string, SubscriptionRecord>();
  private approvals = new Map<string, ApprovalRecord>();
  private canvasNodes = new Map<string, CanvasNodeRecord>();
  private edges = new Map<string, EdgeRecord>();
  private collections = new Map<string, CollectionRecord>();
  // BYO connect — one row per org per provider, keyed by orgId (tokens encrypted at rest).
  private githubConnections = new Map<string, StoredGithubConnection>();
  private vercelConnections = new Map<string, StoredVercelConnection>();
  private supabaseConnections = new Map<string, StoredSupabaseConnection>();
  private now: () => Date;

  /** Optional injected clock so tests can control record timestamps. */
  constructor(now: () => Date = () => new Date()) {
    this.now = now;
  }

  private mustGet<T>(map: Map<string, T>, id: string, kind: string): T {
    const v = map.get(id);
    if (!v) throw new Error(`${kind} ${id} not found`);
    return v;
  }

  // ─── Lu Computer agent backend (AGENTS-BACKEND.md §2/§3) ───────────────────

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

  async listSites(orgId: string): Promise<SiteRecord[]> {
    return [...this.sites.values()]
      .filter((s) => s.orgId === orgId)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
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
      startedAt: input.startedAt ?? null,
      endedAt: null,
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

  // --- BYO connect (per-org GitHub / Vercel connections; tokens encrypted at rest) ---
  private mapGithubConnection(r: StoredGithubConnection): GithubConnectionRecord {
    return {
      orgId: r.orgId,
      installationId: r.installationId,
      login: r.login,
      userToken: decryptTokenSafe(r.userTokenEnc),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  private mapVercelConnection(r: StoredVercelConnection): VercelConnectionRecord {
    return {
      orgId: r.orgId,
      accessToken: decryptTokenSafe(r.accessTokenEnc),
      teamId: r.teamId,
      vercelUserId: r.vercelUserId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async getGithubConnection(orgId: string): Promise<GithubConnectionRecord | null> {
    const r = this.githubConnections.get(orgId);
    return r ? this.mapGithubConnection(r) : null;
  }

  async upsertGithubConnection(orgId: string, input: GithubConnectionInput): Promise<GithubConnectionRecord> {
    const ts = this.now().toISOString();
    const existing = this.githubConnections.get(orgId);
    const rec: StoredGithubConnection = {
      orgId,
      installationId: input.installationId ?? existing?.installationId ?? null,
      login: input.login ?? existing?.login ?? null,
      userTokenEnc:
        input.userToken !== undefined ? encryptToken(input.userToken) : existing?.userTokenEnc ?? null,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    this.githubConnections.set(orgId, rec);
    return this.mapGithubConnection(rec);
  }

  async deleteGithubConnection(orgId: string): Promise<void> {
    this.githubConnections.delete(orgId);
  }

  async getVercelConnection(orgId: string): Promise<VercelConnectionRecord | null> {
    const r = this.vercelConnections.get(orgId);
    return r ? this.mapVercelConnection(r) : null;
  }

  async upsertVercelConnection(orgId: string, input: VercelConnectionInput): Promise<VercelConnectionRecord> {
    const ts = this.now().toISOString();
    const existing = this.vercelConnections.get(orgId);
    let accessTokenEnc: string;
    if (input.accessToken !== undefined) accessTokenEnc = encryptToken(input.accessToken);
    else if (existing) accessTokenEnc = existing.accessTokenEnc;
    else throw new Error("upsertVercelConnection: accessToken is required to create a connection");
    const rec: StoredVercelConnection = {
      orgId,
      accessTokenEnc,
      teamId: input.teamId ?? existing?.teamId ?? null,
      vercelUserId: input.vercelUserId ?? existing?.vercelUserId ?? null,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    this.vercelConnections.set(orgId, rec);
    return this.mapVercelConnection(rec);
  }

  async deleteVercelConnection(orgId: string): Promise<void> {
    this.vercelConnections.delete(orgId);
  }

  private mapSupabaseConnection(r: StoredSupabaseConnection): SupabaseConnectionRecord {
    return {
      orgId: r.orgId,
      projectRef: r.projectRef,
      serviceKey: decryptTokenSafe(r.serviceKeyEnc),
      managementToken: decryptTokenSafe(r.managementTokenEnc),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async getSupabaseConnection(orgId: string): Promise<SupabaseConnectionRecord | null> {
    const r = this.supabaseConnections.get(orgId);
    return r ? this.mapSupabaseConnection(r) : null;
  }

  async upsertSupabaseConnection(
    orgId: string,
    input: SupabaseConnectionInput,
  ): Promise<SupabaseConnectionRecord> {
    const ts = this.now().toISOString();
    const existing = this.supabaseConnections.get(orgId);
    const projectRef = input.projectRef ?? existing?.projectRef;
    let serviceKeyEnc: string;
    if (input.serviceKey !== undefined) serviceKeyEnc = encryptToken(input.serviceKey);
    else if (existing) serviceKeyEnc = existing.serviceKeyEnc;
    else throw new Error("upsertSupabaseConnection: serviceKey is required to create a connection");
    if (projectRef === undefined) {
      throw new Error("upsertSupabaseConnection: projectRef is required to create a connection");
    }
    const rec: StoredSupabaseConnection = {
      orgId,
      projectRef,
      serviceKeyEnc,
      managementTokenEnc:
        input.managementToken !== undefined
          ? encryptToken(input.managementToken)
          : existing?.managementTokenEnc ?? null,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    this.supabaseConnections.set(orgId, rec);
    return this.mapSupabaseConnection(rec);
  }

  async deleteSupabaseConnection(orgId: string): Promise<void> {
    this.supabaseConnections.delete(orgId);
  }

  // --- Metering (agent compute → the usage bucket) ---
  async createUsageEvent(input: CreateUsageEventInput): Promise<UsageEventRecord> {
    const rec: UsageEventRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      at: this.now().toISOString(),
      kind: input.kind,
      model: input.model ?? null,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      sandboxSeconds: input.sandboxSeconds ?? null,
      costMicros: input.costMicros,
      taskId: input.taskId ?? null,
      agentId: input.agentId ?? null,
    };
    this.usageEvents.push(rec);
    return rec;
  }

  async sumUsageSince(orgId: string, sinceISO: string): Promise<UsageSummary> {
    const since = new Date(sinceISO).getTime();
    const rows = this.usageEvents.filter(
      (e) => e.orgId === orgId && new Date(e.at).getTime() >= since,
    );
    return {
      costMicros: rows.reduce((s, e) => s + e.costMicros, 0),
      inputTokens: rows.reduce((s, e) => s + (e.inputTokens ?? 0), 0),
      outputTokens: rows.reduce((s, e) => s + (e.outputTokens ?? 0), 0),
      sandboxSeconds: rows.reduce((s, e) => s + (e.sandboxSeconds ?? 0), 0),
      events: rows.length,
    };
  }

  async getOrCreateSubscription(orgId: string): Promise<SubscriptionRecord> {
    const existing = this.subscriptions.get(orgId);
    if (existing) return existing;
    const ts = this.now().toISOString();
    const rec: SubscriptionRecord = {
      id: randomUUID(),
      orgId,
      plan: "pro",
      bucketMicros: 20_000_000,
      overageOptIn: true,
      periodStart: ts,
      createdAt: ts,
      updatedAt: ts,
    };
    this.subscriptions.set(orgId, rec);
    return rec;
  }

  // --- Memory: working (persisted conversation) ---
  async getOrCreateMainThread(orgId: string): Promise<ThreadRecord> {
    for (const t of this.threads.values()) if (t.orgId === orgId) return t;
    const ts = this.now().toISOString();
    const rec: ThreadRecord = { id: randomUUID(), orgId, title: "", createdAt: ts, updatedAt: ts };
    this.threads.set(rec.id, rec);
    return rec;
  }

  async appendMessage(input: {
    threadId: string;
    orgId: string;
    role: "user" | "assistant";
    content: string;
  }): Promise<MessageRecord> {
    const rec: MessageRecord = {
      id: randomUUID(),
      threadId: input.threadId,
      orgId: input.orgId,
      role: input.role,
      content: input.content,
      createdAt: this.now().toISOString(),
    };
    this.threadMessages.push(rec);
    const t = this.threads.get(input.threadId);
    if (t) t.updatedAt = rec.createdAt;
    return rec;
  }

  async listRecentMessages(threadId: string, limit: number): Promise<MessageRecord[]> {
    return this.threadMessages.filter((m) => m.threadId === threadId).slice(-limit);
  }

  // --- Memory: core + long-term ---
  async upsertMemory(input: UpsertMemoryInput): Promise<MemoryRecord> {
    const ts = this.now().toISOString();
    if (input.key) {
      const existing = this.memories.find(
        (m) => m.orgId === input.orgId && m.tier === input.tier && m.key === input.key,
      );
      if (existing) {
        existing.content = input.content;
        existing.source = input.source ?? existing.source;
        existing.updatedAt = ts;
        return existing;
      }
    }
    const rec: MemoryRecord = {
      id: randomUUID(),
      orgId: input.orgId,
      tier: input.tier,
      key: input.key ?? null,
      content: input.content,
      source: input.source ?? "",
      createdAt: ts,
      updatedAt: ts,
    };
    this.memories.push(rec);
    return rec;
  }

  async listMemory(orgId: string, tier: "core" | "longterm"): Promise<MemoryRecord[]> {
    return this.memories
      .filter((m) => m.orgId === orgId && m.tier === tier)
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }
}
