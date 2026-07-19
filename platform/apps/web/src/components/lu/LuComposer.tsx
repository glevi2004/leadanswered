"use client";

import * as React from "react";
import { ArrowUp, Plus } from "lucide-react";
import { useLu } from "./lu-context";
import { ModelPicker } from "./ModelPicker";
import { UsageMeter } from "./UsageMeter";
import { cn } from "@/lib/utils";

/**
 * Composer + per-page suggestion chips (00 §3) — Apollo-style big input card
 * (Levi 2026-07-12): a rounded-2xl container with the (auto-growing) text area
 * on top and a bottom rail holding the page-context chip + send. `onSend`/
 * `chips`/`placeholder` let a scoped surface (the Website site chat, 03 §3)
 * reuse this exact composer against its own thread — never a fork.
 */
export function LuComposer({
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
  const { sendMessage, chipsForCurrentPage, currentPageLabel, contextEntity, messages, composerPrefill, consumePrefill, assistantName } = useLu();
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
    showContext && currentPageLabel && currentPageLabel !== "Lu"
      ? `${currentPageLabel}${contextEntity ? ` · ${contextEntity}` : ""}`
      : null;
  // The model picker + usage meter live only on the main dock chat (never a scoped `onSend`
  // surface); the meta rail also appears when we're pinned to a page's context entity.
  const showMeta = !onSend || Boolean(contextLabel);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showChips && (
        <div className="flex flex-wrap gap-1.5">
          {chipList.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => submit(chip)}
              className="gloss press rounded-full px-3 py-1 text-xs font-medium text-foreground/80"
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
        className="neu-socket rounded-2xl px-2.5 py-2"
      >
        <div className="flex items-end gap-2">
          {/* attach affordance — not wired yet, so it says so (docs/product.md §0) */}
          <button
            type="button"
            aria-label="Attach (coming soon)"
            title="Attachments — coming soon"
            disabled
            className="gloss mb-0.5 grid size-7 shrink-0 cursor-not-allowed place-items-center rounded-full text-foreground/40"
          >
            <Plus className="size-3.5" />
          </button>
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
            placeholder={placeholder ?? `What can ${assistantName} do for you?`}
            className="field-bare max-h-30 min-h-6 flex-1 resize-none bg-transparent py-1 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            aria-label="Send"
            disabled={!text.trim()}
            className="gloss-ink press mb-0.5 grid size-7 shrink-0 place-items-center rounded-full disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
        {showMeta && (
          <div className="mt-1.5 flex min-w-0 items-center gap-1.5 pl-1">
            {/* The Lu model picker + compute-usage meter show only on the main dock chat. */}
            {!onSend && <ModelPicker />}
            {!onSend && <UsageMeter />}
            {contextLabel && (
              <span className="max-w-40 truncate rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                On: {contextLabel}
              </span>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
