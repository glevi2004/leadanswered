import express, { type Express } from "express";
import { usePostgres } from "./env.js";
import type { Store } from "./store/types.js";
import { MemoryStore } from "./store/memoryStore.js";
import {
  createProvisionRoute,
  createListDepartmentsRoute,
  createSeedContextRoute,
  createOnboardingStatusRoute,
} from "./routes/onboarding.js";
import { createLuRoute, createEngineeringRoute } from "./routes/agents.js";
import {
  createListTasksRoute,
  createListArtifactsRoute,
  createListApprovalsRoute,
  createListSitesRoute,
  createUsageRoute,
  createLuHistoryRoute,
  createListEventsRoute,
} from "./routes/reads.js";
import { createResolveApprovalRoute } from "./routes/approvals.js";
import { createSlackEventsRoute, createSlackInteractiveRoute } from "./routes/slack.js";
import {
  createConnectGithubRoute,
  createConnectVercelRoute,
  createConnectSupabaseRoute,
  createDisconnectGithubRoute,
  createDisconnectVercelRoute,
  createDisconnectSupabaseRoute,
  createConnectStatusRoute,
  createSupabaseProjectsRoute,
} from "./routes/connect.js";
import {
  createListReposRoute,
  createImportProjectRoute,
  createUpdateProfileRoute,
} from "./routes/projects.js";
import {
  createConsoleOverviewRoute,
  createConsoleDatabaseRoute,
  createConsoleMigrationsRoute,
  createConsoleStorageRoute,
  createConsoleAuthRoute,
  createConsoleUsersRoute,
  createConsoleSecretsRoute,
  createConsoleLogsRoute,
  createConsoleSuggestionsRoute,
  createConsoleRotateSecretRoute,
  createConsoleAddRedirectRoute,
  createConsoleCreateBucketRoute,
  createConsoleAddUserRoute,
} from "./routes/console.js";
import {
  createGetCanvasRoute,
  createCreateNodeRoute,
  createUpdateNodeRoute,
  createDeleteNodeRoute,
  createCreateEdgeRoute,
  createDeleteEdgeRoute,
  createCreateCollectionRoute,
} from "./routes/canvas.js";

export interface BuildDeps {
  store?: Store;
  now?: () => Date;
}

/** Production: Postgres via Prisma. Otherwise an in-memory store (data not persisted). */
export async function buildStore(): Promise<Store> {
  if (usePostgres()) {
    const { PrismaStore } = await import("./store/prismaStore.js");
    return new PrismaStore();
  }
  console.warn("[api] DATABASE_URL not set — using in-memory store (data not persisted).");
  return new MemoryStore();
}

