import type { Request, Response } from "express";
import type { Store } from "../store/types.js";
import { consoleForOrg, type SupabaseConsole } from "../console/supabase.js";

/**
 * The console proxy (docs/product.md �4 §"the hub" — the department's Database-view). Each endpoint
 * MIRRORS the company's one shared, Engineering-anchored Supabase project via the Management API +
 * the project's own APIs (see console/supabase.ts). All routes are org-scoped (`?orgId=`), return
 * normalized JSON, and are **honest-empty** when the org has no Supabase connection — never a crash.
 *
 *   GET  /api/console/overview     → { connected, projectRef, projectUrl }
 *   GET  /api/console/database     (+ ?table=) → { schemas, tables, rows? }
 *   GET  /api/console/migrations   → { migrations }
 *   GET  /api/console/storage      → { buckets }
 *   GET  /api/console/auth         → { settings, redirectUrls, providers }
 *   GET  /api/console/users        → { count, recent, series? }
 *   GET  /api/console/secrets      → { projectUrl, publishableKey, secretKeyState }   (service key never leaves the server)
 *   GET  /api/console/logs         → { logs }
 *   GET  /api/console/suggestions  → { advisors }
 *   POST /api/console/secrets/rotate  { orgId }                       → rotate the project secret key
 *   POST /api/console/auth/redirect   { orgId, url }                  → add an auth redirect URL
 *   POST /api/console/storage/buckets { orgId, name, public? }        → create a bucket
 *   POST /api/console/users           { orgId, email, password? }     → add an auth user
 */
export interface ConsoleRouteDeps {
  store: Store;
}

/** Read the (required) orgId (query for GET, body for POST); writes a 400 + returns undefined if absent. */
function requireOrgId(req: Request, res: Response): string | undefined {
  const raw = req.query.orgId ?? req.query.org_id ?? req.body?.orgId ?? req.body?.org_id;
  if (typeof raw !== "string" || raw.trim() === "") {
    res.status(400).json({ error: "orgId is required" });
    return undefined;
  }
  return raw.trim();
}

/**
 * Resolve the org's SupabaseConsole. Returns the console, or null AFTER already sending `notConnected`
 * as the 200 body — so a caller can `if (!c) return;`. Keeps every endpoint honest-empty uniformly.
 */
async function resolveConsole(
  deps: ConsoleRouteDeps,
  orgId: string,
  res: Response,
  notConnected: Record<string, unknown>,
): Promise<SupabaseConsole | null> {
  const c = await consoleForOrg(deps.store, orgId);
  if (!c) {
    res.status(200).json({ connected: false, ...notConnected });
    return null;
  }
  return c;
}

/** Wrap a handler with a uniform 500 on unexpected throw (the client-facing paths are best-effort). */
function guard(name: string, fn: (req: Request, res: Response) => Promise<void>) {
  return async function handler(req: Request, res: Response): Promise<void> {
    try {
      await fn(req, res);
    } catch (err) {
      console.error(`[/api/console/${name}] error:`, err);
      if (!res.headersSent) res.status(500).json({ error: `failed to read ${name}` });
    }
  };
}

// ── mirror reads ───────────────────────────────────────────────────────────────────────────────

export function createConsoleOverviewRoute(deps: ConsoleRouteDeps) {
  return guard("overview", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { projectRef: null, projectUrl: null });
    if (!c) return;
    res.status(200).json(c.overview());
  });
}

export function createConsoleDatabaseRoute(deps: ConsoleRouteDeps) {
  return guard("database", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { schemas: [], tables: [] });
    if (!c) return;
    const table = typeof req.query.table === "string" ? req.query.table : undefined;
    res.status(200).json({ connected: true, ...(await c.database(table)) });
  });
}

export function createConsoleMigrationsRoute(deps: ConsoleRouteDeps) {
  return guard("migrations", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { migrations: [] });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.migrations()) });
  });
}

export function createConsoleStorageRoute(deps: ConsoleRouteDeps) {
  return guard("storage", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { buckets: [] });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.storage()) });
  });
}

export function createConsoleAuthRoute(deps: ConsoleRouteDeps) {
  return guard("auth", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { settings: {}, redirectUrls: [], providers: [] });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.auth()) });
  });
}

export function createConsoleUsersRoute(deps: ConsoleRouteDeps) {
  return guard("users", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { count: 0, recent: [] });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.users()) });
  });
}

export function createConsoleSecretsRoute(deps: ConsoleRouteDeps) {
  return guard("secrets", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, {
      projectUrl: null,
      publishableKey: null,
      secretKeyState: "unknown",
    });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.secrets()) });
  });
}

export function createConsoleLogsRoute(deps: ConsoleRouteDeps) {
  return guard("logs", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { logs: [] });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.logs()) });
  });
}

export function createConsoleSuggestionsRoute(deps: ConsoleRouteDeps) {
  return guard("suggestions", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { advisors: [] });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.suggestions()) });
  });
}

// ── key actions (POST) ───────────────────────────────────────────────────────────────────────────

export function createConsoleRotateSecretRoute(deps: ConsoleRouteDeps) {
  return guard("secrets/rotate", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const c = await resolveConsole(deps, orgId, res, { ok: false });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.rotateSecretKey()) });
  });
}

export function createConsoleAddRedirectRoute(deps: ConsoleRouteDeps) {
  return guard("auth/redirect", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const url = req.body?.url;
    if (typeof url !== "string" || url.trim() === "") {
      res.status(400).json({ ok: false, error: "url is required" });
      return;
    }
    const c = await resolveConsole(deps, orgId, res, { ok: false });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.addRedirectUrl(url.trim())) });
  });
}

export function createConsoleCreateBucketRoute(deps: ConsoleRouteDeps) {
  return guard("storage/buckets", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const name = req.body?.name;
    if (typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ ok: false, error: "name is required" });
      return;
    }
    const c = await resolveConsole(deps, orgId, res, { ok: false });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.createBucket(name.trim(), !!req.body?.public)) });
  });
}

export function createConsoleAddUserRoute(deps: ConsoleRouteDeps) {
  return guard("users", async (req, res) => {
    const orgId = requireOrgId(req, res);
    if (!orgId) return;
    const email = req.body?.email;
    if (typeof email !== "string" || email.trim() === "") {
      res.status(400).json({ ok: false, error: "email is required" });
      return;
    }
    const password = typeof req.body?.password === "string" ? req.body.password : undefined;
    const c = await resolveConsole(deps, orgId, res, { ok: false });
    if (!c) return;
    res.status(200).json({ connected: true, ...(await c.addUser(email.trim(), password)) });
  });
}
