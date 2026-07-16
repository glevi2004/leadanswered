import type { LanguageModel } from "ai";
import { MockLanguageModelV3 } from "ai/test";

const USAGE = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

/** One scripted model step: either a tool call or the final assistant text. */
export type ScriptStep =
  | { tool: string; input: Record<string, unknown> }
  | { text: string };

/**
 * A deterministic stand-in for the LLM (replaces the old ScriptedAi). `steps` is
 * consumed in order across EVERY doGenerate call — the opening turn, then each
 * agent turn's tool loop. A `{tool}` step makes the agent call that real tool;
 * a `{text}` step ends the turn. So tests exercise the real tool side-effects with
 * a deterministic "brain", no network.
 */
export function scriptedModel(steps: ScriptStep[]): LanguageModel {
  let i = 0;
  return new MockLanguageModelV3({
    doGenerate: async () => {
      const step = steps[i++] ?? { text: "" };
      if ("tool" in step) {
        return {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: `call_${i}`,
              toolName: step.tool,
              input: JSON.stringify(step.input),
            },
          ],
          finishReason: { unified: "tool-calls" as const, raw: undefined },
          usage: USAGE,
          warnings: [],
        };
      }
      return {
        content: [{ type: "text" as const, text: step.text }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage: USAGE,
        warnings: [],
      };
    },
  });
}

/** A model that always fails — for the fail-safe test. */
export function throwingModel(): LanguageModel {
  return new MockLanguageModelV3({
    doGenerate: async () => {
      throw new Error("AI unavailable");
    },
  });
}
