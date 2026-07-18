import type { Store, TaskRecord } from "../store/types.js";
import { postToThread, recordEvent } from "./journal.js";

/**
 * SUPERVISION (docs/building-agents.md §5, DEVELOPMENT "spawn/supervise") — the loop that
 * makes `parentTaskId` real. Lu's `spawn_agent` creates ORDERED children under a parent
 * task; whenever a child's run ends (worker completion, in-process completion, publish,
 * or failure), this advances the parent:
 *
 *   child ok   → dispatch the next queued sibling (creation order); none left and all
 *                children `done` → the parent completes, with a thread report-back.
 *   child fail → the parent pauses at `needs_input` and the owner hears about it — no
 *                blind continuation on a broken foundation.
 *
 * Everything is journaled (`agent_spawned` / `supervise_advanced` / `supervise_paused`),
 * so the chat's activity line narrates the cascade. Best-effort throughout: supervision
 * must never fail the run that triggered it.
 */

const byCreatedAt = (a: TaskRecord, b: TaskRecord) =>
  (a.createdAt ?? "").localeCompare(b.createdAt ?? "");

export async function superviseAfterRun(
  store: Store,
  orgId: string,
  taskId: string,
  outcome: "ok" | "failed",
): Promise<void> {
  try {
    const child = await store.getTask(taskId);
    if (!child?.parentTaskId) return;
    const parent = await store.getTask(child.parentTaskId);
    if (!parent || parent.orgId !== orgId) return;
    const siblings = (await store.listTasks(orgId))
      .filter((t) => t.parentTaskId === parent.id)
      .sort(byCreatedAt);

    if (outcome === "failed") {
      await store.updateTaskStatus(parent.id, "needs_input").catch(() => {});
      await recordEvent(store, {
        orgId,
        taskId: parent.id,
        kind: "supervise_paused",
        message: `Paused "${parent.title}": sub-task "${child.title}" failed`,
        payload: { childTaskId: child.id },
      });
      await postToThread(
        store,
        orgId,
        `I paused "${parent.title}" — the sub-task "${child.title}" failed. Tell me how to proceed: retry it, change the approach, or drop it.`,
        { kind: "supervise_paused", taskId: parent.id },
      );
      return;
    }

    // Child ended well (preview gate or done) → advance: dispatch the next queued sibling.
    const next = siblings.find((t) => t.status === "needs_earlier" || t.status === "agent_can_do");
    if (next) {
      await recordEvent(store, {
        orgId,
        taskId: parent.id,
        kind: "supervise_advanced",
        message: `"${child.title}" finished — dispatching the next sub-task: "${next.title}"`,
        payload: { fromTaskId: child.id, toTaskId: next.id },
      });
      // Dynamic import breaks the dispatch↔supervise module cycle.
      const { dispatchBuild } = await import("./dispatch.js");
      await dispatchBuild(
        { store },
        { orgId, taskId: next.id, message: next.body?.trim() || next.title },
      );
      return;
    }

    // No siblings left to run. The parent completes only when every child is fully `done`
    // (a child at needs_approval still has its publish gate open — the parent waits).
    const allDone = siblings.length > 0 && siblings.every((t) => t.status === "done");
    if (allDone && parent.status !== "done") {
      await store.updateTaskStatus(parent.id, "done").catch(() => {});
      await recordEvent(store, {
        orgId,
        taskId: parent.id,
        kind: "supervise_completed",
        message: `All ${siblings.length} sub-tasks of "${parent.title}" are done`,
      });
      await postToThread(
        store,
        orgId,
        `"${parent.title}" is complete — all ${siblings.length} sub-tasks finished and published.`,
        { kind: "supervise_completed", taskId: parent.id },
      );
    }
  } catch (err) {
    console.error(`[supervise] failed for task ${taskId}:`, err);
  }
}
