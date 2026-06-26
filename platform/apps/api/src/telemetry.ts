import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import { env, useLangfuse } from "./env.js";

let started = false;
let processor: LangfuseSpanProcessor | null = null;

/**
 * Boot OpenTelemetry → Langfuse so every agent turn + tool call is traced
 * (SCOPE §7.5 observability). No-op unless LANGFUSE_PUBLIC_KEY/SECRET_KEY are set,
 * so dev/tests need no Langfuse account. Call once at the service entrypoint
 * BEFORE the agent runs. Keys + region are passed explicitly so we always hit the
 * right cloud (the SDK defaults to EU; we're on US).
 */
export function startTelemetry(): void {
  if (started || !useLangfuse()) return;
  processor = new LangfuseSpanProcessor({
    publicKey: env.LANGFUSE_PUBLIC_KEY,
    secretKey: env.LANGFUSE_SECRET_KEY,
    baseUrl: env.LANGFUSE_BASE_URL || undefined,
  });
  const sdk = new NodeSDK({ spanProcessors: [processor] });
  sdk.start();
  started = true;

  // Flush buffered spans on shutdown so the last turns aren't lost (best practice).
  const shutdown = async () => {
    try {
      await processor?.forceFlush();
      await sdk.shutdown();
    } catch (err) {
      console.error("[telemetry] flush on shutdown failed:", err);
    }
    process.exit(0);
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);

  console.log(`[telemetry] Langfuse tracing enabled (${env.LANGFUSE_BASE_URL || "default region"})`);
}

/** Force-flush pending spans — for short-lived scripts/probes that exit fast. */
export async function flushTelemetry(): Promise<void> {
  await processor?.forceFlush();
}
