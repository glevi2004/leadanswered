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

export function deriveStatus(inv: Invoice): Invoice["status"] {
  if (inv.status === "paid" || inv.status === "void" || inv.status === "draft") return inv.status;
  if (inv.dueAt && new Date(inv.dueAt).getTime() < Date.now()) return "overdue";
  return inv.status;
}

export function listInvoicesMock(): Array<Invoice & { contactName: string; derived: Invoice["status"] }> {
  return invoicesStore
    .withCreated(APEX_INVOICES)
    .map((i) => invoicesStore.apply(i))
    .map((i) => ({ ...i, contactName: contactNameOf(i.contactId), derived: deriveStatus(invoicesStore.apply(i)) }))
    .sort((a, b) => {
      const rank = (s: string) => (s === "overdue" ? 0 : 1);
      return rank(a.derived) - rank(b.derived) || (b.issuedAt ?? b.createdAt).localeCompare(a.issuedAt ?? a.createdAt);
    });
}

export function getInvoiceMock(id: string): (Invoice & { contactName: string; derived: Invoice["status"] }) | null {
  return listInvoicesMock().find((i) => i.id === id) ?? null;
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

/** Convert-to-invoice (06 §5): copies line items 1:1, links the quote. */
export function createInvoiceFromQuote(quote: Quote): Invoice {
  const id = `inv_local_${++localInvoiceSeq}`;
  const inv: Invoice = {
    id,
    contactId: quote.contactId,
    number: `INV-${localInvoiceSeq}`,
    status: "draft",
    lineItems: quote.lineItems.map((l) => ({ ...l })),
    totalCents: quote.totalCents,
    quoteId: quote.id,
    token: `demo_${id}`,
    payInstructions: "Check payable to Apex Roofing, or Zelle to (844) 415-7642.",
    history: [{ at: new Date().toISOString(), type: "converted", note: `from quote ${quote.number}` }],
    createdAt: new Date().toISOString(),
  };
  invoicesStore.add(inv);
  return inv;
}

/** Public seam (/i/[token]) — fixture state only. */
export function publicInvoiceMock(token: string): PublicInvoice | null {
  const inv = APEX_INVOICES.map((x) => invoicesStore.apply(x)).find((x) => x.token === token);
  if (!inv || inv.status === "draft") return null;
  return {
    businessName: APEX.companyName,
    businessPhone: "(844) 415-7642",
    invoiceNumber: inv.number,
    contactFirstName: contactNameOf(inv.contactId).split(" ")[0],
    lineItems: inv.lineItems,
    totalCents: inv.totalCents,
    dueAt: inv.dueAt,
    state: inv.status === "paid" ? "paid" : inv.status === "void" ? "void" : "open",
    payInstructions: inv.payInstructions,
  };
}
