// ─────────────────────────────────────────────────────────────────────────────
// Lu Computer — agent-backend entities. Records mirror the Prisma models in
// packages/db/prisma/schema.prisma (AGENTS-BACKEND.md §2). Every model is
// org-scoped via a scalar `orgId`. Enum-typed columns are surfaced as plain
// strings here; JSON columns are typed as `unknown` / `Record<string, unknown>`.
// Timestamps are optional ISO strings.
// ─────────────────────────────────────────────────────────────────────────────

/** A department (one of the 8) instantiated for an org. `status` mirrors the
 * DepartmentStatus enum (`active` | `in_development`), surfaced as a string. */
export interface DepartmentRecord {
  id: string;
  orgId: string;
  key: string;
  status: string; // active | in_development
  context: string;
  createdAt?: string;
  updatedAt?: string;
}
/** A department joined with its (single, default) agent — what the canvas reads. */
export interface DepartmentWithAgent extends DepartmentRecord {
  agent: AgentRecord | null;
}
export interface CreateDepartmentInput {
  orgId: string;
  key: string;
  status: string; // active | in_development
  context?: string;
}
export type DepartmentPatch = Partial<{ status: string; context: string }>;

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
  /** The acceptance criteria this task must verifiably meet (string[]) — the Outcome tier. */
  acceptance: unknown | null;
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
  acceptance?: unknown;
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
  acceptance: unknown;
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

/** A customer / dogfood project. `kind` = created | imported; `setupCommand`/`testCommand`
 * are the repo profile (ladder step 2 — what the sandbox runs after clone / for verification). */
