import express, { type Express } from "express";
import { usePostgres } from "./env.js";
import type { Store } from "./store/types.js";
import { MemoryStore } from "./store/memoryStore.js";
import { createProvisionRoute, createListDepartmentsRoute } from "./routes/onboarding.js";
import { createLuRoute, createEngineeringRoute } from "./routes/agents.js";

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

  // Lu Computer — the agents over HTTP: the Lu orchestrator + the Engineering agent.
  app.post("/api/lu", createLuRoute(deps));
  app.post("/api/engineering", createEngineeringRoute(deps));

  return app;
}
