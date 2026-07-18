"use client";

import * as React from "react";
import { ArrowRight, MessageCircleQuestion, X } from "lucide-react";
import { useSarah } from "./sarah-context";
import { useDockData, useSites } from "@/lib/dock/live";
import { useConnectStatus, suggestNext } from "./dock-data";

/**
 * Home — the owner's TO-DO list, and nothing else (2026-07-18 redesign): a greeting,
 * Lu's open questions, and **Suggested next** — the next tasks the owner has to do
 * (connect GitHub / Vercel / Supabase, dispatch the first build, ship the first site),
 * derived from real state. Clicking one goes to Lu, and Lu answers with the ACTION —
 * the connect form as her reply (show_connect_form), or a drafted plan. No roadmap %,
 * no task list, no inline panels here: one surface, one job.
 */
export function DockHome() {
  const { ownerName, widgetOpen, clarifications, dismissClarification, setDockTab, sendMessage, openWidget } =
    useSarah();
  const { tasks, loaded } = useDockData(widgetOpen);
  const { sites } = useSites(widgetOpen);
  const { github, vercel, supabase, loaded: connectLoaded } = useConnectStatus(widgetOpen);

  const suggestions = suggestNext({ github, vercel, supabase, tasks, sites });
  const ready = loaded && connectLoaded;

  // Every "next" click goes to Lu with its intent — she replies with the action
  // (the connect form, the plan). Home never opens panels of its own.
  const fireIntent = React.useCallback(
    (intent: string) => {
      sendMessage(intent);
      openWidget();
      setDockTab("lu");
    },
    [sendMessage, openWidget, setDockTab],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <h2 className="text-lg font-semibold text-foreground">Good day, {ownerName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Here&rsquo;s what to do next.</p>

      {/* Needs clarification — Lu's non-blocking questions (ask_user); options answer in one click. */}
      {clarifications.length > 0 && (
        <div className="mt-4 space-y-2">
          {clarifications.map((c) => (
            <div key={c.id} className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-3">
              <div className="flex items-start gap-2">
                <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
                    Needs clarification
                  </p>
                  <p className="mt-0.5 text-sm text-foreground">{c.question}</p>
                  {c.options && c.options.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.options.map((o) => (
                        <button
                          key={o}
                          type="button"
                          onClick={() => {
                            // Answering IS one click (docs/workflow.md §5): send the option as the
                            // owner's reply, jump to the Lu thread, and clear the card.
                            sendMessage(o);
                            setDockTab("lu");
                            dismissClarification(c.id);
                          }}
                          className="rounded-full border bg-background px-2 py-0.5 text-xs text-foreground transition-colors hover:border-amber-500/60 hover:bg-amber-500/10"
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setDockTab("lu")}
                    className="mt-2 flex items-center gap-1 text-xs font-medium text-foreground hover:underline"
                  >
                    Answer in Lu <ArrowRight className="size-3" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss"
                  onClick={() => dismissClarification(c.id)}
                  className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suggested next — THE surface: the owner's next tasks, each one click into Lu. */}
      <p className="mt-5 text-sm font-medium text-foreground">Suggested next</p>
      {!ready ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : suggestions.length > 0 ? (
        <div className="mt-2.5 space-y-1">
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => fireIntent(s.intent)}
              className="group flex w-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
            >
              <span className="size-4 shrink-0 rounded-full border" />
              <span className="min-w-0 flex-1">{s.label}</span>
              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          You&rsquo;re all set — Lu will surface what&rsquo;s next.
        </p>
      )}
    </div>
  );
}
