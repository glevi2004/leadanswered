"use client";

import * as React from "react";
import { Check, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { ChoiceOptionRow } from "./ChoiceCard";
import { useSarah } from "./sarah-context";
import type { OnboardingDecision } from "@/lib/dock/live";

/**
 * ONBOARDING DECISIONS (Phase 2). While Lu sets the company up she drafts a batch of
 * choices — the wedge, the first-user moment, the launch surface — as one
 * `onboarding_decisions` doc. This card renders that doc ONE decision at a time
 * (a 1/3-style pager) through the same rows every question uses (ChoiceCard):
 * TAPPING AN OPTION IS THE DECISION — it records the choice and advances to the next
 * undecided one; no separate confirm buttons. "Other" hands the decision to the
 * composer (prefilled with the question) so the owner answers in their own words.
 * When every decision is settled it sends Lu one summary line per tapped decision
 * (typed answers already reached her as messages) and settles into "Sent to Lu".
 * Local state only; the tracker owns which doc is shown.
 */

/** Sentinel for a decision the owner chose to answer in the composer instead. */
const CUSTOM = -1;

export function OnboardingDecisionsCard({
  decisions,
  onDismiss,
}: {
  decisions: OnboardingDecision[];
  onDismiss?: () => void;
}) {
  const { sendMessage, prefillComposer } = useSarah();
  const [page, setPage] = React.useState(0);
  // chosen option index per decision index (CUSTOM = answered in chat); absent = undecided
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [sent, setSent] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const sentRef = React.useRef(false);

  const total = decisions.length;
  const current = decisions[Math.min(page, total - 1)];
  const selected = answers[page];

  // Send Lu one line per tapped decision — "<question> → <chosen label>" — exactly once.
  // Decisions answered via Other arrived as the owner's own messages, so they're skipped.
  const finish = React.useCallback(
    (finalAnswers: Record<number, number>) => {
      if (sentRef.current) return;
      sentRef.current = true;
      const summary = decisions
        .map((d, i) => {
          const idx = finalAnswers[i];
          if (idx === undefined || idx === CUSTOM) return null;
          const label = d.options[idx]?.label;
          return label ? `${d.question} → ${label}` : null;
        })
        .filter(Boolean)
        .join("\n");
      if (summary) sendMessage(summary);
      setSent(true);
    },
    [decisions, sendMessage],
  );

  /** Record an answer for the current decision, then advance to the next undecided one
   * (wrapping past the end); when none remain, send the summary. */
  const decide = (optionIndex: number) => {
    const next = { ...answers, [page]: optionIndex };
    setAnswers(next);
    if (decisions.every((_, i) => i in next)) {
      finish(next);
      return;
    }
    for (let k = 1; k <= total; k++) {
      const cand = (page + k) % total;
      if (!(cand in next)) {
        setPage(cand);
        return;
      }
    }
  };

  const answerInChat = () => {
    prefillComposer(`${current.question} — `);
    decide(CUSTOM);
  };

  if (dismissed) return null;

  if (sent) {
    return (
      <div className="card-lift rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs">
        <div className="flex items-center gap-1.5">
          <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-semibold">Sent to Lu</p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Got your decisions — I&apos;m pulling the final doc together now.
        </p>
      </div>
    );
  }

  return (
    <div className="card-lift rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-semibold">A few decisions to set you up</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Previous decision"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="min-w-9 text-center text-[11px] font-medium tabular-nums text-muted-foreground">
            {Math.min(page + 1, total)}/{total}
          </span>
          <button
            type="button"
            aria-label="Next decision"
            disabled={page >= total - 1}
            onClick={() => setPage((p) => Math.min(total - 1, p + 1))}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronRight className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-2.5 text-sm font-medium text-foreground">{current.question}</p>

      <div className="mt-2 flex flex-col gap-1.5">
        {current.options.map((opt, i) => (
          <ChoiceOptionRow
            key={i}
            label={opt.label}
            detail={opt.detail}
            selected={selected === i}
            recommended={i === current.recommended}
            onSelect={() => decide(i)}
          />
        ))}
        <ChoiceOptionRow
          label="Other"
          detail="Answer this one in your own words"
          selected={selected === CUSTOM}
          onSelect={answerInChat}
        />
      </div>
    </div>
  );
}
