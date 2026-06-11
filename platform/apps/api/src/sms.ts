import twilio from "twilio";
import type { SmsSender } from "@leadanswered/core";
import { env } from "./env.js";

/** Logs outbound SMS to the console — used in demo mode (no Twilio credentials). */
export class ConsoleSmsSender implements SmsSender {
  async send(to: string, body: string): Promise<void> {
    console.log(`\n📲  SMS → ${to}\n    ${body}\n`);
  }
}

/** Sends real SMS via the Twilio REST API. `from` is the contractor's dedicated number. */
export class TwilioSmsSender implements SmsSender {
  private client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  constructor(private from: string) {}
  async send(to: string, body: string): Promise<void> {
    await this.client.messages.create({ to, from: this.from, body });
  }
}
