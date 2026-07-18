import type { Store } from "../store/types.js";
import { connectionStatus } from "../connect/status.js";

/**
 * The SITUATIONAL BLOCK (docs/system.md §2) — the live state injected into every
 * orchestrator turn so Lu is never blind: connections, open tasks (real rows, not
 * counts), what's awaiting the owner, and the most recent journal events. Before
 * this, Lu's only non-conversation context was a prose memory summary; she could
 * not answer "how's my build going?" without the model choosing to call a tool.
 *
 * Best-effort and bounded, like resolveOrgMemory: returns "" on any failure, and
 * caps the block so it never crowds the prompt.
 */

const MAX_TASKS = 10;
const MAX_EVENTS = 8;
const MAX_CHARS = 2_200;

export async function resolveSituation(store: Store, orgId: string): Promise<string> {
  try {
    const [tasks, approvals, events, conn] = await Promise.all([
      store.listTasks(orgId).catch(() => []),
      store.listPendingApprovals(orgId).catch(() => []),
      store.listAgentEvents(orgId, MAX_EVENTS).catch(() => []),
      connectionStatus(store, orgId).catch(() => null),
    ]);

    const open = tasks.filter((t) => t.status !== "done" && t.status !== "failed");
    const lines: string[] = [
      "CURRENT STATE (live, authoritative — trust this over memory or the conversation):",
    ];

    if (conn) {
      const mark = (ok: boolean) => (ok ? "connected" : "NOT connected");
      lines.push(
        `- Connections: GitHub ${mark(conn.github)} · Vercel ${mark(conn.vercel)} · Supabase ${mark(conn.supabase)}`,
      );
    }

    if (open.length === 0) {
      lines.push("- Open tasks: none");
    } else {
      lines.push(`- Open tasks (${open.length}):`);
      for (const t of open.slice(0, MAX_TASKS)) {
        lines.push(`  · [${t.id}] "${t.title}" — ${t.status} (${t.departmentKey})`);
      }
      if (open.length > MAX_TASKS) lines.push(`  · …and ${open.length - MAX_TASKS} more`);
    }

    if (approvals.length > 0) {
      lines.push(
        `- Awaiting the owner: ${approvals
          .map((a) => `${a.action}${a.taskId ? ` (task ${a.taskId})` : ""}`)
          .join(" · ")}`,
      );
    }

    if (events.length > 0) {
      lines.push("- Recent events (newest first):");
      for (const e of events) lines.push(`  · ${e.kind}: ${e.message}`);
    }

    const block = lines.join("\n");
    return block.length > MAX_CHARS ? `${block.slice(0, MAX_CHARS)}\n  · …(truncated)` : block;
  } catch (err) {
    console.error("[situational] failed (continuing without):", err);
    return "";
  }
}
