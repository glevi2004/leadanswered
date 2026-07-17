import { createServer } from "node:http";
import { buildStore, createApp } from "./app.js";
import { assertEnv, env, useE2b, usePostgres, useVercel } from "./env.js";
import { startTelemetry } from "./telemetry.js";
import { attachTerminalWs } from "./routes/terminal.js";
import { startEngineeringWorker, startMemoryWorker } from "./worker.js";
import { useRedis } from "./queue.js";
import { recommendModel } from "@leadanswered/core";

async function main(): Promise<void> {
  assertEnv();
  startTelemetry(); // Langfuse tracing (no-op unless LANGFUSE_* set)

  // Build the store ONCE and share it between the HTTP app and the terminal WS server,
  // so autonomous Engineer runs and interactive terminal sessions read/write the same rows.
  const store = await buildStore();
  const app = await createApp({ store });

  // Own the http.Server explicitly so the WebSocket PTY route (/api/terminal) can ride the
  // same port as the REST API. `attachTerminalWs` only claims the /api/terminal upgrade; every
  // other HTTP request (and any other upgrade) is left untouched.
  const server = createServer(app);
  attachTerminalWs(server, { store });

  // The durable Engineering worker rides in-process (no-op without REDIS_URL); it can be
  // split to a dedicated process later via `node dist/worker.js`.
  startEngineeringWorker(store);
  startMemoryWorker(store);

  server.listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}`);
    console.log(`[api] POST /api/lu           — Lu orchestrator turn`);
    console.log(`[api] POST /api/engineering  — dispatch the Engineer (async → 202 { taskId })`);
    console.log(`[api] WS   /api/terminal     — cloud terminal (sandbox PTY bridge)`);
    console.log(
      `[api] models: lu=${recommendModel("orchestrator", "text").id} engineer=${recommendModel("coding", "text").id} | store: ${usePostgres() ? "postgres" : "in-memory"} | worker: ${useRedis() ? "bullmq" : "in-process"} | e2b: ${useE2b() ? "on" : "off"} | vercel: ${useVercel() ? "on" : "off"}`,
    );
  });
}

main().catch((err) => {
  console.error("[api] fatal:", err);
  process.exit(1);
});