export interface SiteRecord {
  id: string;
  orgId: string;
  departmentKey: string | null;
  repoFullName: string | null;
  vercelProjectId: string | null;
  domain: string | null;
  status: string;
  kind: string;
  setupCommand: string | null;
  testCommand: string | null;
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
  kind?: string;
  setupCommand?: string | null;
  testCommand?: string | null;
}
export type SitePatch = Partial<{
  departmentKey: string | null;
  repoFullName: string | null;
  vercelProjectId: string | null;
  domain: string | null;
  status: string;
  kind: string;
  setupCommand: string | null;
  testCommand: string | null;
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
  startedAt?: string | null;
  endedAt?: string | null;
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
  startedAt?: string | null;
}
export type SessionPatch = Partial<{
  sandboxId: string | null;
  repo: string | null;
  status: string;
  transcript: string | null;
  startedAt: string | null;
  endedAt: string | null;
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

// ─── BYO connect (docs/system.md �6) — per-org provider connections ─────────
// One row per org per provider. Tokens are ENCRYPTED at rest (AES-256-GCM); the
// getters return the DECRYPTED token to callers (or null if none / undecryptable).

/** An org's GitHub connection. `userToken` is the DECRYPTED pasted access token (or null). */
export interface GithubConnectionRecord {
  orgId: string;
  installationId: string | null;
  login: string | null;
  userToken: string | null;
  createdAt?: string;
  updatedAt?: string;
}
/** Upsert patch for a GitHub connection — only the provided fields are written. */
export interface GithubConnectionInput {
  /** The pasted access token (plaintext in → encrypted at rest). */
  userToken?: string;
  login?: string;
  installationId?: string;
}

/** An org's Vercel connection. `accessToken` is the DECRYPTED pasted token (or null). */
export interface VercelConnectionRecord {
  orgId: string;
  accessToken: string | null;
  teamId: string | null;
  vercelUserId: string | null;
  createdAt?: string;
  updatedAt?: string;
}
/** Upsert patch for a Vercel connection — `accessToken` is required on first create. */
export interface VercelConnectionInput {
  /** The pasted access token (plaintext in → encrypted at rest). */
  accessToken?: string;
  teamId?: string;
  vercelUserId?: string;
}

/**
 * An org's Supabase connection — the company's one shared, Engineering-anchored managed project
 * (docs/product.md �4 §"the backend"). `serviceKey` / `managementToken` are the DECRYPTED tokens (or
 * null if none / undecryptable). Secrets are brokered — the console never returns these to the client.
 */
export interface SupabaseConnectionRecord {
  orgId: string;
  projectRef: string;
  serviceKey: string | null;
  managementToken: string | null;
  /** OAuth refresh token (DECRYPTED) — re-mints the mgmt token when it expires. Null for paste. */
  refreshToken: string | null;
  /** ISO expiry of the current mgmt token (OAuth); null for a pasted connection. */
  expiresAt: string | null;
  createdAt?: string;
  updatedAt?: string;
}
/** Upsert patch — create needs a projectRef plus at least one of serviceKey / managementToken. */
export interface SupabaseConnectionInput {
  projectRef?: string;
  /** The project service_role key (plaintext in → encrypted at rest). */
  serviceKey?: string;
  /** The Supabase Management API token — PAT or OAuth (plaintext in → encrypted at rest). */
  managementToken?: string;
  /** The OAuth refresh token (plaintext in → encrypted at rest). */
  refreshToken?: string;
  /** ISO expiry of the mgmt token just issued. */
  expiresAt?: string | null;
}

/** A metered agent-compute event (plan Pillar 2 — the usage bucket). */
export interface UsageEventRecord {
  id: string;
  orgId: string;
  at: string;
  kind: "llm" | "sandbox";
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  sandboxSeconds: number | null;
  costMicros: number;
  taskId: string | null;
  agentId: string | null;
}
export interface CreateUsageEventInput {
  orgId: string;
  kind: "llm" | "sandbox";
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  sandboxSeconds?: number | null;
  costMicros: number;
  taskId?: string | null;
  agentId?: string | null;
}
/** Aggregated agent-compute for an org over a period (drives the bucket + overage). */
export interface UsageSummary {
  costMicros: number;
  inputTokens: number;
  outputTokens: number;
  sandboxSeconds: number;
  events: number;
}

/** Per-org usage plan + bucket (plan Pillar 2 — no Stripe yet). */
export interface SubscriptionRecord {
  id: string;
  orgId: string;
  plan: string;
  bucketMicros: number;
  overageOptIn: boolean;
  periodStart: string;
  createdAt?: string;
  updatedAt?: string;
}

/** A persisted Lu conversation thread (plan Pillar 3 — working memory). */
export interface ThreadRecord {
  id: string;
  orgId: string;
  title: string;
  createdAt?: string;
  updatedAt?: string;
}
/** One persisted turn in a Thread. `meta` marks system-authored report-back messages
 * (docs/product.md §3) so the UI can render them as event cards. */
export interface MessageRecord {
  id: string;
  threadId: string;
  orgId: string;
  role: "user" | "assistant";
  content: string;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
}

/** One row in the event journal — the flow layer's spine (docs/product.md §1). */
export interface AgentEventRecord {
  id: string;
  orgId: string;
  taskId: string | null;
  kind: string;
  message: string;
  payload: unknown | null;
  createdAt?: string;
}
export interface AddAgentEventInput {
  orgId: string;
  taskId?: string | null;
  kind: string;
  message: string;
  payload?: unknown;
}

/** Durable org knowledge for Lu (plan Pillar 3, Tiers 2/3 — core + long-term memory). */
export interface MemoryRecord {
  id: string;
  orgId: string;
  tier: "core" | "longterm";
  key: string | null;
  content: string;
  source: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface UpsertMemoryInput {
  orgId: string;
  tier: "core" | "longterm";
  key?: string | null;
  content: string;
  source?: string;
}

/** Persistence port. Implemented by MemoryStore (demo/tests) and PrismaStore (production). */
export interface Store {
  // ─── Lu Computer agent backend (AGENTS-BACKEND.md §2/§3) ───────────────────

  // --- Agents & Departments ---
  createAgent(input: CreateAgentInput): Promise<AgentRecord>;
  getAgent(id: string): Promise<AgentRecord | null>;
  listAgents(orgId: string): Promise<AgentRecord[]>;
  /** The (single, default) agent for a department, if one has been hired. */
  getAgentByDepartment(orgId: string, departmentKey: string): Promise<AgentRecord | null>;
  updateAgent(id: string, patch: AgentPatch): Promise<AgentRecord>;
  /** Replace an agent's contract AND append a ContractRevision (diff/revert history, §5a). */
  updateAgentContract(id: string, content: string): Promise<AgentRecord>;
  /** Create a department row for (orgId, key) — used by onboarding provisioning. */
  createDepartment(input: CreateDepartmentInput): Promise<DepartmentRecord>;
  /** The org's departments, each joined with its agent (if one exists) — the canvas read. */
  listDepartments(orgId: string): Promise<DepartmentWithAgent[]>;
  /** Create-or-update the (orgId, key) department — its `status` + `context`. */
  upsertDepartment(orgId: string, key: string, patch: DepartmentPatch): Promise<DepartmentRecord>;

  // --- Tasks ---
  createTask(input: CreateTaskInput): Promise<TaskRecord>;
  getTask(id: string): Promise<TaskRecord | null>;
  listTasks(orgId: string, filter?: TaskFilter): Promise<TaskRecord[]>;
  updateTaskStatus(id: string, status: string): Promise<TaskRecord>;
  updateTask(id: string, patch: TaskPatch): Promise<TaskRecord>;
  /** CROSS-ORG: every `in_progress` task not touched since `olderThanISO` — the reaper's read. */
  listStuckTasks(olderThanISO: string): Promise<TaskRecord[]>;

  // --- Artifacts ---
  addArtifact(input: AddArtifactInput): Promise<ArtifactRecord>;
  listArtifacts(filter: ArtifactFilter): Promise<ArtifactRecord[]>;

  // --- Sites & Deployments ---
  createSite(input: CreateSiteInput): Promise<SiteRecord>;
  getSite(id: string): Promise<SiteRecord | null>;
  /** The org's sites (newest first) — the `GET /api/sites` canvas read. */
  listSites(orgId: string): Promise<SiteRecord[]>;
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

  // --- BYO connect (per-org GitHub / Vercel connections; tokens encrypted at rest) ---
  /** The org's GitHub connection, token DECRYPTED — or null if not connected. */
  getGithubConnection(orgId: string): Promise<GithubConnectionRecord | null>;
  /** Create-or-update the org's GitHub connection (encrypts `userToken`). One per org. */
  upsertGithubConnection(orgId: string, input: GithubConnectionInput): Promise<GithubConnectionRecord>;
  /** Remove the org's GitHub connection (idempotent). */
  deleteGithubConnection(orgId: string): Promise<void>;
  /** The org's Vercel connection, token DECRYPTED — or null if not connected. */
  getVercelConnection(orgId: string): Promise<VercelConnectionRecord | null>;
  /** Create-or-update the org's Vercel connection (encrypts `accessToken`). One per org. */
  upsertVercelConnection(orgId: string, input: VercelConnectionInput): Promise<VercelConnectionRecord>;
  /** Remove the org's Vercel connection (idempotent). */
  deleteVercelConnection(orgId: string): Promise<void>;
  /** The org's Supabase connection, tokens DECRYPTED — or null if not connected. */
  getSupabaseConnection(orgId: string): Promise<SupabaseConnectionRecord | null>;
  /** Create-or-update the org's Supabase connection (encrypts `serviceKey`/`managementToken`). One per org. */
  upsertSupabaseConnection(orgId: string, input: SupabaseConnectionInput): Promise<SupabaseConnectionRecord>;
  /** Remove the org's Supabase connection (idempotent). */
  deleteSupabaseConnection(orgId: string): Promise<void>;

  // --- Metering (agent compute → the usage bucket, plan Pillar 2) ---
  /** Record one metered LLM call or sandbox run. Best-effort caller; never on the hot path. */
  createUsageEvent(input: CreateUsageEventInput): Promise<UsageEventRecord>;
  /** Sum an org's metered compute since an ISO timestamp (the period start). */
  sumUsageSince(orgId: string, sinceISO: string): Promise<UsageSummary>;
  /** The org's usage plan + bucket — created (pro defaults) on first use. */
  getOrCreateSubscription(orgId: string): Promise<SubscriptionRecord>;

  // --- Memory: working (persisted conversation, plan Pillar 3) ---
  /** The org's single main Lu thread — created on first use. */
  getOrCreateMainThread(orgId: string): Promise<ThreadRecord>;
  /** Append a turn to a thread (and bump its updatedAt). */
  appendMessage(input: {
    threadId: string;
    orgId: string;
    role: "user" | "assistant";
    content: string;
    meta?: Record<string, unknown> | null;
  }): Promise<MessageRecord>;
  /** The most recent `limit` messages of a thread, oldest-first (for prompt history). */
  listRecentMessages(threadId: string, limit: number): Promise<MessageRecord[]>;

  // --- The event journal (docs/product.md §1) ---
  /** Append one journal event. Best-effort callers — never let this fail a run. */
  addAgentEvent(input: AddAgentEventInput): Promise<AgentEventRecord>;
  /** The org's most recent events, newest-first. */
  listAgentEvents(orgId: string, limit: number): Promise<AgentEventRecord[]>;

  // --- Memory: core + long-term (plan Pillar 3, Tiers 2/3) ---
  /** Upsert a memory: with a `key`, replace the existing (orgId,tier,key); else insert new. */
  upsertMemory(input: UpsertMemoryInput): Promise<MemoryRecord>;
  /** The org's memories for a tier, newest-first. */
  listMemory(orgId: string, tier: "core" | "longterm"): Promise<MemoryRecord[]>;
}
