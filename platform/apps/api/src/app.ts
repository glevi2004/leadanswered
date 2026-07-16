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
} from "./routes/reads.js";
import { createResolveApprovalRoute } from "./routes/approvals.js";
import {
  createConnectGithubRoute,
  createConnectVercelRoute,
  createDisconnectGithubRoute,
  createDisconnectVercelRoute,
  createConnectStatusRoute,
} from "./routes/connect.js";

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

  // Lu Computer — the owner's Publish button closes the approval gate (→ confirmPublish).
  app.post("/api/approvals/:id/resolve", createResolveApprovalRoute(deps));

  // BYO connect — token-paste per-org GitHub / Vercel connections (docs/byo-connect.md).
  app.post("/api/connect/github", createConnectGithubRoute(deps));
  app.post("/api/connect/vercel", createConnectVercelRoute(deps));
  app.delete("/api/connect/github", createDisconnectGithubRoute(deps));
  app.delete("/api/connect/vercel", createDisconnectVercelRoute(deps));
  app.get("/api/connect/status", createConnectStatusRoute(deps));

  return app;
}
