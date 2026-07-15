/** Invoices-owned types (08-invoices §4). `QuoteLineItem` is owned by 06-quotes. */
import type { QuoteLineItem } from "../quotes/types";

export type InvoiceStatus = "draft" | "sent" | "viewed" | "paid" | "overdue" | "void";
// 'overdue' is derived at read time (unpaid, unvoided, dueAt < now) — 08 §8 Q3.

export interface InvoiceEvent {
  at: string;
  type: "created" | "converted" | "sent" | "viewed" | "reminder" | "paid" | "voided";
  via?: "sms" | "app"; // 'Sent Jun 18 (SMS)'
  note?: string; // 'check — recorded by Sarah'
}

/** Recorded money (08 competitive pass): a quote's deposit arrives as the first
 *  entry; balance due = total − Σ payments; 'paid' derives from balance 0. */
export interface InvoicePayment {
  at: string;
  amountCents: number;
  method: "deposit" | "check" | "cash" | "zelle" | "card" | "other";
  note?: string;
}

export interface Invoice {
  id: string; // 'inv_2031'
  contactId: string; // → Contact (00 §6)
  number: string; // 'INV-2031'
  status: InvoiceStatus; // stored; provider derives 'overdue'/'paid' at read time
  lineItems: QuoteLineItem[]; // conversion copies them 1:1 from the Quote
  subtotalCents: number; // Σ line items
  discountCents?: number; // carried from the quote
  totalCents: number; // subtotal − discount
  payments: InvoicePayment[];
  quoteId?: string; // set when converted from an accepted Quote (06)
  token: string; // public pay-page token → /i/[token]
  payInstructions?: string; // v1 rail: check/Zelle copy shown on the pay page
  issuedAt?: string; // set on send
  dueAt?: string; // default net-14 from issuedAt
  paidAt?: string;
  paidMethod?: "check" | "cash" | "zelle" | "card" | "other";
  history: InvoiceEvent[]; // the status rail, oldest → newest
  createdAt: string;
}

export interface InvoiceSummary {
  outstandingCents: number; // sent + viewed + overdue
  overdueCents: number;
  overdueCount: number;
  paidThisMonthCents: number;
}

export interface PublicInvoice {
  businessName: string;
  businessPhone: string;
  invoiceNumber: string;
  contactFirstName: string;
  lineItems: QuoteLineItem[];
  totalCents: number;
  paidCents: number; // Σ payments (deposit shows as "already paid")
  balanceCents: number;
  dueAt?: string;
  state: "open" | "paid" | "void";
  payInstructions?: string;
}
