"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { useSarah } from "./sarah-context";
import { cn } from "@/lib/utils";

/**
 * Composer + per-page suggestion chips (00 §3) — Apollo-style big input card
 * (Levi 2026-07-12): a rounded-2xl container with the (auto-growing) text area
 * on top and a bottom rail holding the page-context chip + send. `onSend`/
 * `chips`/`placeholder` let a scoped surface (the Website site chat, 03 §3)
 * reuse this exact composer against its own thread — never a fork.
 */
export function SarahComposer({
  showContext,
  className,
  onSend,
  chips,
  placeholder,
}: {
  showContext?: boolean;
  className?: string;
  onSend?: (body: string) => void;
  chips?: string[];
  placeholder?: string;
}) {
  const { sendMessage, chipsForCurrentPage, currentPageLabel, contextEntity, messages, composerPrefill, consumePrefill } = useSarah();
  const [text, setText] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const autosize = React.useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  // escalation answers (and future deep links) prefill the composer once
  React.useEffect(() => {
    if (composerPrefill === null) return;
    const t = consumePrefill();
    if (t !== null) {
      setText(t);
      requestAnimationFrame(() => {
        autosize();
        inputRef.current?.focus();
      });
    }
  }, [composerPrefill, consumePrefill, autosize]);
  const send = onSend ?? sendMessage;
  const chipList = chips ?? chipsForCurrentPage;

  const submit = (value?: string) => {
    const body = value ?? text;
    if (!body.trim()) return;
    send(body);
    setText("");
    requestAnimationFrame(() => {
      autosize();
      inputRef.current?.focus();
    });
  };

  const showChips = chipList.length > 0 && messages.length < 12; // keep chips while the thread is young
  const contextLabel =
    showContext && currentPageLabel && currentPageLabel !== "Sarah"
      ? `${currentPageLabel}${contextEntity ? ` · ${contextEntity}` : ""}`
      : null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showChips && (
        <div className="flex flex-wrap gap-1.5">
          {chipList.map((chip) => (
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
        className="rounded-2xl border bg-background shadow-xs transition-shadow focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autosize();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder ?? "What can Sarah do for you?"}
          className="block max-h-30 w-full resize-none bg-transparent px-3.5 pb-1 pt-3 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          {contextLabel ? (
            <span className="max-w-52 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              On: {contextLabel}
            </span>
          ) : (
            <span />
          )}
          <button
            type="submit"
            aria-label="Send"
            disabled={!text.trim()}
            className="btn-glow flex size-7 shrink-0 items-center justify-center rounded-full disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
