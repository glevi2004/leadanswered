"use client";

/** DEV-ONLY visual check for the Invoices surfaces (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { InvoicesIndex } from "@/components/invoices/InvoicesIndex";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";

export default function DevInvoices() {
  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 p-8">
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">/invoices index</h2>
          <div className="flex flex-col gap-4">
            <PageHeader title="Invoices" description="Send and track invoices by text — and see who owes you money." />
            <InvoicesIndex />
          </div>
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">detail — overdue (inv_2032)</h2>
          <InvoiceDetail invoiceId="inv_2032" />
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">detail — paid, from quote (inv_2031)</h2>
          <InvoiceDetail invoiceId="inv_2031" />
        </section>
      </div>
    </SarahProvider>
  );
}
