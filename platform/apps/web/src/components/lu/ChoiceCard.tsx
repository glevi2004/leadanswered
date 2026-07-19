"use client";

import * as React from "react";
import { Check, PenLine, Sparkles } from "lucide-react";
import type { LuChoices } from "@/lib/data/shared";
import { cn } from "@/lib/utils";

/**
 * THE ONE QUESTION LOOK. Every choice Lu offers — any `ask_user` question, anywhere in the
 * app — renders through these rows: a selectable list with a radio mark, Lu's pick badged
 * Recommended, and an automatic "Other" row that drops the owner into the composer. Tapping
 * an option IS the answer — there are no separate confirm buttons anywhere.
 */
export function ChoiceOptionRow({
  label,
  detail,
  selected,
  recommended,
  disabled,
  onSelect,
}: {
  label: React.ReactNode;
  detail?: string;
  selected: boolean;
  recommended?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
        selected ? "border-primary/50 bg-primary/5" : "border-border bg-background",
        disabled ? "cursor-default" : "hover:bg-muted/50",
        disabled && !selected && "opacity-60",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {selected && <Check className="size-2.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {recommended && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              <Sparkles className="size-2.5" /> Recommended
            </span>
          )}
        </span>
        {detail && <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>}
      </span>
    </button>
  );
}

/**
 * The general choice card — the one component that renders any set of choices Lu offers,
 * reused wherever a question appears (on a thread message, persisted reload-safe in
 * `Message.meta.choices`; and Home's "Lu is asking" frontier). When `live` it's interactive:
 * the question, the options (tap one = `onPick`), and "Other" (`onOther`, focuses the composer).
 * On OLDER turns it renders as history: the option the owner picked stays marked; a typed
 * answer that matched no option marks the Other row with what they wrote.
 */
export function ChoiceCard({
  choices,
  live,
  chosen,
  onPick,
  onOther,
  hint = true,
  className,
}: {
  choices: LuChoices;
  live: boolean;
  /** the owner's reply text that answered this turn (older turns) — marks the match */
  chosen?: string;
  onPick: (option: string) => void;
  onOther: () => void;
  /** show the "tap an option to answer, or just type below" footer (default true). */
  hint?: boolean;
  className?: string;
}) {
  const chosenIndex = !live && chosen !== undefined
    ? choices.options.findIndex((o) => o.trim() === chosen.trim())
    : -1;
  const chosenIsCustom = !live && chosen !== undefined && chosen.trim() !== "" && chosenIndex === -1;

  return (
    <div className={cn("rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs", className)}>
      {choices.question && <p className="text-sm font-medium text-foreground">{choices.question}</p>}
      <div className={cn("flex flex-col gap-1.5", choices.question && "mt-2")}>
        {choices.options.map((o, i) => (
          <ChoiceOptionRow
            key={o}
            label={o}
            selected={live ? false : chosenIndex === i}
            recommended={choices.recommended === i}
            disabled={!live}
            onSelect={live ? () => onPick(o) : undefined}
          />
        ))}
        {(live || chosenIsCustom) && (
          <ChoiceOptionRow
            label="Other"
            detail={chosenIsCustom ? chosen : "Type your own answer"}
            selected={chosenIsCustom}
            disabled={!live}
            onSelect={live ? onOther : undefined}
          />
        )}
      </div>
      {live && hint && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <PenLine className="size-3" /> Tap an option to answer, or just type below.
        </p>
      )}
    </div>
  );
}
