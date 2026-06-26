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
    { delay: delayMs, jobId: `nudge:${leadId}`, removeOnComplete: true, removeOnFail: true },
  );
}