export async function createApp(overrides: BuildDeps = {}): Promise<Express> {
  const store = overrides.store ?? (await buildStore());
  const deps = { store, now: overrides.now };

  const app = express();

  // SLACK (ladder step 4) — registered BEFORE the json middleware because Slack's signature
  // covers the raw bytes; their own signature check is their auth (exempted from proxy auth).
  app.post("/api/slack/events", express.raw({ type: "*/*" }), createSlackEventsRoute());
  app.post("/api/slack/interactive", express.raw({ type: "*/*" }), createSlackInteractiveRoute());

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // PROXY AUTH (DEVELOPMENT §"critical path" item 1): every /api/* request must carry the
  // shared secret the web proxy injects — otherwise any caller could act as any org by
  // passing an orgId. Enforced ONLY when API_PROXY_SECRET is set (so local dev and tests
  // are unaffected until the env lands); /health stays open for platform probes. The
  // terminal WebSocket upgrade does not pass through this middleware — its hardening is
  // tracked separately (harness-spec §3 secrets).
  const proxySecret = process.env.API_PROXY_SECRET;
  if (proxySecret) {
    app.use("/api", (req, res, next) => {
      // Slack routes authenticate with Slack's own request signature (and are mounted above
      // the json middleware anyway) — never gate them on the proxy secret.
      if (req.path.startsWith("/slack/")) return next();
      if (req.headers["x-lu-proxy-secret"] === proxySecret) return next();
      res.status(401).json({ error: "unauthorized" });
    });
    console.log("[api] proxy auth ON — /api/* requires x-lu-proxy-secret");
  } else {
    console.warn("[api] API_PROXY_SECRET not set — /api/* is unauthenticated (dev mode)");
  }

  // Lu Computer — onboarding provisioning + department reads.
  app.post("/api/onboarding/provision", createProvisionRoute(deps));
  app.post("/api/onboarding/context", createSeedContextRoute(deps));
  app.get("/api/onboarding/status", createOnboardingStatusRoute(deps));
  app.get("/api/departments", createListDepartmentsRoute(deps));

  // Lu Computer — the agents over HTTP: the Lu orchestrator + the (async) Engineering agent.
  app.post("/api/lu", createLuRoute(deps));
  app.post("/api/engineering", createEngineeringRoute(deps));

  // Lu Computer — read routes the canvas polls to WATCH the Engineer work.
  app.get("/api/tasks", createListTasksRoute(deps));
  app.get("/api/artifacts", createListArtifactsRoute(deps));
  app.get("/api/approvals", createListApprovalsRoute(deps));
  app.get("/api/sites", createListSitesRoute(deps));
  app.get("/api/usage", createUsageRoute(deps));
  app.get("/api/lu/history", createLuHistoryRoute(deps));
  app.get("/api/events", createListEventsRoute(deps));

  // Lu Computer — the owner's Publish button closes the approval gate (→ confirmPublish).
  app.post("/api/approvals/:id/resolve", createResolveApprovalRoute(deps));

  // BYO connect — token-paste per-org GitHub / Vercel / Supabase connections (docs/system.md �6).
  app.post("/api/connect/github", createConnectGithubRoute(deps));
  app.post("/api/connect/vercel", createConnectVercelRoute(deps));
  app.post("/api/connect/supabase", createConnectSupabaseRoute(deps));
  app.delete("/api/connect/github", createDisconnectGithubRoute(deps));
  app.delete("/api/connect/vercel", createDisconnectVercelRoute(deps));
  app.delete("/api/connect/supabase", createDisconnectSupabaseRoute(deps));
  app.get("/api/connect/status", createConnectStatusRoute(deps));
  app.get("/api/connect/supabase/projects", createSupabaseProjectsRoute(deps));

  // Lu Computer — existing-project import + repo profiles (ladder step 2).
  app.get("/api/github/repos", createListReposRoute(deps));
  app.post("/api/projects/import", createImportProjectRoute(deps));
  app.post("/api/projects/profile", createUpdateProfileRoute(deps));

  // Lu Computer — the console proxy (docs/product.md �4 §"the hub"): the department's Database-view
  // mirrors the company's one shared Supabase project (Management API + project APIs). Honest-empty
  // when unconnected; the service key is brokered and never leaves the server.
  app.get("/api/console/overview", createConsoleOverviewRoute(deps));
  app.get("/api/console/database", createConsoleDatabaseRoute(deps));
  app.get("/api/console/migrations", createConsoleMigrationsRoute(deps));
  app.get("/api/console/storage", createConsoleStorageRoute(deps));
  app.get("/api/console/auth", createConsoleAuthRoute(deps));
  app.get("/api/console/users", createConsoleUsersRoute(deps));
  app.get("/api/console/secrets", createConsoleSecretsRoute(deps));
  app.get("/api/console/logs", createConsoleLogsRoute(deps));
  app.get("/api/console/suggestions", createConsoleSuggestionsRoute(deps));
  app.post("/api/console/secrets/rotate", createConsoleRotateSecretRoute(deps));
  app.post("/api/console/auth/redirect", createConsoleAddRedirectRoute(deps));
  app.post("/api/console/storage/buckets", createConsoleCreateBucketRoute(deps));
  app.post("/api/console/users", createConsoleAddUserRoute(deps));

  // Lu Computer — the composable canvas (cockpit.md Part C): nodes/edges/collections persist
  // per org so the canvas survives reloads and edges are the agents' working-set grants.
  app.get("/api/canvas", createGetCanvasRoute(deps));
  app.post("/api/canvas/nodes", createCreateNodeRoute(deps));
  app.patch("/api/canvas/nodes/:id", createUpdateNodeRoute(deps));
  app.delete("/api/canvas/nodes/:id", createDeleteNodeRoute(deps));
  app.post("/api/canvas/edges", createCreateEdgeRoute(deps));
  app.delete("/api/canvas/edges/:id", createDeleteEdgeRoute(deps));
  app.post("/api/canvas/collections", createCreateCollectionRoute(deps));

  return app;
}
