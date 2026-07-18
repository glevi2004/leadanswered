import type { Store } from "../store/types.js";
import { postToThread, recordEvent } from "./journal.js";

/**
 * The STUCK-TASK REAPER (harness-spec §3 P1): a crash outside the durable path — or a
 * worker dying past its retries — strands a Task at `in_progress` forever, poisoning every
 * surface that renders "Working…". Sweep periodically: any `in_progress` task not touched
 * since the deadline is marked `failed`, with a journal event + a thread report-back so the
 * owner learns about it in the conversation, not by staring at a stuck spinner.
 *
 * The deadline (default 45 min) comfortably exceeds the engineering turn ceiling (15 min)
 * plus queue retries. Tune with TASK_REAPER_SWEEP_MS / TASK_REAPER_DEADLINE_MS. The boot
 * sweep clears strays left by the previous deploy.
 */

const SWEEP_MS = Number(process.env.TASK_REAPER_SWEEP_MS) || 10 * 60_000;
const DEADLINE_MS = Number(process.env.TASK_REAPER_DEADLINE_MS) || 45 * 60_000;

export async function reapStuckTasks(store: Store): Promise<number> {
  const cutoff = new Date(Date.now() - DEADLINE_MS).toISOString();
  let reaped = 0;
  try {
    const stuck = await store.listStuckTasks(cutoff);
    for (const t of stuck) {
      const ageMin = t.updatedAt
        ? Math.round((Date.now() - new Date(t.updatedAt).getTime()) / 60_000)
        : 0;
      await store.updateTaskStatus(t.id, "failed").catch(() => {});
      await recordEvent(store, {
        orgId: t.orgId,
        taskId: t.id,
        kind: "build_failed",
        message: `Reaped: "${t.title}" was stuck in_progress for ${ageMin} min`,
        payload: { reason: "stuck_task_reaped", ageMin },
      });
      await postToThread(
        store,
        t.orgId,
        `The build for "${t.title}" stalled — I've marked it failed after ${ageMin} minutes. Ask me to retry or re-plan it.`,
        { kind: "build_failed", taskId: t.id },
      );
      reaped++;
    }
  } catch (err) {
    console.error("[reaper] sweep failed:", err);
  }
  return reaped;
}

export function startTaskReaper(store: Store): NodeJS.Timeout {
  const tick = async () => {
    const n = await reapStuckTasks(store);
    if (n > 0) console.log(`[reaper] reaped ${n} stuck task(s)`);
  };
  const iv = setInterval(tick, SWEEP_MS);
  iv.unref?.(); // never keep the process alive just for the reaper
  void tick(); // boot sweep — clears strays from the previous deploy
  console.log(
    `[reaper] task reaper started (every ${SWEEP_MS / 60_000} min, deadline ${DEADLINE_MS / 60_000} min)`,
  );
  return iv;
}
