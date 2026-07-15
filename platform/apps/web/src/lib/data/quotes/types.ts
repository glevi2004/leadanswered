/** Quotes-owned types (06-quotes §4). Money is integer cents everywhere (00 §9). */

export type QuoteStatus = "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";

export interface QuoteLineItem {
  id: string;
  description: string; // "Architectural shingles — CertainTeed Landmark"
  quantity: number; // decimals allowed (28 squares, 1.5 hrs)
  unitPriceCents: number;
  totalCents: number; // quantity × unitPriceCents, denormalized
  /** Customer-selectable add-on (06 §2 competitive pass): excluded from totals
   *  until the customer toggles it on /q/[token]. */
  optional?: boolean;
}

export interface QuotePhoto {
  id: string;
  url: string; // mock: "placeholder:" scheme (PhotoStrip renders gradient tiles)
  alt: string;
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
  subtotalCents: number; // Σ non-optional line items
  discountCents?: number; // structured discount line
  totalCents: number; // subtotal − discount; 1_420_000 → "$14,200"
  depositCents?: number; // due on acceptance; becomes the invoice's first payment
  photos?: QuotePhoto[]; // job photos (detail + public page)
  acceptedBy?: string; // typed-signature name from /q accept
  notes?: string; // terms, exclusions — free text in v1
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
  lineItems: Array<Pick<QuoteLineItem, "id" | "description" | "quantity" | "totalCents" | "optional">>;
  subtotalCents: number;
  discountCents?: number;
  totalCents: number; // before any optional add-ons the customer toggles on
  depositCents?: number;
  photos?: QuotePhoto[];
  notes?: string;
  status: Extract<QuoteStatus, "sent" | "viewed" | "accepted" | "expired">;
  acceptedBy?: string;
  expiresAt?: string;
}
