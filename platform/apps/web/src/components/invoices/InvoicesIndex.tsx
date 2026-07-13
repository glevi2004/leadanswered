"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Invoice, InvoiceStatus } from "@/lib/data/invoices/types";
import { listInvoicesMock, invoiceSummaryMock } from "@/lib/data/invoices";
import { formatCents, statusChip } from "@/lib/dashboard-ui";
import { DataTable } from "@/components/app/DataTable";
import { EmptyState } from "@/components/app/EmptyState";
import { cn } from "@/lib/utils";

/** 08 §2 index: who owes me money — summary strip + the aging table. */

type Row = Invoice & { contactName: string; derived: InvoiceStatus };

function dueLabel(inv: Row): { text: string; overdue: boolean } {
  if (inv.derived === "paid" && inv.paidAt)
    return { text: `paid ${new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, overdue: false };
  if (!inv.dueAt) return { text: "—", overdue: false };
  const days = Math.round((Date.now() - new Date(inv.dueAt).getTime()) / 86_400_000);
  if (inv.derived === "overdue") return { text: `${days} days overdue`, overdue: true };
  return { text: `due ${new Date(inv.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, overdue: false };
}

export function InvoicesIndex() {
  const router = useRouter();
  const [filter, setFilter] = React.useState<"all" | "open" | "overdue" | "paid">("all");
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  void bump;

  const invoices = listInvoicesMock();
  const summary = invoiceSummaryMock();

  const rows = invoices.filter((i) => {
    if (filter === "all") return true;
    if (filter === "open") return ["sent", "viewed", "overdue"].includes(i.derived);
    if (filter === "overdue") return i.derived === "overdue";
    return i.derived === "paid";
  });

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
          href={`/crm/${row.original.contactId}`}
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
      cell: ({ row }) => <span className="text-sm tabular-nums">{formatCents(row.original.totalCents)}</span>,
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
    </div>
  );
}
