/**
 * Parse a forwarded website lead-notification email into the fields Sarah needs
 * (SCOPE §9). Pure + deterministic so it's fully unit-testable. Built for common
 * contact-form formats (labeled "Name:/Phone:/Message:" bodies, HTML or text);
 * odd templates can later be handled by a per-organization parsing hint.
 */

import { createHash } from "node:crypto";

/**
 * Stable idempotency key for an inbound lead email when Postmark's MessageID is
 * absent — so two retries of the same header-less forward still dedupe (the
 * `Lead.sourceMessageId @unique` constraint then guarantees one lead per email).
 */
export function synthesizeEmailKey(parts: {
  organizationId: string;
  from?: string | null;
  subject?: string | null;
  phone?: string | null;
}): string {
  const h = createHash("sha256")
    .update([parts.organizationId, parts.from ?? "", parts.subject ?? "", parts.phone ?? ""].join("|"))
    .digest("hex");
  return `email:${h}`;
}

export interface LeadEmailInput {
  subject?: string | null;
  textBody?: string | null;
  htmlBody?: string | null;
  fromName?: string | null;
  fromEmail?: string | null;
}

export interface ParsedLead {
  contactName: string | null;
  contactPhone: string | null; // E.164 (+1…) or null
  projectHint: string | null;
}

// US phone shapes: optional +1/1, optional parens, separators are space/dot/dash.
const PHONE_RE = /(?:\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/g;

/** Normalize a phone-ish string to E.164 (+1XXXXXXXXXX). Null if not a plausible US number. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === "1") return `+${d}`;
  return null;
}

/** The lead-forwarding address for a organization (for display in onboarding/dashboard). */
export function organizationLeadAddress(slug: string, domain: string): string {
  return `leads+${slug}@${domain}`;
}

/**
 * Extract the organization slug from a recipient address like
 * `leads+apex@leads.leadanswered.com` (also handles `Name <leads+apex@…>`).
 * If `domain` is given, the address must be on it.
 */
export function slugFromLeadAddress(address: string, domain?: string): string | null {
  const m = address.match(/leads\+([a-z0-9_-]+)@/i);
  if (!m) return null;
  if (domain) {
    const dm = address.match(/@([^>\s]+)/);
    if (!dm || dm[1].toLowerCase() !== domain.toLowerCase()) return null;
  }
  return m[1].toLowerCase();
}

export function parseLeadEmail(input: LeadEmailInput): ParsedLead {
  const text = [input.textBody, input.htmlBody ? stripHtml(input.htmlBody) : ""]
    .filter(Boolean)
    .join("\n");
  return {
    contactName: extractName(text),
    contactPhone: extractPhone(text),
    projectHint: extractProject(text, input.subject),
  };
}

// ---- helpers ----

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ");
}

/** Find `Label: value` on its own line; returns the trimmed value of the first matching label. */
function labeledValue(
  text: string,
  labels: string[],
  avoidLine?: RegExp,
): string | null {
  const lines = text.split(/\r?\n/);
  for (const label of labels) {
    const re = new RegExp(`\\b${label}\\b\\s*[:\\-]\\s*(.+)`, "i");
    for (const line of lines) {
      if (avoidLine && avoidLine.test(line)) continue;
      const m = line.match(re);
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  return null;
}

function firstPhone(s: string): string | null {
  const matches = s.match(PHONE_RE) ?? [];
  for (const m of matches) {
    const n = normalizePhone(m);
    if (n) return n;
  }
  return null;
}

function extractPhone(text: string): string | null {
  const labeled = labeledValue(text, ["phone number", "phone", "telephone", "tel", "mobile", "cell"]);
  if (labeled) {
    const n = firstPhone(labeled);
    if (n) return n;
  }
  return firstPhone(text);
}

function extractName(text: string): string | null {
  const v = labeledValue(
    text,
    ["full name", "contact name", "customer name", "your name", "name", "contact"],
    /company|business|file|user ?name/i,
  );
  return v ? cleanName(v) : null;
}

function cleanName(v: string): string | null {
  const s = v
    .replace(/<[^>]+>/g, "") // drop an <email> chunk
    .split(/[|(]/)[0]
    .trim();
  // reject if it's actually an email/phone, or has no letters
  if (!s || s.includes("@") || (s.replace(/\D/g, "").length >= 7) || !/[a-z]/i.test(s)) return null;
  return s.slice(0, 80);
}

function extractProject(text: string, subject?: string | null): string | null {
  const v = labeledValue(text, [
    "message",
    "comments",
    "comment",
    "details",
    "project",
    "inquiry",
    "description",
    "service",
    "notes",
    "how can we help",
    "what do you need",
  ]);
  if (v) return v.slice(0, 280);
  if (subject) return cleanSubject(subject);
  return null;
}

function cleanSubject(s: string): string | null {
  let cleaned = s.trim();
  // "New lead from website: gutter cleaning" → drop the notification-ish prefix
  // before the colon, keeping the actual content after it.
  const colon = cleaned.indexOf(":");
  if (
    colon !== -1 &&
    colon < cleaned.length - 1 &&
    /\b(new|lead|leads|inquiry|contact|form|submission|website|message|notification)\b/i.test(
      cleaned.slice(0, colon),
    )
  ) {
    cleaned = cleaned.slice(colon + 1).trim();
  }
  return cleaned || s.trim() || null;
}
