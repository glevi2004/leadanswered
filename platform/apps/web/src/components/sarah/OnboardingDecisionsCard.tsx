"use client";

import * as React from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSarah } from "./sarah-context";
import type { OnboardingDecision } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * ONBOARDING DECISIONS (Phase 2). While Lu sets the company up she drafts a batch of
 * choices — company type, how to reach customers, what to build first — as one
 * `onboarding_decisions` doc. This card renders that doc ONE decision at a time
 * (a 2/5-style pager): each decision's question, its options as a selectable list with
 * Lu's pick badged "Recommended", and two ways to move: "Decide this one" records the
 * current choice and advances, "Decide all" fills the rest with Lu's recommendations.
 * When every decision is made it sends Lu one summary line per decision and settles into
 * a "Sent to Lu" state — she takes it from there (drafts the business plan). Local state
 * only; the tracker owns which doc is shown.
 */
export function OnboardingDecisionsCard({
  decisions,
  onDismiss,
}: {
  decisions: OnboardingDecision[];
  onDismiss?: () => void;
}) {
  const { sendMessage } = useSarah();
  const [page, setPage] = React.useState(0);
  // chosen option index per decision index; absent = not decided yet (defaults to recommended)
  const [answers, setAnswers] = React.useState<Record<number, number>>({});
  const [sent, setSent] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const sentRef = React.useRef(false);

  const total = decisions.length;
  const current = decisions[Math.min(page, total - 1)];
  const selected = answers[page] ?? current.recommended;

  // Send Lu one line per decision — "<question> → <chosen label>" — exactly once.
  const finish = React.useCallback(
    (finalAnswers: Record<number, number>) => {
      if (sentRef.current) return;
      sentRef.current = true;
      const summary = decisions
        .map((d, i) => {
          const idx = finalAnswers[i] ?? d.recommended;
          const label = d.options[idx]?.label ?? d.options[d.recommended]?.label ?? "";
          return `${d.question} → ${label}`;
        })
        .join("\n");
      sendMessage(summary);
      setSent(true);
    },
    [decisions, sendMessage],
  );

  const choose = (optionIndex: number) => setAnswers((a) => ({ ...a, [page]: optionIndex }));

  const decideThisOne = () => {
    const next = { ...answers, [page]: selected };
    setAnswers(next);
    if (decisions.every((_, i) => i in next)) {
      finish(next);
      return;
    }
    // advance to the next still-undecided decision (wraps past the end)
    let step = page;
    for (let k = 1; k <= total; k++) {
      const cand = (page + k) % total;
      if (!(cand in next)) {
        step = cand;
        break;
      }
    }
    setPage(step);
  };

  const decideAll = () => {
    const next = { ...answers };
    decisions.forEach((d, i) => {
      if (!(i in next)) next[i] = d.recommended;
    });
    setAnswers(next);
    finish(next);
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
          Got your decisions — I&apos;m drafting your business plan now.
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
        {current.options.map((opt, i) => {
          const isSelected = selected === i;
          const isRecommended = i === current.recommended;
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-border bg-background hover:bg-muted/50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-muted-foreground/40",
                )}
              >
                {isSelected && <Check className="size-2.5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  {isRecommended && (
                    <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                      Recommended
                    </span>
                  )}
                </span>
                {opt.detail && <span className="mt-0.5 block text-xs text-muted-foreground">{opt.detail}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="btn-glow h-7 gap-1 px-3" onClick={decideThisOne}>
          Decide this one <ArrowRight className="size-3.5" />
        </Button>
        <Button size="sm" variant="outline" className="h-7 gap-1 px-2.5" onClick={decideAll}>
          <Check className="size-3.5" /> Decide all
        </Button>
      </div>
    </div>
  );
}
