import { parseLeadEmail, slugFromLeadAddress } from "@leadanswered/core";
import { createLeadAndGreet, type LeadDeps } from "./leadService.js";

/** The subset of Postmark's inbound webhook payload we read (SCOPE §9). */
export interface PostmarkInbound {
  MessageID?: string;
  Subject?: string;
  TextBody?: string;
  HtmlBody?: string;
  FromName?: string;
  From?: string;
  To?: string;
  OriginalRecipient?: string;
  ToFull?: { Email?: string; Name?: string }[];
}

export interface EmailIntakeResult {
  status: "ok" | "skipped";
  reason?: string;
  leadId?: string;
}

/**
 * Turn a forwarded website lead-notification email into a Sarah conversation
 * (SCOPE §9): match the contractor by the `leads+{slug}@…` recipient, parse the
 * homeowner's name/phone/project, and fire the opening SMS. Never throws — a
 * malformed email is logged and skipped (SCOPE §7.5), so the webhook always 200s.
 */
export async function handleInboundEmail(
  deps: LeadDeps & { leadEmailDomain?: string },
  payload: PostmarkInbound,
): Promise<EmailIntakeResult> {
  const recipient =
    payload.OriginalRecipient ?? payload.ToFull?.[0]?.Email ?? payload.To ?? "";
  const slug = slugFromLeadAddress(recipient);
  if (!slug) {
    console.warn(`[email] no lead slug in recipient "${recipient}" — skipped`);
    return { status: "skipped", reason: "no_slug" };
  }

  const contractor = await deps.store.getContractorBySlug(slug);
  if (!contractor) {
    console.warn(`[email] unknown contractor slug "${slug}" — skipped`);
    return { status: "skipped", reason: "unknown_contractor" };
  }

  const parsed = parseLeadEmail({
    subject: payload.Subject,
    textBody: payload.TextBody,
    htmlBody: payload.HtmlBody,
    fromName: payload.FromName,
    fromEmail: payload.From,
  });
  if (!parsed.contactPhone) {
    console.warn(`[email] could not parse a phone for ${contractor.companyName} — skipped`);
    return { status: "skipped", reason: "no_phone" };
  }

  // Idempotency: a Postmark retry of the same email must not create a 2nd lead/text.
  const messageId = payload.MessageID ?? null;
  if (messageId && (await deps.store.findLeadBySourceMessageId(messageId))) {
    console.log(`[email] duplicate inbound ${messageId} — ignored (idempotent)`);
    return { status: "skipped", reason: "duplicate" };
  }

  const { leadId } = await createLeadAndGreet(deps, {
    contractorId: contractor.id,
    contactName: parsed.contactName ?? "there",
    contactPhone: parsed.contactPhone,
    projectHint: parsed.projectHint,
    source: "email",
    sourceMessageId: messageId,
  });
  console.log(`[email] new lead ${leadId} for ${contractor.companyName} from ${parsed.contactPhone}`);
  return { status: "ok", leadId };
}
