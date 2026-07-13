"use client";

/** DEV-ONLY visual check for the Quotes surfaces (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { QuotesIndex } from "@/components/quotes/QuotesIndex";
import { QuoteDetail } from "@/components/quotes/QuoteDetail";

export default function DevQuotes() {
  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 p-8">
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">/quotes index</h2>
          <div className="flex flex-col gap-4">
            <PageHeader title="Quotes" description="Draft and send quotes by text — “Quote the Miller job.”" />
            <QuotesIndex />
          </div>
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">detail — accepted (q_1042)</h2>
          <QuoteDetail quoteId="q_1042" />
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">detail — draft (q_1044)</h2>
          <QuoteDetail quoteId="q_1044" />
        </section>
      </div>
    </SarahProvider>
  );
}
