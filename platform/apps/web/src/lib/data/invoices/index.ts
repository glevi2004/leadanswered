import { APEX, APEX_CONTACTS, APEX_INVOICES } from "../fixtures/apex";
import { makePatchStore } from "../patchStore";
import type { Quote } from "../quotes/types";
import type { Invoice, InvoiceSummary, PublicInvoice } from "./types";

/**
 * Invoices reads behind the mock seam (08 §4). 'overdue' is DERIVED at read
 * time (unpaid, unvoided, dueAt < now) — nothing stores it (08 §8 Q3).
 */

export const invoicesStore = makePatchStore<Invoice>();

const contactNameOf = (id: string) => APEX_CONTACTS.find((c) => c.id === id)?.name ?? "—";

export const paidCentsOf = (inv: Invoice) => inv.payments.reduce((s, p) => s + p.amountCents, 0);
export const balanceOf = (inv: Invoice) => Math.max(0, inv.totalCents - paidCentsOf(inv));

export function deriveStatus(inv: Invoice): Invoice["status"] {
  if (inv.status === "void" || inv.status === "draft") return inv.status;
  if (inv.status === "paid" || balanceOf(inv) === 0) return "paid"; // paid derives from balance 0
  if (inv.dueAt && new Date(inv.dueAt).getTime() < Date.now()) return "overdue";
  return inv.status;
}

/** Untouched drafts don't exist yet (compose model, mirrors quotes). */
const isUntouched = (i: Invoice) =>
  i.status === "draft" && i.totalCents === 0 && !i.lineItems.some((l) => l.description.trim()) && i.payments.length === 0 && !i.quoteId;

export function listInvoicesMock(): Array<Invoice & { contactName: string; derived: Invoice["status"] }> {
  return invoicesStore
    .withCreated(APEX_INVOICES)
    .map((i) => invoicesStore.apply(i))
    .filter((i) => !isUntouched(i))
    .map((i) => ({ ...i, contactName: contactNameOf(i.contactId), derived: deriveStatus(i) }))
    .sort((a, b) => {
      const rank = (s: string) => (s === "overdue" ? 0 : 1);
      return rank(a.derived) - rank(b.derived) || (b.issuedAt ?? b.createdAt).localeCompare(a.issuedAt ?? a.createdAt);
    });
}

/** UNFILTERED by design — the composer must resolve its own untouched draft. */
export function getInvoiceMock(id: string): (Invoice & { contactName: string; derived: Invoice["status"] }) | null {
  const i = invoicesStore
    .withCreated(APEX_INVOICES)
    .map((x) => invoicesStore.apply(x))
    .find((x) => x.id === id);
  return i ? { ...i, contactName: contactNameOf(i.contactId), derived: deriveStatus(i) } : null;
}

export function invoiceSummaryMock(): InvoiceSummary {
  let outstandingCents = 0;
  let overdueCents = 0;
  let overdueCount = 0;
  let paidThisMonthCents = 0;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  for (const i of listInvoicesMock()) {
    if (["sent", "viewed", "overdue"].includes(i.derived)) outstandingCents += i.totalCents;
    if (i.derived === "overdue") {
      overdueCents += i.totalCents;
      overdueCount += 1;
    }
    if (i.derived === "paid" && i.paidAt && new Date(i.paidAt) >= monthStart) paidThisMonthCents += i.totalCents;
  }
  return { outstandingCents, overdueCents, overdueCount, paidThisMonthCents };
}

let localInvoiceSeq = 2033;

/** Convert-to-invoice (06 §5): copies line items 1:1, links the quote; the
 *  quote's deposit arrives as the first recorded payment (balance due follows). */
export function createInvoiceFromQuote(quote: Quote): Invoice {
  const id = `inv_local_${++localInvoiceSeq}`;
  const now = new Date().toISOString();
  const inv: Invoice = {
    id,
    contactId: quote.contactId,
    number: `INV-${localInvoiceSeq}`,
    status: "draft",
    lineItems: quote.lineItems.filter((l) => !l.optional).map((l) => ({ ...l })),
    subtotalCents: quote.subtotalCents,
    discountCents: quote.discountCents,
    totalCents: quote.totalCents,
    payments: quote.depositCents
      ? [{ at: now, amountCents: quote.depositCents, method: "deposit", note: `30% on acceptance — ${quote.number}` }]
      : [],
    quoteId: quote.id,
    token: `demo_${id}`,
    payInstructions: "Check payable to Apex Roofing, or Zelle to (844) 415-7642.",
    history: [{ at: now, type: "converted", note: `from quote ${quote.number}` }],
    createdAt: now,
  };
  invoicesStore.add(inv);
  return inv;
}

/** "+ New invoice → From scratch" (08 §5): a blank draft for a contact. */
export function createBlankInvoice(contactId: string): Invoice {
  const id = `inv_local_${++localInvoiceSeq}`;
  const now = new Date().toISOString();
  const inv: Invoice = {
    id,
    contactId,
    number: `INV-${localInvoiceSeq}`,
    status: "draft",
    lineItems: [{ id: `${id}_li1`, description: "", quantity: 1, unitPriceCents: 0, totalCents: 0 }],
    subtotalCents: 0,
    totalCents: 0,
    payments: [],
    token: `demo_${id}`,
    payInstructions: "Check payable to Apex Roofing, or Zelle to (844) 415-7642.",
    history: [{ at: now, type: "created" }],
    createdAt: now,
  };
  invoicesStore.add(inv);
  return inv;
}

/** Public seam (/i/[token]) — fixture state only. */
export function publicInvoiceMock(token: string): PublicInvoice | null {
  const inv = APEX_INVOICES.map((x) => invoicesStore.apply(x)).find((x) => x.token === token);
  if (!inv || inv.status === "draft") return null;
  const derived = deriveStatus(inv);
  return {
    businessName: APEX.companyName,
    businessPhone: "(844) 415-7642",
    invoiceNumber: inv.number,
    contactFirstName: contactNameOf(inv.contactId).split(" ")[0],
    lineItems: inv.lineItems,
    totalCents: inv.totalCents,
    paidCents: paidCentsOf(inv),
    balanceCents: balanceOf(inv),
    dueAt: inv.dueAt,
    state: derived === "paid" ? "paid" : derived === "void" ? "void" : "open",
    payInstructions: inv.payInstructions,
  };
}
