"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Circle, MessageCircleQuestion, RotateCw, X } from "lucide-react";
import { useLu } from "./lu-context";
import { useDockData, useSites } from "@/lib/dock/live";
import { useConnectStatus, suggestNext, taskBadge, shortAge } from "./dock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Time-of-day greeting from the local hour. */
function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * Home — the owner's cockpit: a greeting, Lu's open questions, the live **Tasks** the agents
 * are working (each with its status — working / needs approval / failed — and age), and
 * **Suggested Next** (the next moves derived from real state). Tasks click through to the task
 * page; a suggestion clicks into Lu, who answers with the action. Every value is real: tasks +
 * connections are polled server-truth, never fixtures.
 */
export function DockHome() {
  const {
    ownerName, dockOpen, clarifications, dismissClarification, openChoices,
    setDockTab, sendMessage, openDock,
  } = useLu();
  const { tasks, loaded, refresh } = useDockData(dockOpen);
  const { sites } = useSites(dockOpen);
  const { github, vercel, supabase, loaded: connectLoaded } = useConnectStatus(dockOpen);

  // Greeting is time-of-day, resolved after mount so the server/client hour can't mismatch.
  const [greeting, setGreeting] = React.useState("Welcome");
  React.useEffect(() => setGreeting(timeGreeting()), []);

  // The agents' live work: everything not finished, newest first (a few — the rest live in Tasks).
  const openTasks = React.useMemo(
    () =>
      [...tasks]
        .filter((t) => t.status !== "done")
        .sort((a, b) => (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? ""))
        .slice(0, 5),
    [tasks],
  );

  const suggestions = suggestNext({ github, vercel, supabase, tasks, sites });
  const ready = loaded && connectLoaded;

  // Every "next" click goes to Lu with its intent — she replies with the action
  // (the connect form, the plan). Home never opens panels of its own.
  const fireIntent = React.useCallback(
    (intent: string) => {
      sendMessage(intent);
      openDock();
      setDockTab("lu");
    },
    [sendMessage, openDock, setDockTab],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        {greeting}, {ownerName}
      </h2>

      {/* THE OPEN FRONTIER (roadmap P1): the same moves the chat's chips show — Lu's
          latest unanswered question, one tap to answer. One frontier, two surfaces. */}
      {openChoices && (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/[0.05] p-3">
          <div className="flex items-start gap-2">
            <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Lu is asking</p>
              {openChoices.question && (
                <p className="mt-0.5 text-sm text-foreground">{openChoices.question}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {openChoices.options.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => {
                      sendMessage(o);
                      setDockTab("lu");
                    }}
                    className={
                      openChoices.recommended === i
                        ? "rounded-full border border-transparent bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
                        : "rounded-full border bg-background px-2.5 py-0.5 text-xs text-foreground transition-colors hover:bg-muted"
                    }
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Needs clarification — Lu's optionless questions (ask_user); answered in the chat. */}
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

      {/* TASKS — what the agents are working right now (real rows; each clicks to its page). */}
      {openTasks.length > 0 && (
        <section className="mt-6">
          <p className="text-sm font-medium text-muted-foreground">Tasks</p>
          <div className="mt-2 space-y-0.5">
            {openTasks.map((t) => {
              const badge = taskBadge(t.status);
              const age = shortAge(t.updatedAt ?? t.createdAt);
              return (
                <Link
                  key={t.id}
                  href={`/task/${t.id}`}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", badge.dot)} />
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">{t.title}</span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      badge.chip,
                    )}
                  >
                    {badge.label}
                    <ChevronRight className="size-3 opacity-70" />
                  </span>
                  {age && (
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{age}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* SUGGESTED NEXT — the owner's next moves, each one click into Lu. */}
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">Suggested Next</p>
          <button
            type="button"
            aria-label="Refresh"
            title="Refresh"
            onClick={refresh}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <RotateCw className="size-3.5" />
          </button>
        </div>
        {!ready ? (
          <div className="mt-1.5 space-y-1.5 px-2 py-1">
            {[80, 68, 74].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="size-3.5 shrink-0 rounded-full" />
                <Skeleton className="h-3.5" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="mt-1.5 space-y-0.5">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => fireIntent(s.intent)}
                className="group flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Circle className="size-3.5 shrink-0 text-muted-foreground/50" />
                <span className="min-w-0 flex-1">{s.label}</span>
                <ArrowRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 px-2 text-sm text-muted-foreground">
            You&rsquo;re all set — Lu will surface what&rsquo;s next.
          </p>
        )}
      </section>
    </div>
  );
}
