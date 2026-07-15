import Link from "next/link";
import { CreditCard, QrCode } from "lucide-react";
import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { quoteSummaryMock } from "@/lib/data/quotes";
import { invoiceSummaryMock } from "@/lib/data/invoices";
import type { QuoteSummary } from "@/lib/data/quotes/types";
import type { InvoiceSummary } from "@/lib/data/invoices/types";
import { formatCents } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { InvoicesIndex } from "@/components/invoices/InvoicesIndex";
import { QuotesIndex } from "@/components/quotes/QuotesIndex";

export const metadata = { title: "Money — Lead Answered" };

/**
 * Money — one transactional surface merging Quotes + Invoices + who-owes-you
 * (fixed-nav consolidation). Invoices lead: money owed is the headline; quotes
 * (money still in flight) sit underneath. Analytics/reports live on Dashboard.
 *
 * Honest-empty seam (recreated from the old quotes/invoices pages' EMPTY_*
 * constants): a freshly-onboarded org (demoProfile "new") is fed empty
 * collections + zeroed summaries; Mature/demo omits props so each index falls
 * back to the Apex fixtures via its own mock seam.
 */

const EMPTY_QUOTE_SUMMARY: QuoteSummary = {
  counts: { draft: 0, sent: 0, viewed: 0, accepted: 0, declined: 0, expired: 0 },
  outstandingCents: 0,
};

const EMPTY_INVOICE_SUMMARY: InvoiceSummary = {
  outstandingCents: 0,
  overdueCents: 0,
  overdueCount: 0,
  paidThisMonthCents: 0,
};

export default async function MoneyPage() {
  const organization = await requireOrganization();
  // Quotes/invoices are mock-only (no real table yet), so the honest-empty path
  // is prop-presence keyed on the New profile — demo mode resolves to the same
  // mock seam either way. We still settle it as part of the standard shell.
  await isDemoMode();
  const isNew = organization.demoProfile === "new";

  const quoteSummary = isNew ? EMPTY_QUOTE_SUMMARY : quoteSummaryMock();
  const invoiceSummary = isNew ? EMPTY_INVOICE_SUMMARY : invoiceSummaryMock();

  // Outstanding = quotes waiting on a yes + invoices still unpaid.
  const outstandingCents = quoteSummary.outstandingCents + invoiceSummary.outstandingCents;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Money" description="Quotes, invoices, and who owes you — all in one place." />

      {/* combined money summary — quotes + invoices rolled into three numbers */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Outstanding"
          value={formatCents(outstandingCents)}
          hint="Sent quotes + unpaid invoices"
        />
        <StatCard
          label="Overdue"
          value={formatCents(invoiceSummary.overdueCents)}
          hint={
            invoiceSummary.overdueCount > 0
              ? `${invoiceSummary.overdueCount} invoice${invoiceSummary.overdueCount === 1 ? "" : "s"} past due`
              : "Nothing past due"
          }
        />
        <StatCard label="Paid this month" value={formatCents(invoiceSummary.paidThisMonthCents)} />
      </div>

      {/* connect a payout rail — visual stub, no real integration yet */}
      <div className="rounded-2xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Connect a payout rail</p>
            <p className="text-xs text-muted-foreground">
              Let customers pay straight from an invoice — card or Pix. Coming soon.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span title="Coming soon" className="inline-flex">
              <Button variant="outline" size="sm" disabled className="gap-1.5">
                <CreditCard className="size-3.5" /> Stripe
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Soon
                </span>
              </Button>
            </span>
            <span title="Coming soon" className="inline-flex">
              <Button variant="outline" size="sm" disabled className="gap-1.5">
                <QrCode className="size-3.5" /> AbacatePay (Pix)
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Soon
                </span>
              </Button>
            </span>
          </div>
        </div>
      </div>

      {/* Invoices — money owed is the headline, so it leads */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Invoices</h2>
            <p className="text-xs text-muted-foreground">Who owes you, and what&apos;s overdue.</p>
          </div>
          <Link href="/invoices/new" className="text-sm text-primary underline-offset-4 hover:underline">
            New invoice
          </Link>
        </div>
        {isNew ? <InvoicesIndex invoices={[]} summary={EMPTY_INVOICE_SUMMARY} /> : <InvoicesIndex />}
      </section>

      {/* Quotes — estimates still in flight */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Quotes</h2>
            <p className="text-xs text-muted-foreground">Estimates out the door, waiting on a yes.</p>
          </div>
          <Link href="/quotes/new" className="text-sm text-primary underline-offset-4 hover:underline">
            New quote
          </Link>
        </div>
        {isNew ? <QuotesIndex quotes={[]} summary={EMPTY_QUOTE_SUMMARY} /> : <QuotesIndex />}
      </section>
    </div>
  );
}
