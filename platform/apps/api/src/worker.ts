import { Worker } from "bullmq";
import { env } from "./env.js";
import { startTelemetry } from "./telemetry.js";
import { PrismaStore } from "./store/prismaStore.js";
import { TwilioSmsSender, ConsoleSmsSender } from "./sms.js";
import { ConsoleEmailSender, PostmarkEmailSender } from "./email.js";
import { isWithinBusinessHours } from "@leadanswered/core";
import { getModel } from "./agent/provider.js";
import { runNudgeJob } from "./jobs/nudge.js";
import { runEscalationSlaJob } from "./jobs/escalationSla.js";
import { runCalendarPush } from "./jobs/calendarSync.js";
import { runInboundSync } from "./calendar/google/inbound.js";
import { registerWatch } from "./calendar/google/service.js";
import { useGoogleCalendar } from "./env.js";
import { enqueueNudge, enqueueCalendarPoll } from "./queue.js";

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
  const model = getModel(); // the quiet-lead follow-up is now a context-aware agent turn
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
      const now = new Date();
      // No 2am texts: outside the contractor's business hours, defer the nudge to a later check.
      if (!isWithinBusinessHours(ctx.contractor.standingAvailability, now)) {
        await enqueueNudge(leadId, 60 * 60 * 1000); // re-check in ~1h
        return;
      }
      // Send from the contractor's own number (per-contractor); fall back to console.
      const sms =
        env.TWILIO_ACCOUNT_SID && ctx.contractor.twilioNumber
          ? new TwilioSmsSender(ctx.contractor.twilioNumber)
          : new ConsoleSmsSender();
      await runNudgeJob({ store, sms, email, model, now }, leadId);
    },
    { connection },
  );

  worker.on("ready", () => console.log("[worker] processing the nudge queue"));
  worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} failed:`, err));

  // Escalation SLA (SCOPE §9.7): chase a loop-in the contractor hasn't answered, then expire it.
  const escWorker = new Worker(
    "escalation-sla",
    async (job) => {
      const { escalationId, stage } = job.data as { escalationId: string; stage: 1 | 2 };
      const esc = await store.getEscalation(escalationId);
      if (!esc) return;
      const contractor = await store.getContractor(esc.contractorId);
      const sms =
        env.TWILIO_ACCOUNT_SID && contractor?.twilioNumber
          ? new TwilioSmsSender(contractor.twilioNumber)
          : new ConsoleSmsSender();
      await runEscalationSlaJob({ store, sms, email, model, now: new Date() }, escalationId, stage);
    },
    { connection },
  );
  escWorker.on("ready", () => console.log("[worker] processing the escalation-sla queue"));
  escWorker.on("failed", (job, err) => console.error(`[worker] escalation job ${job?.id} failed:`, err));

  // Calendar sync (GOOGLE_CALENDAR.md §10): outbound push + inbound reconcile + a polling safety net.
  if (useGoogleCalendar()) {
    const smsFor = (twilioNumber?: string | null) =>
      env.TWILIO_ACCOUNT_SID && twilioNumber ? new TwilioSmsSender(twilioNumber) : new ConsoleSmsSender();
    const calWorker = new Worker(
      "calendar-sync",
      async (job) => {
        if (job.name === "push") {
          const { appointmentId, op } = job.data as { appointmentId: string; op: "create" | "update" | "delete" };
          await runCalendarPush({ store }, appointmentId, op);
        } else if (job.name === "inbound") {
          const { contractorId } = job.data as { contractorId: string };
          const c = await store.getContractor(contractorId);
          await runInboundSync({ store, sms: smsFor(c?.twilioNumber) }, contractorId);
        } else if (job.name === "poll") {
          for (const conn of await store.listConnectedCalendars()) {
            const c = await store.getContractor(conn.contractorId);
            await runInboundSync({ store, sms: smsFor(c?.twilioNumber) }, conn.contractorId).catch((e) =>
              console.error("[calendar] poll sync failed:", e),
            );
            if (!conn.channelExpiresAt || Date.parse(conn.channelExpiresAt) - Date.now() < 24 * 3600 * 1000) {
              await registerWatch(store, conn.contractorId).catch((e) => console.error("[calendar] watch renew failed:", e));
            }
          }
        }
      },
      { connection },
    );
    calWorker.on("ready", () => console.log("[worker] processing the calendar-sync queue"));
    calWorker.on("failed", (job, err) => console.error(`[worker] calendar job ${job?.id} failed:`, err));
    void enqueueCalendarPoll();
  }

  return worker;
}
