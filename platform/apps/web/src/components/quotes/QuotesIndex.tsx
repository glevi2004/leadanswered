"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Flag, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Quote, QuoteStatus, QuoteSummary } from "@/lib/data/quotes/types";
import { duplicateQuote, listQuotesMock, quoteSummaryMock, quotesStore } from "@/lib/data/quotes";
import { createInvoiceFromQuote } from "@/lib/data/invoices";
import { APEX_CHASES } from "@/lib/data/fixtures/apex";
import { formatCents, statusChip } from "@/lib/dashboard-ui";
import { DataTable } from "@/components/app/DataTable";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSarah } from "@/components/sarah/sarah-context";
import { cn } from "@/lib/utils";

/** 06 §2 index: the pipeline strip + an OPERABLE table (row ⋯ menus); "New
 *  quote" lands straight in the composer (the compose model). */

type Row = Quote & { contactName: string };

const STRIP: QuoteStatus[] = ["draft", "sent", "viewed", "accepted", "declined"];

function age(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  if (days === 0) return "today";
  if (days < 14) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

export function QuotesIndex({
  quotes: quotesProp,
  summary: summaryProp,
}: {
  /** Empty collections feed the honest-empty state for a freshly-onboarded org;
   *  omitted (mature/demo) falls back to the Apex fixtures via the mock seam. */
  quotes?: Row[];
  summary?: QuoteSummary;
} = {}) {
  const router = useRouter();
  const { openWidget } = useSarah();
  const [filter, setFilter] = React.useState<QuoteStatus | "open" | "all">("all");
  const [, bump] = React.useReducer((n: number) => n + 1, 0);

  const quotes = quotesProp ?? listQuotesMock();
  const summary = summaryProp ?? quoteSummaryMock();
  const chasedIds = React.useMemo(
    () => new Set(APEX_CHASES.filter((c) => c.status !== "resolved" && c.targetId).map((c) => c.targetId)),
    [],
  );

  const rows = quotes.filter((q) =>
    filter === "all" ? true : filter === "open" ? q.status === "sent" || q.status === "viewed" : q.status === filter,
  );

  /* -------- row actions (in place — the index is operable, 06 §2) -------- */

  const patchWithEvent = (q: Row, patch: Partial<Quote>, event: Quote["history"][number]["event"], actor: Quote["history"][number]["actor"]) => {
    quotesStore.patch(q.id, {
      ...patch,
      history: [...q.history, { at: new Date().toISOString(), event, actor }],
      updatedAt: new Date().toISOString(),
    });
    bump();
  };
  const markRow = (q: Row, status: "accepted" | "declined") => {
    patchWithEvent(q, { status, respondedAt: new Date().toISOString() }, status, "owner");
    toast.success(status === "accepted" ? `${q.number} marked accepted.` : `${q.number} marked declined.`);
  };
  const duplicateRow = (q: Row) => {
    const draft = duplicateQuote(q);
    toast.success(`Duplicated as ${draft.number}.`);
    router.push(`/quotes/${draft.id}`);
  };
  const invoiceRow = (q: Row) => {
    const inv = createInvoiceFromQuote(q);
    quotesStore.patch(q.id, { invoiceId: inv.id });
    toast.success(`Invoice ${inv.number} drafted from ${q.number}.`);
    router.push(`/invoices/${inv.id}`);
  };

  const columns: ColumnDef<Row, unknown>[] = [
    {
      header: "Quote",
      accessorKey: "number",
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="text-sm font-medium">{row.original.number}</span>
          <span className="ml-2 truncate text-xs text-muted-foreground">{row.original.title}</span>
        </div>
      ),
    },
    {
      header: "Contact",
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
      header: "Status",
      accessorKey: "status",
      cell: ({ row }) => {
        const chip = statusChip(row.original.status);
        return (
          <span className="flex items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</span>
            {chasedIds.has(row.original.id) && (
              <Link
                href="/followups"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:opacity-80 dark:text-amber-300"
                title="Sarah's chasing this — see Follow-ups"
              >
                <Flag className="size-2.5" /> chasing
              </Link>
            )}
          </span>
        );
      },
    },
    {
      header: "Total",
      accessorKey: "totalCents",
      cell: ({ row }) => <span className="text-sm tabular-nums">{formatCents(row.original.totalCents)}</span>,
    },
    {
      header: "Age",
      accessorKey: "updatedAt",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{age(row.original.updatedAt)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const q = row.original;
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="Quote actions" className="px-1.5" />}>
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/quotes/${q.id}`)}>
                  {q.status === "draft" ? "Open in composer" : "Open"}
                </DropdownMenuItem>
                {(q.status === "sent" || q.status === "viewed") && (
                  <>
                    <DropdownMenuItem onClick={() => toast.success(`Resent to ${q.contactName}.`)}>Resend</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => markRow(q, "accepted")}>Mark accepted</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => markRow(q, "declined")}>Mark declined</DropdownMenuItem>
                  </>
                )}
                {q.status === "accepted" && !q.invoiceId && (
                  <DropdownMenuItem onClick={() => invoiceRow(q)}>Invoice it</DropdownMenuItem>
                )}
                {q.status === "accepted" && q.invoiceId && (
                  <DropdownMenuItem onClick={() => router.push(`/invoices/${q.invoiceId}`)}>View invoice</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => duplicateRow(q)}>Duplicate</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* status strip — click = filter (06 §2) */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {STRIP.map((s) => {
          const chip = statusChip(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter((f) => (f === s ? "all" : s))}
              className={cn(
                "min-w-24 shrink-0 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50",
                filter === s && "ring-1 ring-foreground/30",
              )}
            >
              <p className="text-lg font-semibold tabular-nums">{summary.counts[s]}</p>
              <p className="text-xs text-muted-foreground">{chip.label}</p>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setFilter((f) => (f === "open" ? "all" : "open"))}
          className={cn(
            "min-w-32 shrink-0 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-muted/50",
            filter === "open" && "ring-1 ring-foreground/30",
          )}
        >
          <p className="text-lg font-semibold tabular-nums">{formatCents(summary.outstandingCents)}</p>
          <p className="text-xs text-muted-foreground">Outstanding — waiting on a yes</p>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search quote, contact…"
        searchFn={(q, query) =>
          q.number.toLowerCase().includes(query) || q.title.toLowerCase().includes(query) || q.contactName.toLowerCase().includes(query)
        }
        onRowClick={(q) => router.push(`/quotes/${q.id}`)}
        toolbar={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" className="h-8 gap-1" />}>
              New quote <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  openWidget();
                  toast("Describe the job to Sarah — she'll draft it for your OK.", {
                    description: "“Quote the Brennan ridge repair — about $2,000.”",
                  });
                }}
              >
                Ask Sarah to draft
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/quotes/new")}>Write it yourself</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
        emptyState={
          <EmptyState
            title="Sarah's ready to draft your first quote."
            body="Describe the job to her, or write one yourself."
            askSarah
          />
        }
      />

    </div>
  );
}
