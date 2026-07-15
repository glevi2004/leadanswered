import { APEX, APEX_CONTACTS, APEX_QUOTES } from "../fixtures/apex";
import { makePatchStore } from "../patchStore";
import type { PublicQuote, Quote, QuoteStatus, QuoteSummary } from "./types";

/**
 * Quotes reads behind the mock seam (06 §4). Entirely mock — no Quote table
 * exists; patches/created drafts live in the module-scoped store so the demo
 * behaves like a machine without pretending to persist.
 */

export const quotesStore = makePatchStore<Quote>();
export const deletedQuoteIds = new Set<string>();

const contactNameOf = (id: string) => APEX_CONTACTS.find((c) => c.id === id)?.name ?? "—";

/** Untouched drafts don't exist yet (compose model): a minted-but-never-edited
 *  draft stays out of the index until it has any content. */
const isUntouched = (q: Quote) =>
  q.status === "draft" &&
  q.totalCents === 0 &&
  !q.lineItems.some((l) => l.description.trim()) &&
  (q.title === "New quote" || !q.title.trim()) &&
  !q.notes;

export function listQuotesMock(): Array<Quote & { contactName: string }> {
  return quotesStore
    .withCreated(APEX_QUOTES)
    .filter((q) => !deletedQuoteIds.has(q.id))
    .map((q) => quotesStore.apply(q))
    .filter((q) => !isUntouched(q))
    .map((q) => ({ ...q, contactName: contactNameOf(q.contactId) }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** UNFILTERED by design — the composer must resolve its own untouched draft. */
export function getQuoteMock(id: string): (Quote & { contactName: string }) | null {
  const q = quotesStore
    .withCreated(APEX_QUOTES)
    .filter((x) => !deletedQuoteIds.has(x.id))
    .map((x) => quotesStore.apply(x))
    .find((x) => x.id === id);
  return q ? { ...q, contactName: contactNameOf(q.contactId) } : null;
}

export function quoteSummaryMock(): QuoteSummary {
  const counts: Record<QuoteStatus, number> = { draft: 0, sent: 0, viewed: 0, accepted: 0, declined: 0, expired: 0 };
  let outstandingCents = 0;
  for (const q of listQuotesMock()) {
    counts[q.status] += 1;
    if (q.status === "sent" || q.status === "viewed") outstandingCents += q.totalCents;
  }
  return { counts, outstandingCents };
}

let localQuoteSeq = 1044;

/** "Write it yourself" (06 §5): an empty draft, opened in edit mode. */
export function createQuoteDraft(contactId: string, title: string): Quote {
  const id = `q_local_${++localQuoteSeq}`;
  const now = new Date().toISOString();
  const quote: Quote = {
    id,
    number: `Q-${localQuoteSeq}`,
    contactId,
    title: title || "New quote",
    lineItems: [{ id: `${id}_li1`, description: "", quantity: 1, unitPriceCents: 0, totalCents: 0 }],
    subtotalCents: 0,
    totalCents: 0,
    status: "draft",
    source: "manual",
    token: `demo_${id}`,
    history: [{ at: now, event: "drafted", actor: "owner" }],
    createdAt: now,
    updatedAt: now,
  };
  quotesStore.add(quote);
  return quote;
}

/** Duplicate (06 §5): a fresh draft with the same line items. */
export function duplicateQuote(source: Quote): Quote {
  const id = `q_local_${++localQuoteSeq}`;
  const now = new Date().toISOString();
  const quote: Quote = {
    ...source,
    id,
    number: `Q-${localQuoteSeq}`,
    lineItems: source.lineItems.map((l, i) => ({ ...l, id: `${id}_li${i}` })),
    status: "draft",
    source: "manual",
    token: `demo_${id}`,
    history: [{ at: now, event: "drafted", actor: "owner" }],
    sentAt: undefined,
    viewedAt: undefined,
    respondedAt: undefined,
    expiresAt: undefined,
    invoiceId: undefined,
    acceptedBy: undefined,
    approvalId: undefined,
    createdAt: now,
    updatedAt: now,
  };
  quotesStore.add(quote);
  return quote;
}

/** Public seam (/q/[token]) — fixture state only; drafts and declines resolve to null. */
export function publicQuoteMock(token: string): PublicQuote | null {
  const q = APEX_QUOTES.map((x) => quotesStore.apply(x)).find((x) => x.token === token);
  if (!q || q.status === "draft" || q.status === "declined") return null;
  return {
    businessName: APEX.companyName,
    businessPhone: "(844) 415-7642",
    contactFirstName: contactNameOf(q.contactId).split(" ")[0],
    title: q.title,
    lineItems: q.lineItems.map(({ id, description, quantity, totalCents, optional }) => ({ id, description, quantity, totalCents, optional })),
    subtotalCents: q.subtotalCents,
    discountCents: q.discountCents,
    totalCents: q.totalCents,
    depositCents: q.depositCents,
    photos: q.photos,
    notes: q.notes,
    status: q.status,
    acceptedBy: q.acceptedBy,
    expiresAt: q.expiresAt,
  };
}
