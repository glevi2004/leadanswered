/**
 * Supabase console client — the read-mirror + a few key actions behind the department's
 * Database-view (docs/product.md �4 §"the hub" / §"the backend"). It talks to TWO surfaces:
 *
 *   1. the Supabase **Management API** (https://api.supabase.com, `Authorization: Bearer <mgmt token>`)
 *      for project-level reads: SQL query, migrations, auth config, api-keys, advisors, logs.
 *   2. the **project's own APIs** (https://{ref}.supabase.co, service_role key as `apikey` +
 *      `Authorization`) for storage buckets, auth-admin users, and the create-bucket / add-user actions.
 *
 * "Mirror" = read; "key actions" = the few high-value mutations. Everything is **best-effort**:
 * any non-2xx / network error yields an honest-empty result (empty arrays / null fields) rather
 * than a crash, so the console degrades gracefully when a token is missing or a surface shifts.
 *
 * Secrets are BROKERED: the service key is used to sign outbound calls but is NEVER returned to the
 * client. The anon/publishable key IS returned (it is client-safe by design); the secret key's value
 * is never exposed — only its presence ("state").
 *
 * ── Supabase-API assumptions (documented; verify against a live project) ─────────────────────────
 *   - SQL query:   POST /v1/projects/{ref}/database/query        { query }  → row[]
 *   - migrations:  GET  /v1/projects/{ref}/database/migrations   → { version, name }[] (or { migrations })
 *   - auth config: GET/PATCH /v1/projects/{ref}/config/auth      (GoTrue config; uri_allow_list = CSV)
 *   - api keys:    GET  /v1/projects/{ref}/api-keys?reveal=true  → { name:'anon'|'service_role', api_key }[]
 *   - advisors:    GET  /v1/projects/{ref}/advisors/{security|performance} → { lints: [...] }
 *   - logs:        GET  /v1/projects/{ref}/analytics/endpoints/logs.all?sql=  → { result: [...] } (UNSTABLE)
 *   - rotate key:  POST /v1/projects/{ref}/api-keys              { type:'secret' } (UNCERTAIN — best-effort)
 *   - storage:     GET/POST {projectUrl}/storage/v1/bucket
 *   - users:       GET/POST {projectUrl}/auth/v1/admin/users
 *   - db fallback: GET {projectUrl}/rest/v1/ (OpenAPI → table list) + GET /rest/v1/{table} (browse)
 *                  — used when no management token; PostgREST only exposes configured schemas (public).
 */

const SUPABASE_MGMT_API = "https://api.supabase.com";

/** Uniform, non-throwing fetch result — the whole client degrades to honest-empty on failure. */
interface FetchResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  headers?: Headers;
}

export interface SupabaseConsoleOpts {
  projectRef: string;
  serviceKey: string;
  /** Supabase Management API token (PAT/OAuth). Optional — project-level tabs honest-empty without it. */
  managementToken?: string | null;
}

/** A safe identifier (unquoted) — used to guard the row-browser table/schema against injection. */
function isSafeIdent(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);
}

export class SupabaseConsole {
  readonly projectRef: string;
  readonly projectUrl: string;
  private readonly serviceKey: string;
  private readonly managementToken?: string;

  constructor(opts: SupabaseConsoleOpts) {
    this.projectRef = opts.projectRef.trim();
    this.projectUrl = `https://${this.projectRef}.supabase.co`;
    this.serviceKey = opts.serviceKey;
    this.managementToken = opts.managementToken?.trim() || undefined;
  }

  get hasManagementToken(): boolean {
    return !!this.managementToken;
  }

  // ── low-level fetch wrappers (never throw) ─────────────────────────────────────────────────────

