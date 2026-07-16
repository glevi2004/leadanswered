import { Worker, type Job } from "bullmq";
import { pathToFileURL } from "node:url";
import { runEngineering } from "./agent/engineering.js";
import type { Store } from "./store/types.js";
import { ENGINEERING_QUEUE, redisConnection, useRedis, type EngineeringJob } from "./queue.js";

/**
 * The durable Engineering worker (FOUNDATION §4, DEVELOPMENT Phase 0). It consumes the
 * `engineering` queue and runs a full build per job (create → code → preview →
 * stage-approval, via runEngineering). Because BullMQ only acks a job on success, a
 * redeploy or crash mid-build leaves the job on the queue and it is re-delivered — the
 * run survives. Idempotent tools (create_site reuses an existing Site) keep re-delivery
 * safe. On terminal failure (retries exhausted) the task is marked `failed`.
 *
 * `lockDuration` is generous because a build can run for many minutes: BullMQ renews the
 * lock while the process is alive, so only a DEAD worker lets the job stall and be
 * re-picked (after the lock expires).
 *
 * Runs either IN-PROCESS beside the API (started from server.ts — zero extra infra on
 * the single Railway service) or as its own process (`node dist/worker.js`) once we want
 * to scale the worker independently. Both share the same queue and are equally durable.
 */
export function startEngineeringWorker(store: Store): Worker<EngineeringJob> | null {
  if (!useRedis()) return null;

  const worker = new Worker<EngineeringJob>(
    ENGINEERING_QUEUE,
    async (job: Job<EngineeringJob>) => {
      const { orgId, taskId, message } = job.data;
      await runEngineering({ store }, { orgId, taskId, message });
    },
    {
      connection: redisConnection(),
      concurrency: Number(process.env.ENGINEERING_CONCURRENCY ?? 3),
      lockDuration: 300_000, // 5 min — long builds renew the lock; a dead worker stalls after this
    },
  );

  worker.on("failed", async (job, err) => {
    console.error(
      `[worker] engineering job ${job?.id} failed (attempt ${job?.attemptsMade}):`,
      err?.message,
    );
    // Only mark the task failed once BullMQ has exhausted its retries.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await store
        .updateTaskStatus(job.data.taskId, "failed")
        .catch((e) => console.error(`[worker] could not mark task ${job.data.taskId} failed:`, e));
    }
  });
  worker.on("completed", (job) => console.log(`[worker] engineering job ${job.id} completed`));
  worker.on("error", (err) => console.error("[worker] error:", err));

  console.log(`[worker] engineering worker started (concurrency ${worker.opts.concurrency})`);
  return worker;
}

/** Standalone entry: `node dist/worker.js` / `tsx src/worker.ts` runs a dedicated worker process. */
async function main(): Promise<void> {
  if (!useRedis()) {
    console.error("[worker] REDIS_URL is not set — nothing to do.");
    return;
  }
  const { buildStore } = await import("./app.js");
  const store = await buildStore();
  startEngineeringWorker(store);
  console.log("[worker] standalone worker running.");
}

// Run main() only when this file is the process entrypoint (not when imported by server.ts).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("[worker] fatal:", err);
    process.exit(1);
  });
}
