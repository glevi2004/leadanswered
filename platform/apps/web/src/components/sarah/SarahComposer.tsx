"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { useSarah } from "./sarah-context";
import { cn } from "@/lib/utils";

/** Composer + per-page suggestion chips + the page-context chip (00 §3). */
export function SarahComposer({ showContext, className }: { showContext?: boolean; className?: string }) {
  const { sendMessage, chipsForCurrentPage, currentPageLabel, messages } = useSarah();
  const [text, setText] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const submit = (value?: string) => {
    const body = value ?? text;
    if (!body.trim()) return;
    sendMessage(body);
    setText("");
    inputRef.current?.focus();
  };

  const showChips = messages.length < 12; // keep chips while the thread is young

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showChips && (
        <div className="flex flex-wrap gap-1.5">
          {chipsForCurrentPage.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => submit(chip)}
              className="rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              {chip}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-center gap-2 rounded-full border bg-background py-1 pl-4 pr-1 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
      >
        {showContext && currentPageLabel && currentPageLabel !== "Sarah" && (
          <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">
            On: {currentPageLabel}
          </span>
        )}
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask Sarah anything…"
          className="h-8 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!text.trim()}
          className="btn-glow flex size-8 shrink-0 items-center justify-center rounded-full disabled:opacity-40 disabled:shadow-none"
        >
          <ArrowUp className="size-4" />
        </button>
      </form>
    </div>
  );
}
