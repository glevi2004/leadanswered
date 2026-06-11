import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  CLAUDE_MODEL: process.env.CLAUDE_MODEL ?? "claude-haiku-4-5",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ?? "",
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ?? "",
};

/**
 * Validate required env vars. Called from the server entrypoint (not at import
 * time) so tests can import the app without a real API key.
 */
export function assertEnv(): void {
  const missing: string[] = [];
  if (!env.ANTHROPIC_API_KEY) missing.push("ANTHROPIC_API_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in.`,
    );
  }
}

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
