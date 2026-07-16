import { Queue, type ConnectionOptions } from "bullmq";
import { env } from "./env.js";

/**
 * The durable job queue (FOUNDATION §4, DEVELOPMENT Phase 0). A real Engineer build
 * runs for minutes-to-hours in a sandbox; we must not lose it to a redeploy or crash.
 * So `POST /api/engineering` ENQUEUES a job here and the BullMQ worker (worker.ts)
 * runs it — BullMQ only acks a job on success, so a dead process leaves the job on the
 * queue and it is re-delivered. Idempotent tools (create_site reuses an existing Site)
 * make that re-delivery safe. Redis-backed, self-hosted (Railway/Upstash) — cheap.
 */

export const ENGINEERING_QUEUE = "engineering";

/** The payload of one Engineering build job. */
export interface EngineeringJob {
  orgId: string;
  taskId: string;
  message: string;
}

/** The durable worker is active only when REDIS_URL is set; otherwise we fall back to
 *  an in-process run (local dev — see routes/agents.ts). */
export const useRedis = (): boolean => env.REDIS_URL.length > 0;

/**
 * Parse REDIS_URL into BullMQ connection options — no direct `ioredis` import needed.
 * Handles `rediss://` (TLS, e.g. Upstash) and username/password credentials.
 */
export function redisConnection(): ConnectionOptions {
  const u = new URL(env.REDIS_URL);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    ...(u.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

let queue: Queue<EngineeringJob> | null = null;

/** The shared engineering queue (lazily created). `null` when Redis is not configured. */
export function engineeringQueue(): Queue<EngineeringJob> | null {
  if (!useRedis()) return null;
  if (!queue) {
    queue = new Queue<EngineeringJob>(ENGINEERING_QUEUE, { connection: redisConnection() });
  }
  return queue;
}

/**
 * Enqueue a durable Engineering build. `jobId = taskId` so a task is never
 * double-dispatched: BullMQ dedupes by jobId while the job exists, and the bounded
 * retention below keeps a just-finished job around long enough that an accidental
 * re-hit of the route is a no-op rather than a second build. Returns false when Redis
 * is not configured (the caller then runs it in-process).
 */
export async function enqueueEngineering(job: EngineeringJob): Promise<boolean> {
  const q = engineeringQueue();
  if (!q) return false;
  await q.add("build", job, {
    jobId: job.taskId,
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: { age: 86_400, count: 500 }, // keep a day / last 500 for the dedupe window + history
    removeOnFail: { age: 604_800 }, // keep failures a week for inspection
  });
  return true;
}
