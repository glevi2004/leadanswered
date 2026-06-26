import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config()); // load worker .env (DATABASE_URL, TWILIO_*, REDIS_URL, LANGFUSE_*)

import { runWorker } from "@leadanswered/api/worker";

/**
 * The always-on background worker process (SCOPE §3.1C). Processes delayed/async
 * jobs (the quiet-lead nudge today; escalation retries, reminders, and the outbound
 * growth engine later). Requires REDIS_URL + DATABASE_URL + Twilio creds.
 */
runWorker();
console.log("[worker] started — waiting for jobs");
