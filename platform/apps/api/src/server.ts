import { createApp } from "./app.js";
import { assertEnv, env, usePostgres, useTwilio } from "./env.js";
import { startTelemetry } from "./telemetry.js";

async function main(): Promise<void> {
  assertEnv();
  startTelemetry(); // Langfuse tracing (no-op unless LANGFUSE_* set)
  const app = await createApp();
  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    console.log(`[api] POST /lead                — create a lead + fire Sarah's opening SMS`);
    console.log(`[api] POST /webhooks/twilio/sms — inbound SMS → Sarah`);
    console.log(`[api] POST /webhooks/email/postmark/:secret — inbound lead email → Sarah`);
    console.log(
      `[api] model: ${env.AI_PROVIDER}/${env.AI_MODEL} | store: ${usePostgres() ? "postgres" : "in-memory"} | sms: ${useTwilio() ? "twilio" : "console"}`,
    );
  });
}

main().catch((err) => {
  console.error("[api] fatal:", err);
  process.exit(1);
});
