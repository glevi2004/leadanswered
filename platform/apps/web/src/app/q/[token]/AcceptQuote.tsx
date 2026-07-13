"use client";

import * as React from "react";

/** The explicit customer yes (06 §2). Mock: local confirmation, nothing persists. */
export function AcceptQuote({ businessPhone, alreadyAccepted }: { businessPhone: string; alreadyAccepted: boolean }) {
  const [accepted, setAccepted] = React.useState(alreadyAccepted);

  if (accepted) {
    return (
      <div className="rounded-xl bg-emerald-50 p-4 text-center">
        <p className="text-sm font-semibold text-emerald-800">You're all set ✓</p>
        <p className="mt-1 text-sm text-emerald-700">Marcus will text you to schedule.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setAccepted(true)}
        className="w-full rounded-xl bg-zinc-900 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
      >
        Accept this quote ✓
      </button>
      <a
        href={`sms:${businessPhone.replace(/[^+\d]/g, "")}`}
        className="w-full rounded-xl border border-zinc-300 py-3 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
      >
        💬 Text us with questions
      </a>
    </div>
  );
}
