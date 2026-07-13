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

export function listQuotesMock(): Array<Quote & { contactName: string }> {
  return quotesStore
    .withCreated(APEX_QUOTES)
    .filter((q) => !deletedQuoteIds.has(q.id))
    .map((q) => quotesStore.apply(q))
    .map((q) => ({ ...q, contactName: contactNameOf(q.contactId) }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getQuoteMock(id: string): (Quote & { contactName: string }) | null {
  return listQuotesMock().find((q) => q.id === id) ?? null;
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

/** Public seam (/q/[token]) — fixture state only; drafts and declines resolve to null. */
export function publicQuoteMock(token: string): PublicQuote | null {
  const q = APEX_QUOTES.map((x) => quotesStore.apply(x)).find((x) => x.token === token);
  if (!q || q.status === "draft" || q.status === "declined") return null;
  return {
    businessName: APEX.companyName,
    businessPhone: "(844) 415-7642",
    contactFirstName: contactNameOf(q.contactId).split(" ")[0],
    title: q.title,
    lineItems: q.lineItems.map(({ description, quantity, totalCents }) => ({ description, quantity, totalCents })),
    totalCents: q.totalCents,
    notes: q.notes,
    status: q.status,
    expiresAt: q.expiresAt,
  };
}
