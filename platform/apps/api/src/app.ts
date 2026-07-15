import express, { type Express } from "express";
import type { LanguageModel } from "ai";
import type { EmailSender, SmsSender } from "@leadanswered/core";
import { allowInboundLeads, usePostgres, useTwilio, useGoogleCalendar } from "./env.js";
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
import {
  createGoogleConnectRoute,
  createGoogleCallbackRoute,
  createGoogleDisconnectRoute,
} from "./calendar/google/oauthRoutes.js";
import { createGoogleNotifyRoute } from "./calendar/google/notifyRoute.js";
import { createAppointmentChangeRoute } from "./routes/appointments.js";
import { createProvisionRoute, createListDepartmentsRoute } from "./routes/onboarding.js";
import { testOrganization, testRecipients } from "./seed.js";

export interface BuildDeps {
  store?: Store;
  model?: LanguageModel;
  sms?: SmsSender;
  email?: EmailSender;
  now?: () => Date;
}

/** Production: Postgres via Prisma. Demo: in-memory store seeded with the test organization. */
export async function buildStore(): Promise<Store> {
  if (usePostgres()) {
    const { PrismaStore } = await import("./store/prismaStore.js");
    return new PrismaStore();
  }
  const mem = new MemoryStore();
  mem.seedOrganization(testOrganization, testRecipients);
  console.warn(
    "[api] DATABASE_URL not set — using in-memory store (data not persisted). Seeded test organization 'Apex Roofing'.",
  );
  return mem;
}

export async function createApp(overrides: BuildDeps = {}): Promise<Express> {
  const store = overrides.store ?? (await buildStore());
  const model = overrides.model ?? getModel();
  const sms =
    overrides.sms ??
    (useTwilio()
      ? new TwilioSmsSender(testOrganization.twilioNumber!)
      : new ConsoleSmsSender());
  const email =
    overrides.email ??
    (env.POSTMARK_SERVER_TOKEN
      ? new PostmarkEmailSender(env.POSTMARK_SERVER_TOKEN, `sarah@${env.LEAD_EMAIL_DOMAIN}`)
      : new ConsoleEmailSender());

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

  // Lu Computer — onboarding provisioning + department reads (ONBOARDING.md §3/§4).
  app.post("/api/onboarding/provision", createProvisionRoute(deps));
  app.get("/api/departments", createListDepartmentsRoute(deps));

  // Google Calendar OAuth + inbound push webhook (inert unless GOOGLE creds + token key are set).
  if (useGoogleCalendar()) {
    app.get("/google/connect", createGoogleConnectRoute());
    app.get("/google/callback", createGoogleCallbackRoute(store));
    app.post("/google/disconnect", createGoogleDisconnectRoute(store));
    app.post("/google/notifications", createGoogleNotifyRoute(deps));
  }

  // Dashboard-initiated appointment change (cancel/reschedule) — the other trigger of applyOwnerChange.
  // Works even without Google connected (it just won't push); needs the shared state secret to auth the web.
  if (env.CALENDAR_STATE_SECRET) {
    app.post("/appointments/change", createAppointmentChangeRoute(deps));
  }

  return app;
}
