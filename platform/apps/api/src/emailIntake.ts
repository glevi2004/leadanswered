import { parseLeadEmail, slugFromLeadAddress, synthesizeEmailKey } from "@leadanswered/core";
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
 * (SCOPE §9): match the organization by the `leads+{slug}@…` recipient, parse the
 * customer's name/phone/project, and fire the opening SMS. Never throws — a
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

  const organization = await deps.store.getOrganizationBySlug(slug);
  if (!organization) {
    console.warn(`[email] unknown organization slug "${slug}" — skipped`);
    return { status: "skipped", reason: "unknown_organization" };
  }

  const parsed = parseLeadEmail({
    subject: payload.Subject,
    textBody: payload.TextBody,
    htmlBody: payload.HtmlBody,
    fromName: payload.FromName,
    fromEmail: payload.From,
  });
  if (!parsed.contactPhone) {
    console.warn(`[email] could not parse a phone for ${organization.companyName} — skipped`);
    return { status: "skipped", reason: "no_phone" };
  }

  // Idempotency: a Postmark retry must not create a 2nd lead/text. Use the MessageID, or a
  // synthesized stable key when it's missing. The fast-path read is a courtesy; the
  // `Lead.sourceMessageId @unique` constraint is the real guard (we catch its violation below),
  // which makes this race-safe even under concurrent retries.
  const key =
    payload.MessageID ??
    synthesizeEmailKey({
      organizationId: organization.id,
      from: payload.From,
      subject: payload.Subject,
      phone: parsed.contactPhone,
    });
  if (await deps.store.findLeadBySourceMessageId(key)) {
    console.log(`[email] duplicate inbound ${key} — ignored (idempotent)`);
    return { status: "skipped", reason: "duplicate" };
  }

  let leadId: string;
  try {
    ({ leadId } = await createLeadAndGreet(deps, {
      organizationId: organization.id,
      contactName: parsed.contactName ?? "there",
      contactPhone: parsed.contactPhone,
      projectHint: parsed.projectHint,
      source: "email",
      sourceMessageId: key,
    }));
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      console.log(`[email] duplicate inbound ${key} — ignored (idempotent, raced)`);
      return { status: "skipped", reason: "duplicate" };
    }
    throw e;
  }
  console.log(`[email] new lead ${leadId} for ${organization.companyName} from ${parsed.contactPhone}`);
  return { status: "ok", leadId };
}
