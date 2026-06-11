import express, { type Express } from "express";
import type { EmailSender, SmsSender } from "@leadanswered/core";
import { allowInboundLeads, usePostgres, useTwilio } from "./env.js";
import type { Store } from "./store/types.js";
import { MemoryStore } from "./store/memoryStore.js";
import { ConsoleSmsSender, TwilioSmsSender } from "./sms.js";
import { ConsoleEmailSender } from "./email.js";
import { ClaudeAi, type SarahAi } from "./claude.js";
import { createLeadRoute } from "./routes/lead.js";
import { createWebhookRoute } from "./routes/webhook.js";
import { testContractor, testRecipients } from "./seed.js";

export interface BuildDeps {
  store?: Store;
  ai?: SarahAi;
  sms?: SmsSender;
  email?: EmailSender;
  now?: () => Date;
}

/** Production: Postgres via Prisma. Demo: in-memory store seeded with the test contractor. */
export async function buildStore(): Promise<Store> {
  if (usePostgres()) {
    const { PrismaStore } = await import("./store/prismaStore.js");
    return new PrismaStore();
  }
  const mem = new MemoryStore();
  mem.seedContractor(testContractor, testRecipients);
  console.warn(
    "[api] DATABASE_URL not set — using in-memory store (data not persisted). Seeded test contractor 'Apex Roofing'.",
  );
  return mem;
}

export async function createApp(overrides: BuildDeps = {}): Promise<Express> {
  const store = overrides.store ?? (await buildStore());
  const ai = overrides.ai ?? new ClaudeAi();
  const sms =
    overrides.sms ??
    (useTwilio()
      ? new TwilioSmsSender(testContractor.twilioNumber!)
      : new ConsoleSmsSender());
  const email = overrides.email ?? new ConsoleEmailSender();
  const deps = {
    store,
    ai,
    sms,
    email,
    now: overrides.now,
    allowColdInbound: allowInboundLeads(),
  };

  const app = express();
  app.use(express.urlencoded({ extended: false })); // Twilio posts form-encoded
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/lead", createLeadRoute(deps));
  app.post("/webhooks/twilio/sms", createWebhookRoute(deps));

  return app;
}
