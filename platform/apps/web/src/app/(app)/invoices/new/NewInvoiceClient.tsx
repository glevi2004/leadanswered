"use client";

import * as React from "react";
import { createBlankInvoice } from "@/lib/data/invoices";
import { InvoiceComposer } from "@/components/invoices/InvoiceComposer";

/**
 * Mint the draft client-side, once (effect + updater guard: SSR must not
 * create — the server store would accumulate across requests — and StrictMode
 * re-runs must not double-mint).
 */
export function NewInvoiceClient() {
  const [draftId, setDraftId] = React.useState<string | null>(null);
  React.useEffect(() => {
    setDraftId((id) => id ?? createBlankInvoice("").id);
  }, []);
  if (!draftId) return null;
  return <InvoiceComposer invoiceId={draftId} />;
}
