import { runEngineering, type EngineeringDeps } from "./engineering.js";
import { enqueueEngineering, useRedis } from "../queue.js";

/**
 * Dispatch the Engineer to build an EXISTING task. DURABLE when Redis is set
 * (enqueue → worker.ts), else an in-process fire-and-forget run (local dev).
 *
 * Shared by `POST /api/engineering` (the owner's direct dispatch) and Lu's
 * `dispatch_to_engineering` orchestrator tool (agent→agent), so a task is never
 * double-dispatched regardless of entry point: the queue dedupes by `jobId = taskId`,
 * and the in-process fallback dedupes via the registry below.
 */

// Fallback registry (no Redis): one live in-process run per task, process-wide.
const inflight = new Map<string, Promise<unknown>>();

function dispatchInProcess(deps: EngineeringDeps, orgId: string, taskId: string, message: string): void {
  if (inflight.has(taskId)) return; // already running — do not double-dispatch
  const run = runEngineering(deps, { orgId, taskId, message })
    .catch(async (err) => {
      console.error(`[dispatch] engineering task ${taskId} failed:`, err);
      await deps.store
        .updateTaskStatus(taskId, "failed")
        .catch((e) => console.error(`[dispatch] could not mark task ${taskId} failed:`, e));
    })
    .finally(() => inflight.delete(taskId));
  inflight.set(taskId, run);
}

export interface DispatchBuildInput {
  orgId: string;
  taskId: string;
  message: string;
}

/** Mark the task underway (unless already running / at the approval gate) and dispatch the Engineer. */
export async function dispatchBuild(
  deps: EngineeringDeps,
  { orgId, taskId, message }: DispatchBuildInput,
): Promise<void> {
  const task = await deps.store.getTask(taskId);
  if (task && task.status !== "in_progress" && task.status !== "needs_approval") {
    await deps.store.updateTaskStatus(taskId, "in_progress");
  }
  if (useRedis()) {
    await enqueueEngineering({ orgId, taskId, message });
  } else {
    dispatchInProcess(deps, orgId, taskId, message);
  }
}
