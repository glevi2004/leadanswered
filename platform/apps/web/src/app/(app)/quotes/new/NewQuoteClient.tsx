"use client";

import * as React from "react";
import { createQuoteDraft } from "@/lib/data/quotes";
import { QuoteComposer } from "@/components/quotes/QuoteComposer";

/**
 * Mint the draft client-side, once (effect + updater guard: SSR must not
 * create — the server store would accumulate across requests — and StrictMode
 * re-runs must not double-mint).
 */
export function NewQuoteClient() {
  const [draftId, setDraftId] = React.useState<string | null>(null);
  React.useEffect(() => {
    setDraftId((id) => id ?? createQuoteDraft("", "New quote").id);
  }, []);
  if (!draftId) return null;
  return <QuoteComposer quoteId={draftId} />;
}
