"use client";

import * as React from "react";
import type { SarahMessage } from "@/lib/data/shared";
import { LuBuildTracker } from "./LuBuildTracker";
import { useSarah } from "./sarah-context";
import { cn } from "@/lib/utils";

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
 * The owner thread as Claude / cowork-style ROLE BLOCKS (design board: SecChat) — a
 * small role mark + label + the message body, Lu rows plain, owner rows a subtle
 * `bg-muted/40` block. No SMS bubbles. The whole thread sits in a `neu-card` shell.
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
  const { assistantName, ownerName } = useSarah();
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, typing]);

  const initials = ownerInitials(ownerName);

  return (
    <div className={cn("neu-card overflow-hidden rounded-2xl bg-card", className)}>
      {messages.map((m) => {
        const mine = m.role === "owner";
        return (
          <div key={m.id} className={cn("flex gap-3 px-4 py-3.5", mine && "bg-muted/40")}>
            {mine ? (
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                {initials}
              </span>
            ) : (
              <LuMark label={assistantName} />
            )}
            <div className="min-w-0">
              <div className="mb-0.5 text-[11px] font-semibold text-muted-foreground">
                {mine ? "You" : assistantName}
              </div>
              <div className="t-body whitespace-pre-wrap break-words text-[13.5px] text-foreground">
                {m.body}
                {m.via === "sms" && (
                  <span className="ml-1.5 align-middle text-[10px] text-muted-foreground opacity-60">· SMS</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
      {typing && (
        <div className="flex gap-3 px-4 py-3.5">
          <LuMark label={assistantName} />
          <div className="flex items-center gap-1 pt-1" aria-label={`${assistantName} is typing`}>
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        </div>
      )}
      {/* The chat↔Engineer wire: Lu's dispatched builds unfold right here in the thread. */}
      <div className="px-4 pb-1">
        <LuBuildTracker />
      </div>
      <div ref={endRef} />
    </div>
  );
}
