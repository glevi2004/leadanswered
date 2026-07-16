"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ExternalLink, Hammer } from "lucide-react";
import { useSarah } from "./sarah-context";
import { useDockData, previewUrl, taskStatusLabel, type DockTask } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The chat↔Engineer wire, rendered INSIDE the thread (cockpit Part B). When Lu creates
 * tasks and dispatches the Engineer, sarah-context records the task ids as a BuildBatch;
 * this tracker polls /api/dock/tasks + /api/dock/artifacts for those ids and shows the
 * build unfold — queued → building → preview link → needs-approval — in the same
 * conversation. The final publish gate is the PublishApprovals card (kept as-is). Lives in
 * SarahThread so it appears on every surface that renders the thread (the dock's Lu tab and
 * the full-page /sarah), always right after Lu's reply.
 */

/** Status indicator: a spinner while working, a colored dot otherwise (mirrors the dock). */
export function StatusDot({ status }: { status: string }) {
  if (status === "in_progress") {
    return (
      <span
        className="size-2 shrink-0 animate-spin rounded-full border-[1.5px] border-muted-foreground border-t-transparent"
        style={{ animationDuration: "1.6s" }}
      />
    );
  }
  const color =
    status === "needs_approval" ? "bg-amber-500"
    : status === "failed" ? "bg-red-500"
    : status === "done" ? "bg-emerald-500"
    : "bg-muted-foreground/50";
  return <span className={cn("size-1.5 shrink-0 rounded-full", color)} />;
}

export function LuBuildTracker() {
  const { builds, activeChatId, widgetOpen } = useSarah();
  const pathname = usePathname();
  const mine = builds.filter((b) => b.chatId === activeChatId);

  // Poll while this chat has a build AND its surface is actually on screen: the dock's Lu
  // tab (widgetOpen) or the full-page /sarah. Otherwise the thread stays mounted-but-hidden
  // and we'd poll needlessly.
  const onSarahPage = pathname?.startsWith("/sarah") ?? false;
  const active = mine.length > 0 && (widgetOpen || onSarahPage);
  const { tasks, artifacts, loaded } = useDockData(active);

  if (mine.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {mine.map((batch) => {
        const batchIds = new Set(batch.taskIds);
        const batchTasks: DockTask[] = tasks.filter((t) => batchIds.has(t.id));
        const hasEngineering = batchTasks.some((t) => t.departmentKey === "engineering");
        const previews = artifacts.filter((a) => a.kind === "site_preview" && a.taskId && batchIds.has(a.taskId));
        const n = batch.taskIds.length;

        return (
          <div key={batch.id} className="rounded-xl border bg-card p-3 text-sm text-card-foreground elev-1">
            <div className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Hammer className="size-3.5" />
              </span>
              <p className="min-w-0 flex-1 font-medium text-foreground">
                Lu created {n} {n === 1 ? "task" : "tasks"}
                {hasEngineering ? " and dispatched the Engineer" : ""}
              </p>
            </div>

            {batchTasks.length > 0 ? (
              <div className="mt-2.5 space-y-1.5">
                {batchTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <StatusDot status={t.status} />
                    <span className="min-w-0 flex-1 truncate text-foreground">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(t.status)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {loaded ? "Lining up the work…" : "Getting the work going…"}
              </p>
            )}

            {previews.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {previews.map((a) => {
                  const url = previewUrl(a.payload);
                  return (
                    <div key={a.id} className="rounded-lg border bg-background p-2.5">
                      <div className="flex items-center gap-2">
                        <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{a.title}</span>
                      </div>
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 block truncate text-xs text-primary underline-offset-2 hover:underline"
                        >
                          {url}
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">Building the preview…</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
