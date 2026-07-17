import { costMicrosForLlm, costMicrosForSandbox } from "@leadanswered/core";
import type { Store } from "../store/types.js";

/**
 * Metering helpers (plan Pillar 2 — the usage bucket). Turn a completed LLM call or sandbox
 * run into a persisted `UsageEvent`. BEST-EFFORT: these run off the hot path and must never
 * break a turn, so every failure is swallowed. `usage` is the AI SDK `generateText().usage`
 * (typed loosely so we don't couple to the SDK's exact usage shape).
 */

interface LlmUsage {
  inputTokens?: number;
  outputTokens?: number;
}

/** Record LLM token usage. Pass the resolved model id + optional task/agent attribution. */
export async function meterLlm(
  store: Store,
  orgId: string,
  modelId: string | undefined,
  usage: LlmUsage | undefined,
  ctx: { taskId?: string | null; agentId?: string | null } = {},
): Promise<void> {
  try {
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    if (!inputTokens && !outputTokens) return;
    await store.createUsageEvent({
      orgId,
      kind: "llm",
      model: modelId ?? null,
      inputTokens,
      outputTokens,
      costMicros: costMicrosForLlm(modelId, inputTokens, outputTokens),
      taskId: ctx.taskId ?? null,
      agentId: ctx.agentId ?? null,
    });
  } catch {
    /* metering never breaks a turn */
  }
}

/** Record sandbox wall-clock seconds (the compute a build burned). */
export async function meterSandbox(
  store: Store,
  orgId: string,
  seconds: number,
  ctx: { taskId?: string | null } = {},
): Promise<void> {
  try {
    if (!(seconds > 0)) return;
    await store.createUsageEvent({
      orgId,
      kind: "sandbox",
      sandboxSeconds: Math.round(seconds),
      costMicros: costMicrosForSandbox(seconds),
      taskId: ctx.taskId ?? null,
    });
  } catch {
    /* best-effort */
  }
}