  /** Management API call (needs the management token). Returns honest-empty if the token is absent. */
  private async mfetch<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<FetchResult<T>> {
    if (!this.managementToken) {
      return { ok: false, status: 0, data: null, error: "no management token" };
    }
    return this.raw<T>(`${SUPABASE_MGMT_API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${this.managementToken}` },
    });
  }

  /** Project API call (service_role key as apikey + bearer). */
  private async pfetch<T>(
    path: string,
    init: { method?: string; body?: unknown } = {},
  ): Promise<FetchResult<T>> {
    return this.raw<T>(`${this.projectUrl}${path}`, {
      ...init,
      headers: { apikey: this.serviceKey, Authorization: `Bearer ${this.serviceKey}` },
    });
  }

  private async raw<T>(
    url: string,
    init: { method?: string; body?: unknown; headers: Record<string, string> },
  ): Promise<FetchResult<T>> {
    try {
      const headers: Record<string, string> = { ...init.headers };
      let body: string | undefined;
      if (init.body !== undefined) {
        body = JSON.stringify(init.body);
        headers["Content-Type"] = "application/json";
      }
      const res = await fetch(url, { method: init.method ?? "GET", headers, body });
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = text;
      }
      if (!res.ok) {
        const msg =
          (data as { message?: string; error?: string } | null)?.message ??
          (data as { error?: string } | null)?.error ??
          (typeof data === "string" && data ? data : res.statusText);
        return { ok: false, status: res.status, data: null, error: msg, headers: res.headers };
      }
      return { ok: true, status: res.status, data: data as T, headers: res.headers };
    } catch (err) {
      return { ok: false, status: 0, data: null, error: (err as Error).message };
    }
  }

  /** Run a read SQL statement via the Management API. Returns rows or null (honest-empty). */
  private async runSql<T = Record<string, unknown>>(query: string): Promise<T[] | null> {
    const r = await this.mfetch<unknown>("/v1/projects/" + encodeURIComponent(this.projectRef) + "/database/query", {
      method: "POST",
      body: { query },
    });
    if (!r.ok || r.data == null) return null;
    // The query endpoint may return an array of rows, or wrap them under a key.
    if (Array.isArray(r.data)) return r.data as T[];
    const wrapped = (r.data as { result?: T[]; rows?: T[] }).result ?? (r.data as { rows?: T[] }).rows;
    return Array.isArray(wrapped) ? wrapped : [];
  }

  // ── mirror reads ───────────────────────────────────────────────────────────────────────────────

  /** { connected, projectRef, projectUrl } — always available (derived). */
  overview(): { connected: boolean; projectRef: string; projectUrl: string } {
    return { connected: true, projectRef: this.projectRef, projectUrl: this.projectUrl };
  }

  /**
   * Database tab: schemas + tables (with estimated row counts) and — when `?table=` is given
   * (`schema.name` or `name`, default schema `public`) — up to 50 rows of that table.
   * Prefers the Management API SQL query (all schemas + row estimates + arbitrary browse); falls back
   * to the project's own PostgREST API (service key) when no management token, so the tab still works.
   */
  async database(table?: string): Promise<{
    schemas: string[];
    tables: { schema: string; name: string; rows: number }[];
    rows?: Record<string, unknown>[];
    note?: string;
  }> {
    // ── Preferred path: Management API SQL query (needs the management token) ──
    const listRows = await this.runSql<{ schema: string; name: string; rows: number | string }>(
      `select n.nspname as schema, c.relname as name,
              (case when c.reltuples < 0 then 0 else c.reltuples end)::bigint as rows
         from pg_class c
         join pg_namespace n on n.oid = c.relnamespace
        where c.relkind in ('r','p')
          and n.nspname not in ('pg_catalog','information_schema','pg_toast')
        order by n.nspname, c.relname`,
    );
    if (listRows != null) {
      const tables = listRows.map((r) => ({
        schema: String(r.schema),
        name: String(r.name),
        rows: Number(r.rows) || 0,
      }));
      const schemas = [...new Set(tables.map((t) => t.schema))];
      let rows: Record<string, unknown>[] | undefined;
      if (table && table.trim()) {
        const [schema, name] = this.splitTable(table);
        rows =
          isSafeIdent(schema) && isSafeIdent(name)
            ? (await this.runSql<Record<string, unknown>>(`select * from "${schema}"."${name}" limit 50`)) ?? []
            : [];
      }
      return { schemas, tables, ...(rows !== undefined ? { rows } : {}) };
    }

    // ── Fallback: PostgREST (service key). Table list from the OpenAPI root; rows per table. ──
    return this.databaseViaRest(table);
  }

  /** Split a `schema.name` (or bare `name`) into [schema, name], defaulting the schema to `public`. */
  private splitTable(table: string): [string, string] {
    const parts = table.trim().split(".");
    return parts.length > 1 ? [parts[0], parts[1]] : ["public", parts[0]];
  }

  /**
   * PostgREST fallback for the Database tab (no management token): list the exposed tables from the
   * OpenAPI root (`GET /rest/v1/`), and browse a specific table via `GET /rest/v1/{table}` (exact
   * count from the Content-Range header). PostgREST only exposes the configured schemas (default
   * `public`), so `schema` is reported as `public` and row estimates are only known for the browsed table.
   */
  private async databaseViaRest(table?: string): Promise<{
    schemas: string[];
    tables: { schema: string; name: string; rows: number }[];
    rows?: Record<string, unknown>[];
    note?: string;
  }> {
    const root = await this.pfetch<{ definitions?: Record<string, unknown>; paths?: Record<string, unknown> }>(
      "/rest/v1/",
    );
    if (!root.ok || root.data == null) {
      return { schemas: [], tables: [], note: root.error ?? "database unavailable" };
    }
    // Prefer `definitions` (Swagger 2 — PostgREST); else derive from top-level `/{table}` paths.
    const names = root.data.definitions
      ? Object.keys(root.data.definitions)
      : Object.keys(root.data.paths ?? {})
          .map((p) => p.replace(/^\//, ""))
          .filter((p) => p && !p.startsWith("rpc/"));
    const tables = names.map((name) => ({ schema: "public", name, rows: 0 }));

    let rows: Record<string, unknown>[] | undefined;
    if (table && table.trim()) {
      const [, name] = this.splitTable(table);
      if (isSafeIdent(name)) {
        const r = await this.pfetch<Record<string, unknown>[]>(
          `/rest/v1/${encodeURIComponent(name)}?limit=50`,
          { method: "GET" },
        );
        rows = r.ok && Array.isArray(r.data) ? r.data : [];
      } else {
        rows = [];
      }
    }
    return { schemas: ["public"], tables, ...(rows !== undefined ? { rows } : {}) };
  }

  /** Migrations tab: applied migration history. */
  async migrations(): Promise<{ migrations: { version: string; name: string }[]; note?: string }> {
    const r = await this.mfetch<unknown>(
      `/v1/projects/${encodeURIComponent(this.projectRef)}/database/migrations`,
    );
    if (!r.ok || r.data == null) {
      return { migrations: [], ...(this.hasManagementToken ? {} : { note: "no management token" }) };
    }
    const arr = Array.isArray(r.data)
      ? (r.data as Record<string, unknown>[])
      : ((r.data as { migrations?: Record<string, unknown>[] }).migrations ?? []);
    const migrations = arr.map((m) => ({
      version: String(m.version ?? m.id ?? ""),
      name: String(m.name ?? m.version ?? ""),
    }));
    return { migrations };
  }

  /** Storage tab: buckets (via the project storage API + service key). */
  async storage(): Promise<{ buckets: Record<string, unknown>[]; note?: string }> {
    const r = await this.pfetch<Record<string, unknown>[]>("/storage/v1/bucket");
    if (!r.ok || !Array.isArray(r.data)) {
      return { buckets: [], note: r.error };
    }
    const buckets = r.data.map((b) => ({
      id: b.id,
      name: b.name,
      public: b.public,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
    }));
    return { buckets };
  }

  /** Authentication tab: a SAFE subset of the GoTrue config + redirect URLs + provider flags. */
  async auth(): Promise<{
    settings: Record<string, unknown>;
    redirectUrls: string[];
    providers: { name: string; enabled: boolean }[];
    note?: string;
  }> {
    const r = await this.mfetch<Record<string, unknown>>(
      `/v1/projects/${encodeURIComponent(this.projectRef)}/config/auth`,
    );
    if (!r.ok || r.data == null) {
      return { settings: {}, redirectUrls: [], providers: [], ...(this.hasManagementToken ? {} : { note: "no management token" }) };
    }
    const c = r.data;
    // Curated, non-secret settings only (never pass through SMTP passwords etc.).
    const settings = {
      disableSignup: c.disable_signup ?? null,
      anonymousUsers: c.external_anonymous_users_enabled ?? null,
      emailEnabled: c.external_email_enabled ?? null,
      phoneEnabled: c.external_phone_enabled ?? null,
      autoconfirmEmail: c.mailer_autoconfirm ?? null,
      autoconfirmSms: c.sms_autoconfirm ?? null,
      siteUrl: c.site_url ?? null,
      jwtExpiry: c.jwt_exp ?? null,
    };
    const allow = typeof c.uri_allow_list === "string" ? c.uri_allow_list : "";
    const redirectUrls = allow.split(",").map((s) => s.trim()).filter(Boolean);
    // Provider flags: external_<name>_enabled, excluding the email/phone/anonymous "channels".
    const skip = new Set(["email", "phone", "anonymous_users"]);
    const providers: { name: string; enabled: boolean }[] = [];
    for (const [k, v] of Object.entries(c)) {
      const m = /^external_(.+)_enabled$/.exec(k);
      if (m && !skip.has(m[1])) providers.push({ name: m[1], enabled: !!v });
    }
    return { settings, redirectUrls, providers };
  }

  /** Users tab: recent signups (+ a daily series derived from the page) via the auth-admin API. */
  async users(): Promise<{
    count: number;
    recent: Record<string, unknown>[];
    series?: { date: string; count: number }[];
    note?: string;
  }> {
    const r = await this.pfetch<{ users?: Record<string, unknown>[] }>(
      "/auth/v1/admin/users?page=1&per_page=20",
    );
    if (!r.ok || r.data == null) {
      return { count: 0, recent: [], note: r.error };
    }
    const users = Array.isArray(r.data.users) ? r.data.users : [];
    const totalHeader = r.headers?.get("x-total-count");
    const count = totalHeader ? Number(totalHeader) || users.length : users.length;
    const recent = users.map((u) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at,
    }));
    // Daily series from the fetched page (best-effort — a full timeseries needs analytics).
    const byDay = new Map<string, number>();
    for (const u of users) {
      const created = u.created_at ? String(u.created_at).slice(0, 10) : null;
      if (created) byDay.set(created, (byDay.get(created) ?? 0) + 1);
    }
    const series = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, c]) => ({ date, count: c }));
    return { count, recent, series };
  }

  /** Secrets tab: project URL + the publishable (anon) key; the secret key's STATE only (never its value). */
  async secrets(): Promise<{
    projectUrl: string;
    publishableKey: string | null;
    secretKeyState: "present" | "absent" | "unknown";
    note?: string;
  }> {
    const r = await this.mfetch<Record<string, unknown>[]>(
      `/v1/projects/${encodeURIComponent(this.projectRef)}/api-keys?reveal=true`,
    );
    if (!r.ok || !Array.isArray(r.data)) {
      return {
        projectUrl: this.projectUrl,
        publishableKey: null,
        secretKeyState: "unknown",
        ...(this.hasManagementToken ? {} : { note: "no management token" }),
      };
    }
    // Support both legacy (name: 'anon' | 'service_role') and the new (type: 'publishable' | 'secret').
    const anon = r.data.find(
      (k) => k.name === "anon" || k.type === "publishable" || k.name === "publishable",
    );
    const secret = r.data.find(
      (k) => k.name === "service_role" || k.type === "secret" || k.name === "secret",
    );
    return {
      projectUrl: this.projectUrl,
      publishableKey: typeof anon?.api_key === "string" ? anon.api_key : null,
      secretKeyState: secret ? "present" : "absent",
    };
  }

  /** Logs tab: recent function/edge logs (UNSTABLE analytics endpoint — honest-empty on any failure). */
  async logs(): Promise<{ logs: Record<string, unknown>[]; note?: string }> {
    const sql =
      "select id, timestamp, event_message from edge_logs order by timestamp desc limit 50";
    const r = await this.mfetch<unknown>(
      `/v1/projects/${encodeURIComponent(this.projectRef)}/analytics/endpoints/logs.all?sql=${encodeURIComponent(sql)}`,
    );
    if (!r.ok || r.data == null) {
      return { logs: [], note: this.hasManagementToken ? "logs unavailable" : "no management token" };
    }
    const result = Array.isArray(r.data)
      ? (r.data as Record<string, unknown>[])
      : ((r.data as { result?: Record<string, unknown>[] }).result ?? []);
    return { logs: Array.isArray(result) ? result : [] };
  }

  /** Suggestions tab: security + performance advisors, normalized to { title, level, category, detail }. */
  async suggestions(): Promise<{
    advisors: { title: string; level: string; category: string; detail: string }[];
    note?: string;
  }> {
    const [sec, perf] = await Promise.all([
      this.mfetch<{ lints?: Record<string, unknown>[] }>(
        `/v1/projects/${encodeURIComponent(this.projectRef)}/advisors/security`,
      ),
      this.mfetch<{ lints?: Record<string, unknown>[] }>(
        `/v1/projects/${encodeURIComponent(this.projectRef)}/advisors/performance`,
      ),
    ]);
    if (!sec.ok && !perf.ok) {
      return { advisors: [], ...(this.hasManagementToken ? {} : { note: "no management token" }) };
    }
    const lints = [...(sec.data?.lints ?? []), ...(perf.data?.lints ?? [])];
    const advisors = lints.map((l) => ({
      title: String(l.title ?? l.name ?? "advisor"),
      level: String(l.level ?? "info"),
      category: String(
        Array.isArray(l.categories) ? l.categories.join(", ") : (l.category ?? "general"),
      ),
      detail: String(l.detail ?? l.description ?? ""),
    }));
    return { advisors };
  }

  // ── key actions (minimal, best-effort) ──────────────────────────────────────────────────────────

  /**
   * Generate/rotate a project secret key. UNCERTAIN API — best-effort POST to the api-keys endpoint;
   * the created key value is NOT returned to the caller (brokered). → { ok, state?, error? }.
   */
  async rotateSecretKey(): Promise<{ ok: boolean; state?: string; error?: string }> {
    const r = await this.mfetch<Record<string, unknown>>(
      `/v1/projects/${encodeURIComponent(this.projectRef)}/api-keys`,
      { method: "POST", body: { type: "secret", name: "secret", description: "rotated via Lu console" } },
    );
    if (!r.ok) return { ok: false, error: r.error ?? "rotate not supported" };
    return { ok: true, state: "present" };
  }

  /** Add a redirect URL to the auth allow-list (read config → append → PATCH). Best-effort. */
  async addRedirectUrl(url: string): Promise<{ ok: boolean; redirectUrls?: string[]; error?: string }> {
    const cur = await this.mfetch<Record<string, unknown>>(
      `/v1/projects/${encodeURIComponent(this.projectRef)}/config/auth`,
    );
    if (!cur.ok || cur.data == null) return { ok: false, error: cur.error ?? "could not read auth config" };
    const allow = typeof cur.data.uri_allow_list === "string" ? cur.data.uri_allow_list : "";
    const list = allow.split(",").map((s) => s.trim()).filter(Boolean);
    if (!list.includes(url.trim())) list.push(url.trim());
    const patch = await this.mfetch<Record<string, unknown>>(
      `/v1/projects/${encodeURIComponent(this.projectRef)}/config/auth`,
      { method: "PATCH", body: { uri_allow_list: list.join(",") } },
    );
    if (!patch.ok) return { ok: false, error: patch.error ?? "could not update auth config" };
    return { ok: true, redirectUrls: list };
  }

  /** Create a storage bucket (project storage API). Best-effort. */
  async createBucket(
    name: string,
    isPublic = false,
  ): Promise<{ ok: boolean; bucket?: unknown; error?: string }> {
    const r = await this.pfetch<Record<string, unknown>>("/storage/v1/bucket", {
      method: "POST",
      body: { id: name, name, public: isPublic },
    });
    if (!r.ok) return { ok: false, error: r.error ?? "could not create bucket" };
    return { ok: true, bucket: r.data };
  }

  /** Add an auth user (project auth-admin API). Best-effort. Never echoes the password back. */
  async addUser(
    email: string,
    password?: string,
  ): Promise<{ ok: boolean; user?: { id?: unknown; email?: unknown }; error?: string }> {
    const body: Record<string, unknown> = { email, email_confirm: true };
    if (password) body.password = password;
    const r = await this.pfetch<Record<string, unknown>>("/auth/v1/admin/users", {
      method: "POST",
      body,
    });
    if (!r.ok) return { ok: false, error: r.error ?? "could not create user" };
    return { ok: true, user: { id: r.data?.id, email: r.data?.email } };
  }
}

/**
 * Build a SupabaseConsole for an org from its stored connection, or null when the org has no usable
 * Supabase connection (→ the route returns an honest-empty, disconnected payload).
 */
export async function consoleForOrg(
  store: { getSupabaseConnection(orgId: string): Promise<{ projectRef: string; serviceKey: string | null; managementToken: string | null } | null> },
  orgId: string,
): Promise<SupabaseConsole | null> {
  const conn = await store.getSupabaseConnection(orgId);
  if (!conn || !conn.projectRef || !conn.serviceKey) return null;
  return new SupabaseConsole({
    projectRef: conn.projectRef,
    serviceKey: conn.serviceKey,
    managementToken: conn.managementToken,
  });
}
