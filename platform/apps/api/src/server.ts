import { createApp } from "./app.js";
import { assertEnv, env, usePostgres, useTwilio } from "./env.js";

async function main(): Promise<void> {
  assertEnv();
  const app = await createApp();
  app.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    console.log(`[api] POST /lead                — create a lead + fire Sarah's opening SMS`);
    console.log(`[api] POST /webhooks/twilio/sms — inbound SMS → Sarah`);
    console.log(
      `[api] model: ${env.CLAUDE_MODEL} | store: ${usePostgres() ? "postgres" : "in-memory"} | sms: ${useTwilio() ? "twilio" : "console"}`,
    );
  });
}

main().catch((err) => {
  console.error("[api] fatal:", err);
  process.exit(1);
});
