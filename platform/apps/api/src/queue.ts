import type { Queue } from "bullmq";
import { env } from "./env.js";

const NUDGE_DELAY_MS = 30 * 60 * 1000; // 30 minutes of silence → one gentle follow-up

let nudgeQueueInstance: Queue | null = null;

async function nudgeQueue(): Promise<Queue | null> {
  if (!env.REDIS_URL) return null; // no Redis → background nudges disabled (the worker isn't running)
  if (!nudgeQueueInstance) {
    const { Queue } = await import("bullmq");
    nudgeQueueInstance = new Queue("nudge", { connection: { url: env.REDIS_URL } });
  }
  return nudgeQueueInstance;
}

/**
 * Schedule a delayed quiet-lead nudge (SCOPE §5). Processed by the worker
 * (apps/worker) after `delayMs`. The jobId is keyed by lead so re-enqueuing while
 * one is pending replaces it (the timer resets each turn). No-op without REDIS_URL.
 */
export async function enqueueNudge(leadId: string, delayMs = NUDGE_DELAY_MS): Promise<void> {
  const q = await nudgeQueue();
  if (!q) return;
  await q.add(
    "nudge",
    { leadId },
    // jobId must not contain ":" (BullMQ uses it as an internal key separator).
    { delay: delayMs, jobId: `nudge-${leadId}`, removeOnComplete: true, removeOnFail: true },
  );
}

// --- Escalation SLA (SCOPE §9.7 / P1): re-ping an unanswered loop-in, then expire it. ---
const ESCALATION_SLA_MS: Record<1 | 2, number> = {
  1: 20 * 60 * 1000, // ~20 min after the loop-in → remind the owner
  2: 3 * 60 * 60 * 1000, // ~3h after the reminder → expire (owner-only alert)
};

let escalationQueueInstance: Queue | null = null;
async function escalationQueue(): Promise<Queue | null> {
  if (!env.REDIS_URL) return null;
  if (!escalationQueueInstance) {
    const { Queue } = await import("bullmq");
    escalationQueueInstance = new Queue("escalation-sla", { connection: { url: env.REDIS_URL } });
  }
  return escalationQueueInstance;
}

/** Schedule an escalation-SLA stage (1 = remind owner, 2 = expire). No-op without REDIS_URL. */
export async function enqueueEscalationSla(escalationId: string, stage: 1 | 2): Promise<void> {
  const q = await escalationQueue();
  if (!q) return;
  await q.add(
    "escalation-sla",
    { escalationId, stage },
    { delay: ESCALATION_SLA_MS[stage], jobId: `esc-${stage}-${escalationId}`, removeOnComplete: true, removeOnFail: true },
  );
}

// --- Calendar sync (GOOGLE_CALENDAR.md §10): outbound push, inbound reconcile, channel renewal. ---
let calendarQueueInstance: Queue | null = null;
async function calendarQueue(): Promise<Queue | null> {
  if (!env.REDIS_URL) return null;
  if (!calendarQueueInstance) {
    const { Queue } = await import("bullmq");
    calendarQueueInstance = new Queue("calendar-sync", { connection: { url: env.REDIS_URL } });
  }
  return calendarQueueInstance;
}

/** Push an appointment change to the organization's Google Calendar (best-effort, retried). No-op w/o Redis. */
export async function enqueueCalendarPush(appointmentId: string, op: "create" | "update" | "delete"): Promise<void> {
  const q = await calendarQueue();
  if (!q) return;
  await q.add(
    "push",
    { appointmentId, op },
    { attempts: 5, backoff: { type: "exponential", delay: 5000 }, removeOnComplete: true, removeOnFail: 100 },
  );
}

/** Run an incremental inbound sync for a organization (from the webhook). Deduped per organization. */
export async function enqueueInboundSync(organizationId: string): Promise<void> {
  const q = await calendarQueue();
  if (!q) return;
  await q.add(
    "inbound",
    { organizationId },
    { jobId: `inbound-${organizationId}`, removeOnComplete: true, removeOnFail: true },
  );
}

/** Repeatable polling safety net (§9): sweep every connected calendar + renew watch channels. */
export async function enqueueCalendarPoll(everyMs = 20 * 60 * 1000): Promise<void> {
  const q = await calendarQueue();
  if (!q) return;
  await q.add("poll", {}, { repeat: { every: everyMs }, jobId: "calendar-poll", removeOnComplete: true, removeOnFail: true });
}
