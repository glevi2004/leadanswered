"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import type { SarahChoices, SarahMessage } from "@/lib/data/shared";
import { LuBuildTracker } from "./LuBuildTracker";
import { LuOnboardingTracker } from "./LuOnboardingTracker";
import { LuDocsTracker } from "./LuDocsTracker";
import { ConnectCard } from "./ConnectCard";
import { useSarah } from "./sarah-context";
import { cn } from "@/lib/utils";

/**
 * THE CHOICE BAR (roadmap P1 — moves live on the message). Under the LATEST Lu turn the
 * chips are tappable — one primary (Recommended) — and a tap sends that option as the
 * owner's message; the composer stays live (chips are an offer, not a cage). On OLDER
 * turns the chips render muted, with the option the owner actually picked highlighted —
 * the dialogue-history feel. Persisted in `Message.meta.choices`, so all of this is
 * reload-safe.
 */
function ChoiceBar({
  choices,
  live,
  chosen,
  onPick,
}: {
  choices: SarahChoices;
  live: boolean;
  /** the owner's reply text that answered this turn (older turns) — highlights a match */
  chosen?: string;
  onPick: (option: string) => void;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {choices.options.map((o, i) => {
        const isRec = choices.recommended === i;
        const isChosen = !live && chosen !== undefined && chosen.trim() === o.trim();
        if (live) {
          return (
            <button
              key={o}
              type="button"
              onClick={() => onPick(o)}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                isRec
                  ? "btn-glow border-transparent bg-primary text-primary-foreground"
                  : "bg-background text-foreground hover:bg-muted",
              )}
            >
              {isRec && <Sparkles className="size-3" />}
              {o}
            </button>
          );
        }
        return (
          <span
            key={o}
            className={cn(
              "rounded-full border px-3 py-1 text-[11.5px]",
              isChosen
                ? "border-primary/40 bg-primary/10 font-medium text-primary"
                : "text-muted-foreground/60",
            )}
          >
            {o}
          </span>
        );
      })}
    </div>
  );
}

/** Lu's mark — the small pixel-glyph badge (NOT the big neu circle). One per Lu turn. */
function LuMark({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        "gloss-ink grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-semibold text-white",
        className,
      )}
    >
      {label.slice(0, 2)}
    </span>
  );
}

/** Two-letter initials for the owner mark ("You" side). */
function ownerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "You";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The owner thread, cofounder-style: LU'S TURNS ARE PLAIN TEXT on the surface — no card,
 * no bubble — and only the OWNER'S turns sit in a rounded block. (The old version wrapped
 * the whole thread in a `neu-card`, which made every Lu message read as a boxed card.)
 */
export function SarahThread({
  messages,
  typing,
  className,
}: {
  messages: SarahMessage[];
  typing: boolean;
  className?: string;
}) {
  const { assistantName, ownerName, sendMessage } = useSarah();
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing]);

  const initials = ownerInitials(ownerName);
  const lastId = messages.at(-1)?.id;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {messages.map((m, idx) => {
        const mine = m.role === "owner";
        return mine ? (
          <div key={m.id} className="flex gap-3 rounded-xl bg-muted/50 px-3.5 py-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
              {initials}
            </span>
            <div className="t-body min-w-0 whitespace-pre-wrap break-words pt-0.5 text-[13.5px] text-foreground">
              {m.body}
              {m.via === "sms" && (
                <span className="ml-1.5 align-middle text-[10px] text-muted-foreground opacity-60">· SMS</span>
              )}
            </div>
          </div>
        ) : (
          <div key={m.id} className="flex gap-3 px-1 py-2">
            <LuMark label={assistantName} />
            <div className="min-w-0 flex-1">
              <div className="mb-0.5 text-[11px] font-semibold text-muted-foreground">{assistantName}</div>
              <div className="t-body whitespace-pre-wrap break-words text-[13.5px] text-foreground">
                {m.body}
              </div>
              {/* Structured card attached to this Lu turn — her reply IS the form. */}
              {m.card === "connect" && (
                <ConnectCard
                  className="mt-2.5"
                  title="Connect your accounts"
                  subtitle="Builds land in your own GitHub and Vercel; Supabase is optional, for apps with a database."
                />
              )}
              {/* The moves — tappable on the latest turn, history on older ones. */}
              {m.choices && (
                <ChoiceBar
                  choices={m.choices}
                  live={m.id === lastId && !typing}
                  chosen={messages[idx + 1]?.role === "owner" ? messages[idx + 1].body : undefined}
                  onPick={sendMessage}
                />
              )}
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="flex gap-3 px-1 py-2">
          <LuMark label={assistantName} />
          <div className="flex items-center gap-1 pt-1" aria-label={`${assistantName} is typing`}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}
      {/* The onboarding wire + the doc gate + the chat↔Engineer wire: all unfold in the thread. */}
      <div className="pb-1">
        <LuOnboardingTracker />
        <LuDocsTracker />
        <LuBuildTracker />
      </div>
      <div ref={endRef} />
    </div>
  );
}
