/**
 * Agent-compute price table (plan Pillar 2 — metering). Turns metered token counts +
 * sandbox seconds into `costMicros` (USD millionths, integer → exact + summable) for the
 * usage bucket. These are OUR cost of goods (we hold the provider keys, §7). The rates are
 * APPROXIMATE placeholders keyed to `MODEL_REGISTRY` ids — tune them to live provider
 * pricing before billing money against them; the mechanism (capture → cost → rollup) is
 * what matters here.
 */

/** USD per 1M input / output tokens, by model id (matches models.ts `ID`). */
interface TokenPrice {
  inPerM: number;
  outPerM: number;
}

const TOKEN_PRICES: Record<string, TokenPrice> = {
  "claude-opus-4-8": { inPerM: 15, outPerM: 75 },
  "claude-sonnet-5": { inPerM: 3, outPerM: 15 },
  "claude-haiku-4-5": { inPerM: 0.8, outPerM: 4 },
  "gpt-5": { inPerM: 5, outPerM: 15 },
  o3: { inPerM: 10, outPerM: 40 },
  "gemini-2.5-pro": { inPerM: 2.5, outPerM: 10 },
};

/** Fallback when a model id isn't priced — use the balanced (Sonnet) rate. */
const DEFAULT_TOKEN_PRICE: TokenPrice = { inPerM: 3, outPerM: 15 };

/** USD per e2b sandbox-second (rough blended placeholder ~ $0.36/hr). */
const SANDBOX_USD_PER_SECOND = 0.0001;

/** 1 USD = 1_000_000 micros — the integer unit `UsageEvent.costMicros` is stored in. */
export const MICROS_PER_USD = 1_000_000;

/** `costMicros` for one LLM call. Unknown model → the balanced fallback rate (never throws). */
export function costMicrosForLlm(
  model: string | undefined,
  inputTokens = 0,
  outputTokens = 0,
): number {
  const p = (model && TOKEN_PRICES[model]) || DEFAULT_TOKEN_PRICE;
  const usd =
    (Math.max(0, inputTokens) / 1_000_000) * p.inPerM +
    (Math.max(0, outputTokens) / 1_000_000) * p.outPerM;
  return Math.round(usd * MICROS_PER_USD);
}

/** `costMicros` for a sandbox run of `seconds` wall-clock. */
export function costMicrosForSandbox(seconds: number): number {
  return Math.round(Math.max(0, seconds) * SANDBOX_USD_PER_SECOND * MICROS_PER_USD);
}
