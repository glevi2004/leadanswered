import express, { type Express } from "express";
import type { LanguageModel } from "ai";
import type { EmailSender, SmsSender } from "@leadanswered/core";
import { allowInboundLeads, usePostgres, useTwilio } from "./env.js";
import type { Store } from "./store/types.js";
import { MemoryStore } from "./store/memoryStore.js";
import { ConsoleSmsSender, TwilioSmsSender } from "./sms.js";
import { ConsoleEmailSender, PostmarkEmailSender } from "./email.js";
import { env } from "./env.js";
import { getModel } from "./agent/provider.js";
import { createLeadRoute } from "./routes/lead.js";
import { createWebhookRoute } from "./routes/webhook.js";
import { createVoiceRoute } from "./routes/voice.js";
import { createEmailWebhookRoute } from "./routes/emailWebhook.js";
import { DemoBus, SplitSmsSender, createDemoRouter, type DemoConfig } from "./demo.js";
import { testContractor, testRecipients } from "./seed.js";

export interface BuildDeps {
  store?: Store;
  model?: LanguageModel;
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
  const model = overrides.model ?? getModel();
  const baseSms =
    overrides.sms ??
    (useTwilio()
      ? new TwilioSmsSender(testContractor.twilioNumber!)
      : new ConsoleSmsSender());
  const email =
    overrides.email ??
    (env.POSTMARK_SERVER_TOKEN
      ? new PostmarkEmailSender(env.POSTMARK_SERVER_TOKEN, `sarah@${env.LEAD_EMAIL_DOMAIN}`)
      : new ConsoleEmailSender());

  // Demo harness (SCOPE §5.3): tee the demo contractor's OWNER thread to a browser phone. Off unless
  // DEMO_TOKEN is set; never wraps when the caller injected its own sms (tests).
  let sms: SmsSender = baseSms;
  let demoBus: DemoBus | null = null;
  let demoConfig: DemoConfig | null = null;
  if (env.DEMO_TOKEN && !overrides.sms) {
    const c = await store.getContractorBySlug(env.DEMO_CONTRACTOR_SLUG);
    const phones = c
      ? (await store.getRecipients(c.id)).map((r) => r.phone).filter((p): p is string => !!p)
      : [];
    if (c?.twilioNumber && phones.length > 0) {
      demoBus = new DemoBus();
      sms = new SplitSmsSender(baseSms, new Set(phones), demoBus);
      demoConfig = { token: env.DEMO_TOKEN, twilioNumber: c.twilioNumber, ownerPhone: phones[0] };
      console.log(`[demo] contractor phone enabled for '${c.companyName}' — owner thread → browser`);
    } else {
      console.warn(`[demo] DEMO_TOKEN set but no contractor '${env.DEMO_CONTRACTOR_SLUG}' with a recipient phone — demo phone off`);
    }
  }

  const deps = {
    store,
    model,
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
  app.post("/webhooks/twilio/voice", createVoiceRoute(deps));
  app.post("/webhooks/email/postmark/:secret", createEmailWebhookRoute(deps));
  if (demoConfig && demoBus) {
    app.use("/demo", createDemoRouter(deps, demoBus, demoConfig));
  }

  return app;
}
