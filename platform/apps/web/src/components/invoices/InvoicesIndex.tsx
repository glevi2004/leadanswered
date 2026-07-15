"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Invoice, InvoiceStatus, InvoiceSummary } from "@/lib/data/invoices/types";
import {
  balanceOf,
  createInvoiceFromQuote,
  invoiceSummaryMock,
  invoicesStore,
  listInvoicesMock,
} from "@/lib/data/invoices";
import { listQuotesMock, quotesStore } from "@/lib/data/quotes";
import { formatCents, statusChip } from "@/lib/dashboard-ui";
import { DataTable } from "@/components/app/DataTable";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** 08 §2 index: who owes me money — summary strip + an OPERABLE aging table;
 *  creation lands straight in the composer (compose model). */

type Row = Invoice & { contactName: string; derived: InvoiceStatus };

function dueLabel(inv: Row): { text: string; overdue: boolean } {
  if (inv.derived === "paid" && inv.paidAt)
    return { text: `paid ${new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, overdue: false };
  if (!inv.dueAt) return { text: "—", overdue: false };
  const days = Math.round((Date.now() - new Date(inv.dueAt).getTime()) / 86_400_000);
  if (inv.derived === "overdue") return { text: `${days} days overdue`, overdue: true };
  return { text: `due ${new Date(inv.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, overdue: false };
}

export function InvoicesIndex({
  invoices: invoicesProp,
  summary: summaryProp,
}: {
  /** Empty collections feed the honest-empty state for a freshly-onboarded org;
   *  omitted (mature/demo) falls back to the Apex fixtures via the mock seam. */
  invoices?: Row[];
  summary?: InvoiceSummary;
} = {}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "open" | "overdue" | "paid">("all");
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const [fromQuoteOpen, setFromQuoteOpen] = React.useState(false);

  const invoices = invoicesProp ?? listInvoicesMock();
  const summary = summaryProp ?? invoiceSummaryMock();
  // A new org has no accepted quotes to invoice either — keep the picker honest-empty.
  const invoiceableQuotes = invoicesProp ? [] : listQuotesMock().filter((q) => q.status === "accepted" && !q.invoiceId);

  const rows = invoices.filter((i) => {
    if (filter === "all") return true;
    if (filter === "open") return ["sent", "viewed", "overdue"].includes(i.derived);
    if (filter === "overdue") return i.derived === "overdue";
    return i.derived === "paid";
  });

  /* ------------- row actions in place (08 competitive pass) ------------- */

  const markPaidRow = (inv: Row) => {
    const balance = balanceOf(inv);
    invoicesStore.patch(inv.id, {
      status: "paid",
      paidAt: new Date().toISOString(),
      paidMethod: "check",
      payments: [...inv.payments, { at: new Date().toISOString(), amountCents: balance, method: "check" as const }],
      history: [...inv.history, { at: new Date().toISOString(), type: "paid" as const, note: "check — recorded by you" }],
    });
    bump();
    toast.success(`${inv.number} paid — ${formatCents(balance)} recorded (check).`, {
      description: "Different method or a partial payment? Open the invoice.",
    });
  };
  const voidRow = (inv: Row) => {
    invoicesStore.patch(inv.id, {
      status: "void",
      history: [...inv.history, { at: new Date().toISOString(), type: "voided" as const }],
    });
    bump();
    toast(`${inv.number} voided.`);
  };

  const columns: ColumnDef<Row, unknown>[] = [
    {
      header: "#",
      accessorKey: "number",
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.number}</span>,
    },
    {
      header: "Customer",
      accessorKey: "contactName",
      cell: ({ row }) => (
        <Link
          href={`/customers/${row.original.contactId}`}
          onClick={(e) => e.stopPropagation()}
          className="text-sm underline-offset-2 hover:underline"
        >
          {row.original.contactName}
        </Link>
      ),
    },
    {
      header: "Total",
      accessorKey: "totalCents",
      cell: ({ row }) => {
        const balance = balanceOf(row.original);
        const partial = balance > 0 && balance < row.original.totalCents;
        return (
          <div className="text-sm tabular-nums">
            {formatCents(row.original.totalCents)}
            {partial && <p className="text-xs text-muted-foreground">{formatCents(balance)} due</p>}
          </div>
        );
      },
    },
    {
      header: "Status",
      accessorKey: "derived",
      cell: ({ row }) => {
        const chip = statusChip(row.original.derived);
        return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</span>;
      },
    },
    {
      header: "Due",
      accessorKey: "dueAt",
      cell: ({ row }) => {
        const due = dueLabel(row.original);
        return <span className={cn("text-xs", due.overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>{due.text}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const inv = row.original;
        const unpaid = ["sent", "viewed", "overdue"].includes(inv.derived);
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="Invoice actions" className="px-1.5" />}>
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}`)}>Open</DropdownMenuItem>
                {unpaid && (
                  <>
                    <DropdownMenuItem onClick={() => toast.success(`Resent to ${inv.contactName}.`)}>Resend</DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        toast("Sarah's drafting the reminder.", { description: "It lands in Follow-ups for your OK." })
                      }
                    >
                      Remind
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => markPaidRow(inv)}>Mark paid</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => voidRow(inv)}>
                      Void
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        );
      },
    },
  ];

  const tiles: Array<{ key: typeof filter; label: string; value: string; hint?: string }> = [
    { key: "open", label: "Outstanding", value: formatCents(summary.outstandingCents) },
    { key: "overdue", label: "Overdue", value: formatCents(summary.overdueCents), hint: `${summary.overdueCount} invoice${summary.overdueCount === 1 ? "" : "s"} — Sarah's chasing` },
    { key: "paid", label: "Paid this month", value: formatCents(summary.paidThisMonthCents) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter((f) => (f === t.key ? "all" : t.key))}
            className={cn(
              "card-lift rounded-2xl border bg-card p-4 text-left",
              filter === t.key && "ring-1 ring-foreground/30",
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.label}</p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums">{t.value}</p>
            {t.hint && <p className="mt-0.5 text-xs text-muted-foreground">{t.hint}</p>}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search invoice, customer…"
        searchFn={(i, q) => i.number.toLowerCase().includes(q) || i.contactName.toLowerCase().includes(q)}
        onRowClick={(i) => router.push(`/invoices/${i.id}`)}
        toolbar={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" className="h-8 gap-1" />}>
              New invoice <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFromQuoteOpen(true)}>From an accepted quote</DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/invoices/new")}>From scratch</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        emptyState={
          <EmptyState
            title="We're setting up invoicing for you."
            body="When a job wraps, tell Sarah to invoice it — or turn any accepted quote into an invoice in one click."
            askSarah
          />
        }
      />
      {invoices.some((i) => i.derived === "overdue") && filter === "all" && (
        <p className="text-xs text-muted-foreground">
          Overdue invoices are on Sarah's chase board —{" "}
          <Link href="/followups" className="underline-offset-2 hover:text-foreground hover:underline">
            see Follow-ups
          </Link>
        </p>
      )}

      {/* from an accepted quote (08 §5) */}
      <Dialog open={fromQuoteOpen} onOpenChange={setFromQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invoice an accepted quote</DialogTitle>
            <DialogDescription>Line items and any deposit carry over automatically.</DialogDescription>
          </DialogHeader>
          {invoiceableQuotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing waiting — every accepted quote already has its invoice. Accept one and it'll show up here.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {invoiceableQuotes.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    const inv = createInvoiceFromQuote(q);
                    quotesStore.patch(q.id, { invoiceId: inv.id });
                    setFromQuoteOpen(false);
                    toast.success(`Invoice ${inv.number} drafted from ${q.number}.`);
                    router.push(`/invoices/${inv.id}`);
                  }}
                  className="flex items-center justify-between rounded-xl border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{q.number}</span>
                    <span className="ml-2 truncate text-xs text-muted-foreground">
                      {q.title} — {q.contactName}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">{formatCents(q.totalCents)}</span>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
