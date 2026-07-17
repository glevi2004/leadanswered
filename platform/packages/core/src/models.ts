import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import type { ImageModel, LanguageModel } from "ai";

/**
 * The model gateway (AGENTS-BACKEND §5b): a registry + router spanning every
 * provider AND modality, generalising the single swap point in
 * `apps/api/src/agent/provider.ts`.
 *
 * Two axes:
 *  - Reasoning (the agent's brain): any AI-SDK text provider, swappable per agent.
 *  - Generation (the agent's hands): image models via AI SDK `generateImage`,
 *    plus the MCP-only Higgsfield path for pixel/stylised brand assets.
 *
 * This module is provider-agnostic metadata + resolvers only. It reads NO env
 * and holds NO keys — each provider SDK reads its own key from the environment
 * (ANTHROPIC_API_KEY / OPENAI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY) exactly
 * like the existing `provider.ts`.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * Brand of the model. Note this is the *vendor* brand, not always the npm
 * provider package that serves it — Flux (`black-forest-labs`) is reached
 * through Replicate/Fal, and Higgsfield is reached through its MCP server.
 * See `providerPkg` / `viaMcp` on the descriptor.
 */
export type ModelProvider =
  | "anthropic"
  | "openai"
  | "google"
  | "black-forest-labs"
  | "higgsfield";

export type ModelModality = "text" | "image";

export type ModelTier =
  | "frontier" // top-of-line reasoning / most capable
  | "reasoning" // dedicated reasoning model (o-series)
  | "balanced" // near-frontier quality at lower cost
  | "workhorse" // cheap + fast, for high-volume routine turns
  | "image"; // image generation

export type ModelSpeed = "fast" | "balanced" | "slow";

export type ModelCost = "low" | "med" | "high";

/**
 * One entry in the registry. `id` is the exact string passed to the provider
 * factory (e.g. `anthropic(id)` / `openai.image(id)`).
 */
export interface ModelDescriptor {
  id: string;
  provider: ModelProvider;
  modality: ModelModality;
  tier: ModelTier;
  speed: ModelSpeed;
  cost: ModelCost;
  /** One-line "reach for this when…" hint, surfaced in the Agent-panel picker. */
  bestFor: string;
  /**
   * True when the model is only reachable through an MCP tool (Higgsfield),
   * NOT a direct AI-SDK provider. `getModel`/`getImageModel` cannot resolve it;
   * the caller must route to the MCP client.
   */
  viaMcp?: boolean;
  /**
   * The npm provider package that actually serves this model when it isn't one
   * of the first-party `@ai-sdk/*` providers this package depends on. Purely
   * informational — a note for whoever wires the additional provider up.
   */
  providerPkg?: string;
}

export interface ModelRecommendation {
  id: string;
  /** One-line justification shown next to the "Recommended" badge. */
  rationale: string;
}

// ── Canonical ids (single source of truth) ───────────────────────────────────

const ID = {
  // text / reasoning
  opus: "claude-opus-4-8",
  sonnet: "claude-sonnet-5",
  haiku: "claude-haiku-4-5",
  gpt: "gpt-5",
  oSeries: "o3",
  gemini: "gemini-2.5-pro",
  // image
  gptImage: "gpt-image-1",
  flux: "black-forest-labs/flux-1.1-pro",
  higgsfield: "higgsfield",
} as const;

/** Balanced, always-available fallbacks. */
export const DEFAULT_TEXT_MODEL_ID: string = ID.sonnet;
export const DEFAULT_IMAGE_MODEL_ID: string = ID.gptImage;

// ── Registry ─────────────────────────────────────────────────────────────────

