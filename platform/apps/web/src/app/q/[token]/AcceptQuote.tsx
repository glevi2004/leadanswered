"use client";

import * as React from "react";
import type { PublicQuote } from "@/lib/data/quotes/types";
import { formatCents } from "@/lib/dashboard-ui";

/**
 * The interactive half of /q/[token] (06 competitive pass): optional add-ons
 * the customer toggles (total updates live, Jobber-style), the deposit line,
 * and the typed-signature accept. Mock: confirmation is local, nothing persists.
 */
export function AcceptQuote({ quote }: { quote: PublicQuote }) {
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [name, setName] = React.useState("");
  const [accepted, setAccepted] = React.useState(quote.status === "accepted");

  const addOnsCents = quote.lineItems
    .filter((l) => l.optional && selected.has(l.id))
    .reduce((s, l) => s + l.totalCents, 0);
  const totalCents = quote.totalCents + addOnsCents;
  const optionals = quote.lineItems.filter((l) => l.optional);

  if (accepted) {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 text-center">
        <p className="text-sm font-semibold text-emerald-800">You're all set ✓</p>
        <p className="mt-1 text-sm text-emerald-700">
          {quote.acceptedBy ? `Accepted by ${quote.acceptedBy}. ` : ""}Marcus will text you to schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* the base work */}
      <div className="divide-y divide-zinc-100">
        {quote.lineItems
          .filter((l) => !l.optional)
          .map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 py-2">
              <span className="text-sm text-zinc-700">{item.description}</span>
              <span className="shrink-0 text-sm tabular-nums text-zinc-900">{formatCents(item.totalCents)}</span>
            </div>
          ))}
      </div>

      {/* optional add-ons — toggle and watch the total move */}
      {optionals.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Optional add-ons</p>
          {optionals.map((item) => (
            <label key={item.id} className="mt-2 flex cursor-pointer items-start justify-between gap-3">
              <span className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(item.id);
                    else next.delete(item.id);
                    setSelected(next);
                  }}
                  className="mt-0.5 size-4 accent-zinc-900"
                />
                <span className="text-sm text-zinc-700">{item.description}</span>
              </span>
              <span className="shrink-0 text-sm tabular-nums text-zinc-900">+{formatCents(item.totalCents)}</span>
            </label>
          ))}
        </div>
      )}

      {/* totals */}
      <div className="border-t border-zinc-200 pt-3">
        {(quote.discountCents ?? 0) > 0 && (
          <>
            <div className="flex items-center justify-between py-0.5 text-sm text-zinc-500">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatCents(quote.subtotalCents + addOnsCents)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5 text-sm text-zinc-500">
              <span>Discount</span>
              <span className="tabular-nums">−{formatCents(quote.discountCents!)}</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between py-0.5">
          <span className="text-sm font-bold">Total</span>
          <span className="text-base font-bold tabular-nums">{formatCents(totalCents)}</span>
        </div>
        {(quote.depositCents ?? 0) > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            {formatCents(quote.depositCents!)} deposit due on acceptance — the rest when the job's done.
          </p>
        )}
      </div>

      {quote.notes && <p className="text-xs leading-relaxed text-zinc-500">{quote.notes}</p>}

      {/* typed-signature accept (resolves 06 §8 Q1) */}
      <div className="flex flex-col gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your full name to accept"
          aria-label="Type your full name to accept"
          className="w-full rounded-xl border border-zinc-300 px-3.5 py-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500"
        />
        <button
          type="button"
          disabled={name.trim().length < 2}
          onClick={() => setAccepted(true)}
          className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Accept this quote ✓{addOnsCents > 0 ? ` — ${formatCents(totalCents)}` : ""}
        </button>
        <a
          href={`sms:${quote.businessPhone.replace(/[^+\d]/g, "")}`}
          className="w-full rounded-xl border border-zinc-300 py-3 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          💬 Text us with questions
        </a>
        <p className="text-center text-[11px] text-zinc-400">
          Typing your name counts as your signature. Nothing is charged online.
        </p>
      </div>
    </div>
  );
}
