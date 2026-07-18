import type { AddAgentEventInput, Store } from "../store/types.js";
import { notifySlack } from "../channels/slack.js";

/**
 * The flow layer's write path (docs/workflow.md §1/§3). Two best-effort helpers:
 * `recordEvent` appends to the AgentEvent journal (the spine every surface and
 * Lu's situational block read); `postToThread` appends a system-authored
 * assistant message to the org's main Lu thread (the report-back that makes the
 * conversation the company's log). Both swallow failures — journaling must never
 * fail a run.
 */

export async function recordEvent(store: Store, input: AddAgentEventInput): Promise<void> {
  try {
    await store.addAgentEvent(input);
  } catch (err) {
    console.error(`[journal] event ${input.kind} failed:`, err);
  }
}

export async function postToThread(
  store: Store,
  orgId: string,
  content: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    const thread = await store.getOrCreateMainThread(orgId);
    await store.appendMessage({
      threadId: thread.id,
      orgId,
      role: "assistant",
      content,
      meta: { source: "system", ...(meta ?? {}) },
    });
  } catch (err) {
    console.error("[journal] postToThread failed:", err);
  }
  // Slack mirror (ladder step 4): report-backs land in the channel too — one conversation,
  // two clients. Best-effort and dormant until Slack env is configured.
  void notifySlack(orgId, content);
}
