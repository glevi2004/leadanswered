import type { EmailSender } from "@leadanswered/core";

/**
 * Phase 1 email sender — logs to the console. A real provider (Postmark/SES)
 * implements the same `EmailSender` interface in Phase 5 (SCOPE §11).
 */
export class ConsoleEmailSender implements EmailSender {
  async send(to: string, subject: string, body: string): Promise<void> {
    console.log(`\n📧  EMAIL → ${to}\n    Subject: ${subject}\n    ${body.replace(/\n/g, "\n    ")}\n`);
  }
}
