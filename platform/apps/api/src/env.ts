import { config } from "dotenv";
import { expand } from "dotenv-expand";

// Load .env and expand ${VAR} references (e.g. DATABASE_URL uses ${DB_PASSWORD}).
expand(config());

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  // --- AI (provider-agnostic via the Vercel AI SDK; only agent/provider.ts reads these) ---
  AI_PROVIDER: (process.env.AI_PROVIDER ?? "anthropic").toLowerCase(),
  AI_MODEL: process.env.AI_MODEL ?? process.env.CLAUDE_MODEL ?? "claude-haiku-4-5",
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "",
  // --- Persistence / telephony ---
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? "",
  // --- Background worker (BullMQ/Redis) ---
  REDIS_URL: process.env.REDIS_URL ?? "",
  // --- Email-parse lead intake (Postmark inbound — SCOPE §9) ---
  POSTMARK_INBOUND_SECRET: process.env.POSTMARK_INBOUND_SECRET ?? "",
  POSTMARK_SERVER_TOKEN: process.env.POSTMARK_SERVER_TOKEN ?? "",
  LEAD_EMAIL_DOMAIN: process.env.LEAD_EMAIL_DOMAIN ?? "leads.leadanswered.com",
  // --- Observability (Langfuse) ---
  LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY ?? "",
  LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY ?? "",
  // Region base URL — US is https://us.cloud.langfuse.com (EU is the SDK default).
  LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL ?? "",
  // --- Demo harness: contractor phone in a browser (SCOPE §5.3). Off unless DEMO_TOKEN is set. ---
  DEMO_TOKEN: process.env.DEMO_TOKEN ?? "",
  DEMO_CONTRACTOR_SLUG: process.env.DEMO_CONTRACTOR_SLUG ?? "apex",
};

/**
 * Validate required env vars. Called from the server entrypoint (not at import
 * time) so tests can import the app without a real API key.
 */
export function assertEnv(): void {
  const missing: string[] = [];
  if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (env.AI_PROVIDER === "openai" && !env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in.`,
    );
  }
}

/** Langfuse tracing is on when both keys are set; otherwise telemetry is a no-op. */
export const useLangfuse = (): boolean =>
  env.LANGFUSE_PUBLIC_KEY.length > 0 && env.LANGFUSE_SECRET_KEY.length > 0;

/** Postgres persistence is on when DATABASE_URL is set; otherwise we run the in-memory demo store. */
export const usePostgres = (): boolean => env.DATABASE_URL.length > 0;

/** Real Twilio sending is on when credentials are set; otherwise we log to the console. */
export const useTwilio = (): boolean =>
  env.TWILIO_ACCOUNT_SID.length > 0 && env.TWILIO_AUTH_TOKEN.length > 0;


/**
 * Dev/test affordance: let an inbound SMS from an unknown number auto-start a
 * conversation. Off by default (the product flow is lead-initiated). Lets you
 * just text the number and have Sarah answer.
 */
export const allowInboundLeads = (): boolean =>
  (process.env.ALLOW_INBOUND_LEADS ?? "").toLowerCase() === "true";
