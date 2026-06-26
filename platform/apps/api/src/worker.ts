import { Worker } from "bullmq";
import { env } from "./env.js";
import { startTelemetry } from "./telemetry.js";
import { PrismaStore } from "./store/prismaStore.js";
import { TwilioSmsSender, ConsoleSmsSender } from "./sms.js";
import { ConsoleEmailSender, PostmarkEmailSender } from "./email.js";
import { runNudgeJob } from "./jobs/nudge.js";

/**
 * The background worker (SCOPE §3.1C): processes delayed/async jobs that must not
 * block a webhook — currently the quiet-lead nudge. Run as its own always-on
 * process (apps/worker). Requires REDIS_URL. Reuses the same Store + senders + job
 * logic as the api, so behaviour is identical to the in-process tests.
 */
export function runWorker(): Worker {
  if (!env.REDIS_URL) throw new Error("[worker] REDIS_URL is required to run the worker");
  startTelemetry();
  const store = new PrismaStore();
  const connection = { url: env.REDIS_URL };
  // Same email wiring as the api (app.ts) so the nudge's `lead_unresponsive`
  // alert can actually deliver by email, not just log to the console.
  const email =
    env.POSTMARK_SERVER_TOKEN
      ? new PostmarkEmailSender(env.POSTMARK_SERVER_TOKEN, `sarah@${env.LEAD_EMAIL_DOMAIN}`)
      : new ConsoleEmailSender();

  const worker = new Worker(
    "nudge",
    async (job) => {
      const { leadId } = job.data as { leadId: string };
      const ctx = await store.getContextByLeadId(leadId);
      if (!ctx) return;
      // Send from the contractor's own number (per-contractor); fall back to console.
      const sms =
        env.TWILIO_ACCOUNT_SID && ctx.contractor.twilioNumber
          ? new TwilioSmsSender(ctx.contractor.twilioNumber)
          : new ConsoleSmsSender();
      await runNudgeJob({ store, sms, email, now: new Date() }, leadId);
    },
    { connection },
  );

  worker.on("ready", () => console.log("[worker] processing the nudge queue"));
  worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err));
  return worker;
}
