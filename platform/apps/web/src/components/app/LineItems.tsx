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
  totalCents,
  compact,
  className,
}: {
  items: Array<Pick<QuoteLineItem, "description" | "quantity" | "totalCents"> & { unitPriceCents?: number }>;
  totalCents: number;
  /** compact = public pages: description + total only. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="divide-y divide-border/60">
        {items.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm">{item.description}</p>
              {!compact && (
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {item.unitPriceCents !== undefined ? formatCents(item.unitPriceCents) : "—"}
                </p>
              )}
            </div>
            <span className="shrink-0 text-sm tabular-nums">{formatCents(item.totalCents)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t pt-2.5">
        <span className="text-sm font-semibold">Total</span>
        <span className="text-sm font-semibold tabular-nums">{formatCents(totalCents)}</span>
      </div>
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
  className,
}: {
  items: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
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
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2">
          <Input
            value={item.description}
            onChange={(e) => update(item.id, { description: e.target.value })}
            placeholder="Description"
            aria-label="Line item description"
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
        <span className="text-sm font-semibold tabular-nums">
          {formatCents(items.reduce((s, l) => s + l.totalCents, 0))}
        </span>
      </div>
    </div>
  );
}
