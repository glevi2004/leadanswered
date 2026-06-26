import type { EmailSender } from "@leadanswered/core";

/**
 * Phase 1 email sender — logs to the console. Used when no real provider is
 * configured (demo/tests).
 */
export class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(`\n📧  EMAIL → ${to}\n    Subject: ${subject}\n    ${body.replace(/\n/g, "\n    ")}\n`);
  }
}

/**
 * Real outbound email via Postmark's REST API (no SDK dependency). Used for
 * contractor notifications when POSTMARK_SERVER_TOKEN is set. Never throws — a
 * delivery failure is logged so it can't break the conversation flow.
 */
export class PostmarkEmailSender implements EmailSender {
  constructor(
    private token: string,
    private from: string,
  ) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    try {
      const res = await fetch("https://api.postmarkapp.com/email", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": this.token,
        },
        body: JSON.stringify({ From: this.from, To: to, Subject: subject, TextBody: body }),
      });
      if (!res.ok) {
        console.error(`[email] Postmark send failed (${res.status}): ${await res.text()}`);
      }
    } catch (err) {
      console.error(`[email] Postmark send error to ${to}:`, err);
    }
  }
}
