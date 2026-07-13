/** Quotes-owned types (06-quotes §4). Money is integer cents everywhere (00 §9). */

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";

export interface QuoteLineItem {
  id: string;
  description: string; // "Architectural shingles — CertainTeed Landmark"
  quantity: number; // decimals allowed (28 squares, 1.5 hrs)
  unitPriceCents: number;
  totalCents: number; // quantity × unitPriceCents, denormalized
}

export type QuoteEvent = {
  at: string; // ISO
  event: "drafted" | "approved" | "sent" | "resent" | "viewed" | "accepted" | "declined" | "expired" | "edited";
  actor: "sarah" | "owner" | "customer" | "system";
};

export interface Quote {
  id: string; // 'q_1042'
  number: string; // display: 'Q-1042'
  contactId: string; // → Contact (00 §6)
  title: string; // "Roof replacement — 14 Maple St"
  lineItems: QuoteLineItem[];
  totalCents: number; // 1_420_000 → "$14,200"
  notes?: string; // terms, deposit, exclusions — free text in v1
  status: QuoteStatus;
  source: "sarah" | "manual";
  approvalId?: string; // the Approval (kind 'quote') that gated the send
  token: string; // public accept-page token → /q/[token]
  history: QuoteEvent[]; // oldest → newest
  sentAt?: string;
  viewedAt?: string;
  respondedAt?: string;
  expiresAt?: string; // default sentAt + 30 days
  invoiceId?: string; // set by convert-to-invoice → Invoice (08)
  createdAt: string;
  updatedAt: string;
}

export interface QuoteSummary {
  counts: Record<QuoteStatus, number>;
  outstandingCents: number; // Σ totals where status ∈ {sent, viewed}
}

export interface PublicQuote {
  businessName: string;
  businessPhone: string; // the org's Sarah number
  contactFirstName: string;
  title: string;
  lineItems: Array<Pick<QuoteLineItem, "description" | "quantity" | "totalCents">>;
  totalCents: number;
  notes?: string;
  status: Extract<QuoteStatus, "sent" | "viewed" | "accepted" | "expired">;
  expiresAt?: string;
}