export const MODEL_REGISTRY: readonly ModelDescriptor[] = [
  // ── Anthropic (reasoning) ──
  {
    id: ID.opus,
    provider: "anthropic",
    modality: "text",
    tier: "frontier",
    speed: "slow",
    cost: "high",
    bestFor:
      "Hard coding, long-horizon agentic builds, and the Lu orchestrator's planning turns.",
  },
  {
    id: ID.sonnet,
    provider: "anthropic",
    modality: "text",
    tier: "balanced",
    speed: "balanced",
    cost: "med",
    bestFor:
      "Everyday coding, drafting, and most department turns — near-frontier quality at lower cost.",
  },
  {
    id: ID.haiku,
    provider: "anthropic",
    modality: "text",
    tier: "workhorse",
    speed: "fast",
    cost: "low",
    bestFor:
      "High-volume routine turns — the SMS Support agent, quick classification and replies.",
  },

  // ── OpenAI (reasoning) ──
  {
    id: ID.gpt,
    provider: "openai",
    modality: "text",
    tier: "frontier",
    speed: "balanced",
    cost: "high",
    bestFor:
      "General reasoning with strong tool use / structured output; a cross-provider fallback for Claude.",
  },
  {
    id: ID.oSeries,
    provider: "openai",
    modality: "text",
    tier: "reasoning",
    speed: "slow",
    cost: "high",
    bestFor:
      "Deliberate multi-step reasoning — math, analysis, and problems where extra thinking pays off.",
  },

  // ── Google (reasoning) ──
  {
    id: ID.gemini,
    provider: "google",
    modality: "text",
    tier: "balanced",
    speed: "balanced",
    cost: "med",
    bestFor:
      "Very long context and multimodal input; a third-provider option for cost/latency routing + fallback.",
  },

  // ── Image (generation) ──
  {
    id: ID.gptImage,
    provider: "openai",
    modality: "image",
    tier: "image",
    speed: "balanced",
    cost: "med",
    bestFor:
      "General social graphics and editable brand assets via `generateImage`.",
  },
  {
    id: ID.flux,
    provider: "black-forest-labs",
    modality: "image",
    tier: "image",
    speed: "balanced",
    cost: "med",
    bestFor:
      "Photoreal website hero images and marketing photography.",
    // Flux has no first-party `@ai-sdk/black-forest-labs` package: it is served
    // through Replicate (id `black-forest-labs/flux-1.1-pro`) or Fal
    // (`fal-ai/flux-pro/v1.1`). Add @ai-sdk/replicate | @ai-sdk/fal to wire it.
    providerPkg: "@ai-sdk/replicate | @ai-sdk/fal",
  },
  {
    id: ID.higgsfield,
    provider: "higgsfield",
    modality: "image",
    tier: "image",
    speed: "slow",
    cost: "med",
    bestFor:
      "Pixel-art / stylised brand kit + world assets (the Lu Computer look).",
    // MCP-only: driven through the connected Higgsfield MCP tools
    // (generate_image / create_website), not an AI-SDK image model.
    viaMcp: true,
  },
];

// ── Text resolver ─────────────────────────────────────────────────────────────

/**
 * Resolve a text-model id to an AI-SDK `LanguageModel` via the matching
 * provider. Unknown, non-text, or MCP-only ids fall back to a sensible balanced
 * default so a bad id never hard-crashes a turn (AGENTS-BACKEND §5b).
 */
export function getModel(id: string): LanguageModel {
  const descriptor = MODEL_REGISTRY.find((m) => m.id === id);

  // Prefer the registry; otherwise infer from the id prefix so callers can pass
  // a newer id we haven't catalogued yet.
  const provider =
    descriptor?.modality === "text" ? descriptor.provider : inferTextProvider(id);

  switch (provider) {
    case "anthropic":
      return anthropic(id);
    case "openai":
      return openai(id);
    case "google":
      return google(id);
    default:
      // Unknown / image-only / MCP-only id → safe balanced default.
      return anthropic(DEFAULT_TEXT_MODEL_ID);
  }
}

/** Best-effort provider guess for an uncatalogued text id, by prefix. */
function inferTextProvider(id: string): ModelProvider | undefined {
  if (id.startsWith("claude-")) return "anthropic";
  if (/^(gpt-|o1|o3|o4|chatgpt)/.test(id)) return "openai";
  if (id.startsWith("gemini")) return "google";
  return undefined;
}

// ── Image resolver ────────────────────────────────────────────────────────────

/**
 * Resolve an image-model id to an AI-SDK `ImageModel` (for `generateImage`)
 * where the provider supports it. Returns `undefined` when the model has no
 * direct AI-SDK image model here:
 *  - `higgsfield` → MCP-only; route to the Higgsfield MCP client instead.
 *  - `black-forest-labs` (Flux) → served via Replicate/Fal, which this package
 *    does not depend on yet.
 */
