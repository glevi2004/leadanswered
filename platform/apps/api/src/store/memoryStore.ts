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
  SessionPatch,
  SessionRecord,
  SitePatch,
  SiteRecord,
  Store,
  TaskFilter,
  TaskPatch,
  TaskRecord,
} from "./types.js";

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
  private approvals = new Map<string, ApprovalRecord>();
  private canvasNodes = new Map<string, CanvasNodeRecord>();
  private edges = new Map<string, EdgeRecord>();
  private collections = new Map<string, CollectionRecord>();
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
}
