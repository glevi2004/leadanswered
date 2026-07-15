"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import type { QuoteLineItem } from "@/lib/data/quotes/types";
import { formatCents } from "@/lib/dashboard-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Line items, shared by Quotes (06, the owner) and Invoices (08): a read-only
 * table with a money footer, an inline editor with cents-safe live totals,
 * and the cents-backed MoneyInput (00 §9 money convention).
 */

export function LineItemsTable({
  items,
  compact,
  className,
}: {
  items: Array<Pick<QuoteLineItem, "description" | "quantity" | "totalCents" | "optional"> & { unitPriceCents?: number }>;
  /** compact = public pages: description + total only. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {items.map((item, i) => (
        <div key={i} className="flex items-start justify-between gap-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm">
              {item.description}
              {item.optional && (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 align-middle text-[10px] font-medium text-muted-foreground">
                  optional add-on
                </span>
              )}
            </p>
            {!compact && (
              <p className="text-xs text-muted-foreground">
                {item.quantity} × {item.unitPriceCents !== undefined ? formatCents(item.unitPriceCents) : "—"}
              </p>
            )}
          </div>
          <span className={cn("shrink-0 text-sm tabular-nums", item.optional && "text-muted-foreground")}>
            {item.optional ? "+" : ""}
            {formatCents(item.totalCents)}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Structured money footer (06/08 competitive pass): subtotal → discount →
 *  total, plus deposit / paid / balance rows when they apply. */
export function TotalsBlock({
  subtotalCents,
  discountCents,
  totalCents,
  depositCents,
  paidCents,
  className,
}: {
  subtotalCents: number;
  discountCents?: number;
  totalCents: number;
  /** Quote-side: "due on acceptance". */
  depositCents?: number;
  /** Invoice-side: Σ payments → renders Paid + Balance due. */
  paidCents?: number;
  className?: string;
}) {
  const row = (label: string, cents: number, opts?: { strong?: boolean; negative?: boolean; muted?: boolean }) => (
    <div className="flex items-center justify-between py-1">
      <span className={cn("text-sm", opts?.strong ? "font-semibold" : "text-muted-foreground", opts?.muted && "text-xs")}>
        {label}
      </span>
      <span className={cn("text-sm tabular-nums", opts?.strong && "font-semibold")}>
        {opts?.negative ? "−" : ""}
        {formatCents(cents)}
      </span>
    </div>
  );
  const balance = paidCents !== undefined ? Math.max(0, totalCents - paidCents) : undefined;
  return (
    <div className={cn("border-t pt-1.5", className)}>
      {(discountCents ?? 0) > 0 && (
        <>
          {row("Subtotal", subtotalCents)}
          {row("Discount", discountCents!, { negative: true })}
        </>
      )}
      {row("Total", totalCents, { strong: true })}
      {(depositCents ?? 0) > 0 && row(`Deposit due on acceptance`, depositCents!)}
      {paidCents !== undefined && paidCents > 0 && (
        <>
          {row("Paid", paidCents, { negative: true })}
          {row("Balance due", balance!, { strong: true })}
        </>
      )}
    </div>
  );
}

/** Cents-backed currency input — displays dollars, stores integer cents. */
export function MoneyInput({
  cents,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  cents: number;
  onChange: (cents: number) => void;
  className?: string;
  "aria-label"?: string;
}) {
  const [text, setText] = React.useState(() => (cents / 100).toString());
  React.useEffect(() => {
    // resync when the value changes from outside (e.g. row reset)
    if (Math.round(parseFloat(text || "0") * 100) !== cents) setText((cents / 100).toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
      <Input
        value={text}
        inputMode="decimal"
        aria-label={ariaLabel ?? "Amount"}
        onChange={(e) => {
          const v = e.target.value;
          if (!/^\d*\.?\d{0,2}$/.test(v)) return;
          setText(v);
          onChange(Math.round(parseFloat(v || "0") * 100));
        }}
        className="h-8 pl-6 text-sm tabular-nums"
      />
    </div>
  );
}

let liSeq = 0;

export function LineItemsEditor({
  items,
  onChange,
  autoFocusFirst,
  className,
}: {
  items: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
  /** Compose model: land with the cursor in the first description field. */
  autoFocusFirst?: boolean;
  className?: string;
}) {
  const update = (id: string, patch: Partial<QuoteLineItem>) =>
    onChange(
      items.map((l) => {
        if (l.id !== id) return l;
        const next = { ...l, ...patch };
        next.totalCents = Math.round(next.quantity * next.unitPriceCents);
        return next;
      }),
    );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.description}
            onChange={(e) => update(item.id, { description: e.target.value })}
            placeholder={idx === 0 ? "What's the work? e.g. “Tear-off & disposal (28 sq)”" : "Description"}
            aria-label="Line item description"
            autoFocus={autoFocusFirst && idx === 0}
            className="h-8 min-w-0 flex-1 text-sm"
          />
          <Input
            value={String(item.quantity)}
            inputMode="decimal"
            aria-label="Quantity"
            onChange={(e) => {
              const v = e.target.value;
              if (!/^\d*\.?\d*$/.test(v)) return;
              update(item.id, { quantity: parseFloat(v || "0") });
            }}
            className="h-8 w-16 text-sm tabular-nums"
          />
          <MoneyInput cents={item.unitPriceCents} onChange={(c) => update(item.id, { unitPriceCents: c })} className="w-28" aria-label="Unit price" />
          <span className="w-20 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{formatCents(item.totalCents)}</span>
          <button
            type="button"
            title={item.optional ? "Optional add-on — click to make it standard" : "Standard — click to make it a customer add-on"}
            aria-label="Toggle optional add-on"
            onClick={() => update(item.id, { optional: !item.optional })}
            className={cn(
              "shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors",
              item.optional ? "border-transparent bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            opt
          </button>
          <button
            type="button"
            aria-label="Remove line item"
            onClick={() => onChange(items.filter((l) => l.id !== item.id))}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs"
          onClick={() => onChange([...items, { id: `li_new_${++liSeq}`, description: "", quantity: 1, unitPriceCents: 0, totalCents: 0 }])}
        >
          <Plus className="size-3.5" /> Add line item
        </Button>
        {/* optional add-ons stay out of the total until the customer picks them */}
        <span className="text-sm font-semibold tabular-nums">
          {formatCents(items.filter((l) => !l.optional).reduce((s, l) => s + l.totalCents, 0))}
        </span>
      </div>
    </div>
  );
}
