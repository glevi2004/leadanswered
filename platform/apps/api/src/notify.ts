import {
  formatSlot,
  safeZone,
  sendNotifications,
  type OrganizationConfig,
  type EmailSender,
  type GatheredInfo,
  type NotificationEventType,
  type NotificationPayload,
  type Recipient,
  type SmsSender,
} from "@leadanswered/core";
import type { LeadRecord, Store } from "./store/types.js";

export interface NotifyDeps {
  store: Store;
  sms: SmsSender;
  email?: EmailSender;
}

/**
 * Fire a per-event organization notification to all subscribed recipients (SCOPE §5.2).
 * Shared by the agent tools and the worker (the quiet-lead nudge fires
 * `lead_unresponsive`). Never throws — `sendNotifications` catches per-delivery
 * failures so a bad send never blocks the conversation.
 */
export async function fireNotification(
  deps: NotifyDeps,
  args: { organization: OrganizationConfig; lead: LeadRecord },
  event: NotificationEventType,
  merged: GatheredInfo,
  slotIso: string | null,
): Promise<void> {
  const recipients: Recipient[] = (await deps.store.getRecipients(args.organization.id)).map(
    (r) => ({ id: r.id, name: r.name, phone: r.phone, email: r.email, subscriptions: r.subscriptions }),
  );
  const payload = buildPayload(event, args, merged, slotIso);
  await sendNotifications(event, recipients, payload, { sms: deps.sms, email: deps.email });
}

function buildPayload(
  event: NotificationEventType,
  args: { organization: OrganizationConfig; lead: LeadRecord },
  merged: GatheredInfo,
  slotIso: string | null,
): NotificationPayload {
  const { lead, organization } = args;
  // Organization-facing times are in the organization's own timezone.
  const when = slotIso ? formatSlot(slotIso, safeZone(organization.standingAvailability?.timezone)) : "";
  if (event === "booking_confirmed" || event === "booking_rescheduled") {
    const verb = event === "booking_rescheduled" ? "Rescheduled" : "New booking";
    const emailBody = [
      `${verb} for ${organization.companyName}:`,
      `Name: ${lead.contactName}`,
      `Phone: ${lead.contactPhone}`,
      `Project: ${merged.projectType ?? "n/a"}`,
      `Address: ${merged.fullAddress ?? "n/a"}`,
      `When: ${when}`,
    ].join("\n");
    return {
      subject: `${verb} — ${lead.contactName}`,
      smsBody: `📅 ${verb}: ${lead.contactName}, ${merged.projectType ?? ""} @ ${when}. ${merged.fullAddress ?? ""} (${lead.contactPhone})`,
      emailBody,
    };
  }
  if (event === "booking_cancelled") {
    return {
      subject: `Booking cancelled — ${lead.contactName}`,
      smsBody: `❌ Booking cancelled: ${lead.contactName} (${lead.contactPhone})`,
      emailBody: `Cancelled: ${lead.contactName} / ${lead.contactPhone} / was ${merged.projectType ?? ""}`,
    };
  }
  if (event === "new_qualified_lead") {
    return {
      subject: `New qualified lead — ${lead.contactName}`,
      smsBody: `✅ Qualified lead: ${lead.contactName}, ${merged.projectType ?? ""}, ${merged.serviceZip ?? ""} (${lead.contactPhone})`,
      emailBody: `Qualified lead: ${lead.contactName} / ${lead.contactPhone} / ${merged.projectType ?? ""} / ${merged.serviceZip ?? ""}`,
    };
  }
  if (event === "lead_unresponsive") {
    return {
      subject: `Quiet lead — ${lead.contactName}`,
      smsBody: `🔔 Quiet lead: ${lead.contactName} hasn't replied${merged.projectType ? ` about ${merged.projectType}` : ""} (${lead.contactPhone}). Sarah sent a follow-up.`,
      emailBody: `Quiet lead (no reply after Sarah's follow-up): ${lead.contactName} / ${lead.contactPhone} / ${merged.projectType ?? "n/a"} / ${merged.serviceZip ?? "n/a"}`,
    };
  }
  // Fallthrough = disqualified_lead.
  return {
    subject: `Lead turned away — ${lead.contactName}`,
    smsBody: `🚫 Sarah turned away ${lead.contactName} (${merged.serviceZip ?? "?"}, ${merged.projectType ?? "?"})`,
    emailBody: `Disqualified: ${lead.contactName} / ${merged.serviceZip ?? ""} / ${merged.projectType ?? ""}`,
  };
}
