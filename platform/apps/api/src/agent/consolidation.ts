import { generateText } from "ai";
import { getModel, recommendModel } from "@leadanswered/core";
import type { Store } from "../store/types.js";
import { meterLlm } from "./metering.js";

const CONSOLIDATE_AFTER_MESSAGES = 12; // don't bother until the thread has some substance
const RECENT_WINDOW = 40; // how many recent turns to fold into the summary

/**
 * Sleep-time consolidation (plan Pillar 3 — cofounder's "sleep-time compute"). Runs in the
 * background worker: it folds the recent conversation into a compact CORE memory so Lu keeps a
 * small, durable sense of the business + what's underway across sessions, without carrying the
 * whole transcript every turn. Best-effort — the worker swallows failures. Metered like any LLM call.
 */
export async function consolidateOrgMemory(store: Store, orgId: string): Promise<void> {
  const thread = await store.getOrCreateMainThread(orgId);
  const messages = await store.listRecentMessages(thread.id, RECENT_WINDOW);
  if (messages.length < CONSOLIDATE_AFTER_MESSAGES) return;

  const transcript = messages
    .map((m) => `${m.role === "user" ? "Owner" : "Lu"}: ${m.content}`)
    .join("\n");

  // Cheap workhorse model — summarization doesn't need the frontier tier.
  const modelId = recommendModel("classify", "text").id;
  const result = await generateText({
    model: getModel(modelId),
    system: [
      "You maintain Lu's long-term memory of a business.",
      "Read the recent conversation and write a SHORT, durable summary of what will matter on future turns:",
      "what the business is, what the owner wants built, decisions made, stated preferences, and open threads.",
      "Plain bullet points, no preamble, under 200 words. Never use em-dashes.",
    ].join(" "),
    messages: [{ role: "user", content: transcript }],
  });
  void meterLlm(store, orgId, modelId, result.usage);

  const summary = result.text.trim();
  if (!summary) return;
  await store.upsertMemory({
    orgId,
    tier: "core",
    key: "conversation-summary",
    content: summary,
    source: "consolidation",
  });
}