export function getImageModel(id: string): ImageModel | undefined {
  const descriptor = MODEL_REGISTRY.find(
    (m) => m.id === id && m.modality === "image",
  );

  switch (descriptor?.provider) {
    case "openai":
      // gpt-image-1 (and dall-e-*) support the AI-SDK image model interface.
      return openai.image(id);
    case "google":
      // Imagen models, should a google image entry be added to the registry.
      return google.image(id);
    case "higgsfield":
      // MCP-only — no AI-SDK image model. Caller routes to the MCP client.
      return undefined;
    case "black-forest-labs":
      // Flux is served through @ai-sdk/replicate | @ai-sdk/fal, not a provider
      // we depend on. Once added: `replicate.image(id)` / `fal.image(id)`.
      return undefined;
    default:
      return undefined;
  }
}

// ── Recommendations (static role/modality map, §5b layer 1) ───────────────────

/**
 * Recommend a model for a given role + modality using the static map from
 * AGENTS-BACKEND §5b (coding → Opus/Sonnet, support-routine → Haiku, hero-image
 * → Flux/gpt-image, pixel brand → Higgsfield, …). This powers the "Recommended"
 * badge + one-line rationale in the picker; Lu's per-task `recommend_model`
 * escalation (layer 2) is a separate, dynamic concern.
 */
export function recommendModel(
  role: string,
  modality: ModelModality,
): ModelRecommendation {
  const key = role.trim().toLowerCase();
  return modality === "image"
    ? recommendImageModel(key)
    : recommendTextModel(key);
}

function recommendTextModel(role: string): ModelRecommendation {
  // Hard engineering / coding → the strongest reasoning model. Lu's orchestration
  // now defaults to the balanced tier below (cost); the owner can upgrade her to
  // Opus via the model picker.
  if (
    matches(role, [
      "engineering",
      "engineer",
      "coding",
      "code",
      "build",
      "developer",
      "dev",
    ])
  ) {
    return {
      id: ID.opus,
      rationale:
        "Hard engineering and coding come out best on the strongest reasoning model (§5b/§3).",
    };
  }

  // High-volume routine turns → cheapest fast model.
  if (
    matches(role, [
      "support",
      "support-routine",
      "sms",
      "triage",
      "classify",
      "classification",
      "reply",
      "faq",
    ])
  ) {
    return {
      id: ID.haiku,
      rationale:
        "Routine, high-volume turns run on the cheapest fast model (§5b).",
    };
  }

  // Everything else (sales / finance / ops / marketing / legal drafting) →
  // balanced near-frontier quality at lower cost. Also the overall default.
  return {
    id: ID.sonnet,
    rationale:
      "Balanced near-frontier quality at lower cost for everyday department work (§5b default).",
  };
}

function recommendImageModel(role: string): ModelRecommendation {
  // Photoreal hero / marketing photography. Flux is the eventual pick, but it has
  // no first-party AI-SDK image model yet (getImageModel(flux) → undefined →
  // placeholder), so the WORKING default is gpt-image-1 (real @ai-sdk/openai
  // adapter). Restore ID.flux here once the Replicate/Fal wiring lands (§5b).
  if (
    matches(role, [
      "hero",
      "hero-image",
      "website-hero",
      "photo",
      "photoreal",
      "photorealistic",
      "marketing-photo",
      "product-photo",
    ])
  ) {
    return {
      id: ID.gptImage,
      rationale:
        "Photoreal hero imagery → gpt-image-1, a real wired image model (Flux not yet wired) (§5b).",
    };
  }

  // Pixel / stylised brand + world assets → Higgsfield (via MCP).
  if (
    matches(role, [
      "brand",
      "brand-kit",
      "pixel",
      "pixel-art",
      "stylized",
      "stylised",
      "logo",
      "world",
      "game",
      "sprite",
      "avatar",
    ])
  ) {
    return {
      id: ID.higgsfield,
      rationale:
        "Pixel/stylised brand + world assets → Higgsfield via MCP (§5b).",
    };
  }

  // General social graphics / editable assets → gpt-image. Also the default.
  return {
    id: ID.gptImage,
    rationale:
      "General editable graphics and social images → gpt-image (§5b default).",
  };
}

function matches(role: string, keys: readonly string[]): boolean {
  return keys.some((k) => role === k || role.includes(k));
}
