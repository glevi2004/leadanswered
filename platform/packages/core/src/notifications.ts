import type { NotificationEventType } from "./types.js";

export interface SmsSender {
  send(to: string, body: string): Promise<void>;
}
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

export interface RecipientSubscription {
  eventType: NotificationEventType;
  channels: "sms" | "email" | "both";
}

export interface Recipient {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  subscriptions: RecipientSubscription[];
}

export interface NotificationPayload {
  subject: string;
  smsBody: string;
  emailBody: string;
}

export interface Delivery {
  recipient: Recipient;
  channel: "sms" | "email";
}

/**
 * Pure: who should receive `event`, on which channels, per their subscriptions
 * (SCOPE §5.2). A recipient with no matching subscription receives nothing.
 */
export function selectDeliveries(
  event: NotificationEventType,
  recipients: Recipient[],
): Delivery[] {
  const out: Delivery[] = [];
  for (const r of recipients) {
    const sub = r.subscriptions.find((s) => s.eventType === event);
    if (!sub) continue;
    if ((sub.channels === "sms" || sub.channels === "both") && r.phone) {
      out.push({ recipient: r, channel: "sms" });
    }
    if ((sub.channels === "email" || sub.channels === "both") && r.email) {
      out.push({ recipient: r, channel: "email" });
    }
  }
  return out;
}

/**
 * Deliver a notification to all subscribed recipients. NEVER throws — a failed
 * send must not block or crash the conversation (SCOPE §5.2).
 */
export async function sendNotifications(
  event: NotificationEventType,
  recipients: Recipient[],
  payload: NotificationPayload,
  senders: { sms?: SmsSender; email?: EmailSender },
): Promise<{ sent: number; failed: number }> {
  const deliveries = selectDeliveries(event, recipients);
  let sent = 0;
  let failed = 0;
  for (const d of deliveries) {
    try {
      if (d.channel === "sms" && senders.sms && d.recipient.phone) {
        await senders.sms.send(d.recipient.phone, payload.smsBody);
        sent++;
      } else if (d.channel === "email" && senders.email && d.recipient.email) {
        await senders.email.send(d.recipient.email, payload.subject, payload.emailBody);
        sent++;
      }
    } catch (err) {
      failed++;
      console.error(
        `[notify] delivery failed (${event} → ${d.channel} ${d.recipient.name}):`,
        err,
      );
    }
  }
  return { sent, failed };
}
