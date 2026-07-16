"use client";

import * as React from "react";
import { ArrowRight, MessageCircleQuestion, X } from "lucide-react";
import { useSarah } from "./sarah-context";
import { StatusDot } from "./LuBuildTracker";
import { useDockData, useSites, taskStatusLabel, type DockTask } from "@/lib/dock/live";
import { useConnectStatus, computeRoadmap, suggestNext } from "./dock-data";
import { cn } from "@/lib/utils";

/**
 * Home — the company glance (canvas.md §"the dock"). A greeting, a REAL Roadmap % (derived
 * from connect status + tasks + sites), the live Tasks list (Needs-Clarification /
 * Requires-Approval badges), and a Suggested-Next list derived from actual state. No fixtures:
 * every value comes from the same live proxies the dock already polls.
 */
export function DockHome() {
  const { ownerName, widgetOpen, clarifications, dismissClarification, setDockTab } = useSarah();
  const { tasks, loaded } = useDockData(widgetOpen);
  const { sites } = useSites(widgetOpen);
  const { github, vercel } = useConnectStatus(widgetOpen);

  const roadmap = computeRoadmap({ github, vercel, tasks, sites });
  const suggestions = suggestNext({ github, vercel, tasks, sites });
  const openTasks = tasks.filter((t) => t.status !== "done" && t.status !== "failed");

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <h2 className="text-lg font-semibold text-foreground">Good day, {ownerName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Here&rsquo;s where your company stands.</p>

      {/* Roadmap % — derived setup progress; auto-completes as the workspace changes. */}
      <div className="mt-4 rounded-xl border bg-card p-4 elev-1">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-foreground">Roadmap</p>
          <p className="text-2xl font-semibold tabular-nums text-foreground">{roadmap.percent}%</p>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${roadmap.percent}%` }}
          />
        </div>
        <div className="mt-3 space-y-1.5">
          {roadmap.steps.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border text-[9px]",
                  s.done ? "border-primary bg-primary text-background" : "border-muted-foreground/40 text-transparent",
                )}
              >
                ✓
              </span>
              <span className={cn("min-w-0 flex-1 truncate", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Needs clarification — Lu's non-blocking questions (ask_user), answered in the Lu chat. */}
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
                        <span key={o} className="rounded-full border bg-background px-2 py-0.5 text-xs text-muted-foreground">
                          {o}
                        </span>
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

      {/* Tasks — the live, cross-department list. */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Tasks</p>
          {tasks.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {openTasks.length} open
            </span>
          )}
        </div>
        {openTasks.length > 0 ? (
          <div className="mt-2 space-y-2">
            {openTasks.map((t) => (
              <HomeTaskRow key={t.id} task={t} />
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {loaded ? "Nothing in flight — ask Lu to get a department working." : "Loading…"}
          </p>
        )}
      </div>

      {/* Suggested next — derived from real state (empty ⇒ all set). */}
      <p className="mt-6 text-sm font-medium text-foreground">Suggested next</p>
      {suggestions.length > 0 ? (
        <div className="mt-2.5 space-y-2.5 text-sm text-muted-foreground">
          {suggestions.map((s) => (
            <div key={s} className="flex items-center gap-2.5">
              <span className="size-4 shrink-0 rounded-full border" /> {s}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">You&rsquo;re all set — Lu will surface what&rsquo;s next.</p>
      )}
    </div>
  );
}

/** One task row on Home — status dot, title, dept, and a Requires-Approval badge when gated. */
function HomeTaskRow({ task }: { task: DockTask }) {
  const gated = task.status === "needs_approval";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm">
      <StatusDot status={task.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{task.title}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">{task.departmentKey}</p>
      </div>
      {gated ? (
        <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          Requires approval
        </span>
      ) : (
        <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(task.status)}</span>
      )}
    </div>
  );
}
