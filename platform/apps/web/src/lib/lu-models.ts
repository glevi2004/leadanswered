/**
 * The owner-facing model catalog for the Lu dock picker. Kept client-safe (plain data,
 * no `@ai-sdk/*` imports) so it can render in the browser; the ids MUST match the core
 * gateway's `MODEL_REGISTRY` (packages/core/src/models.ts) so `getModel(id)` resolves them.
 */
/** The company whose logo marks the model in the picker. Matches the core registry's `provider`. */
export type LuModelProvider = "anthropic" | "openai" | "google";

export interface LuModelOption {
  id: string;
  label: string;
  hint: string;
  provider: LuModelProvider;
  recommended?: boolean;
}

export const LU_MODELS: readonly LuModelOption[] = [
  { id: "claude-sonnet-5", label: "Sonnet", hint: "Balanced — the recommended default", provider: "anthropic", recommended: true },
  { id: "claude-opus-4-8", label: "Opus", hint: "Deepest planning (slower, pricier)", provider: "anthropic" },
  { id: "claude-haiku-4-5", label: "Haiku", hint: "Fastest, cheapest", provider: "anthropic" },
  { id: "gpt-5", label: "GPT-5", hint: "OpenAI — strong tool use", provider: "openai" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Long context, multimodal", provider: "google" },
];

/** The default model Lu runs on until the owner picks another (matches the core Sonnet default). */
export const DEFAULT_LU_MODEL = "claude-sonnet-5";

export function luModelLabel(id: string): string {
  return LU_MODELS.find((m) => m.id === id)?.label ?? id;
}
