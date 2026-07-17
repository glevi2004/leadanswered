import express, { type Express } from "express";
import { usePostgres } from "./env.js";
import type { Store } from "./store/types.js";
import { MemoryStore } from "./store/memoryStore.js";
import { createProvisionRoute, createListDepartmentsRoute } from "./routes/onboarding.js";
import { createLuRoute, createEngineeringRoute } from "./routes/agents.js";
import {
  createListTasksRoute,
  createListArtifactsRoute,
  createListApprovalsRoute,
  createListSitesRoute,
  createUsageRoute,
} from "./routes/reads.js";
import { createResolveApprovalRoute } from "./routes/approvals.js";
import {
  createConnectGithubRoute,
  createConnectVercelRoute,
  createConnectSupabaseRoute,
  createDisconnectGithubRoute,
  createDisconnectVercelRoute,
  createDisconnectSupabaseRoute,
  createConnectStatusRoute,
} from "./routes/connect.js";
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
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Lu Computer — onboarding provisioning + department reads.
  app.post("/api/onboarding/provision", createProvisionRoute(deps));
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

  // Lu Computer — the owner's Publish button closes the approval gate (→ confirmPublish).
  app.post("/api/approvals/:id/resolve", createResolveApprovalRoute(deps));

  // BYO connect — token-paste per-org GitHub / Vercel / Supabase connections (docs/byo-connect.md).
  app.post("/api/connect/github", createConnectGithubRoute(deps));
  app.post("/api/connect/vercel", createConnectVercelRoute(deps));
  app.post("/api/connect/supabase", createConnectSupabaseRoute(deps));
  app.delete("/api/connect/github", createDisconnectGithubRoute(deps));
  app.delete("/api/connect/vercel", createDisconnectVercelRoute(deps));
  app.delete("/api/connect/supabase", createDisconnectSupabaseRoute(deps));
  app.get("/api/connect/status", createConnectStatusRoute(deps));

  // Lu Computer — the console proxy (docs/canvas.md §"the hub"): the department's Database-view
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
