"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ClipboardList, ExternalLink, Hammer } from "lucide-react";
import { useSarah } from "./sarah-context";
import { PlanApprovalCard } from "./PlanApprovalCard";
import { ConnectCard } from "./ConnectCard";
import { useConnectStatus } from "./dock-data";
import {
  useDockData,
  usePublishApprovals,
  useAgentEvents,
  previewUrl,
  planFromArtifact,
  taskStatusLabel,
  type DockTask,
} from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The chat↔Engineer wire, rendered INSIDE the thread (cockpit Part B). When Lu creates
 * tasks, sarah-context records the task ids as a BuildBatch; this tracker polls
 * /api/dock/tasks + /api/dock/artifacts (and /api/dock/approvals) for those ids and shows the
 * lifecycle unfold in the same conversation:
 *   plan gate (PlanApprovalCard) → (owner approves → backend dispatches) → build progress
 *   (queued → building → preview link) → publish gate (PublishApprovals card, kept as-is).
 * The PLAN GATE comes first: when Lu calls propose_plan she stages a pending `approve_plan`
 * approval + a `doc` plan artifact WITHOUT building; this tracker renders that plan for the
 * owner to Approve/Reject before any build runs. Lives in SarahThread so it appears on every
 * surface that renders the thread (the dock's Lu tab and the full-page /sarah), right after
 * Lu's reply.
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
  const { builds, activeChatId, widgetOpen, sendMessage } = useSarah();
  const pathname = usePathname();
  const mine = builds.filter((b) => b.chatId === activeChatId);

  // Poll while this chat has a build AND its surface is actually on screen: the dock's Lu
  // tab (widgetOpen) or the full-page /sarah. Otherwise the thread stays mounted-but-hidden
  // and we'd poll needlessly.
  const onSarahPage = pathname?.startsWith("/sarah") ?? false;
  const active = mine.length > 0 && (widgetOpen || onSarahPage);
  const { tasks, artifacts, loaded } = useDockData(active);
  // The plan gate: /api/dock/approvals carries the pending approve_plan approvals Lu staged
  // (propose_plan). `resolve` POSTs the owner's decision → backend dispatches (approved) or
  // cancels (rejected). Same generic approvals hook the publish gate uses.
  const { approvals, resolve, pending } = usePublishApprovals(active);
  // The journal (docs/product.md §1): the latest event per batch renders as a live activity
  // line — the owner sees PROCESS (coding finished → preview ready → verifying), not a spinner.
  const events = useAgentEvents(active);
  // THE DEAD-END FIX (docs/product.md §7): approving a plan with GitHub/Vercel missing used
  // to silently no-op (the backend returns needsConnect and the approval stays pending, with
  // nothing on screen). Now the connect FORM renders inline, right above the plan card.
  const conn = useConnectStatus(active);
  const missingConnections = conn.loaded && (!conn.github || !conn.vercel);

  if (mine.length === 0) return null;

  return (
    <div className="mt-3 flex flex-col gap-2">
      {mine.map((batch) => {
        const batchIds = new Set(batch.taskIds);
        const batchTasks: DockTask[] = tasks.filter((t) => batchIds.has(t.id));
        // Pending plan gates for THIS batch's tasks — these hold the build until approved.
        const planApprovals = approvals.filter(
          (a) => a.action === "approve_plan" && a.taskId != null && batchIds.has(a.taskId),
        );
        const plannedTaskIds = new Set(planApprovals.map((a) => a.taskId));
        // Tasks/previews to show as build progress = everything NOT still behind a plan gate.
        const progressTasks = batchTasks.filter((t) => !plannedTaskIds.has(t.id));
        const hasEngineering = progressTasks.some((t) => t.departmentKey === "engineering");
        const previewsAll = artifacts.filter(
          (a) => a.kind === "site_preview" && a.taskId && batchIds.has(a.taskId) && !plannedTaskIds.has(a.taskId),
        );
        // Dedupe by title keeping the newest — reconciliation appends a healed copy when a
        // preview URL arrives late, and we want ONE card that fills in, not two.
        const previews = [...new Map(previewsAll.map((a) => [a.title, a])).values()];
        const n = batch.taskIds.length;
        // Header reads the lifecycle: awaiting-plan vs. building.
        const awaitingPlan = planApprovals.length > 0 && progressTasks.length === 0;
        // Newest journal event for this batch's tasks — the live activity line.
        const latestEvent = events.find((e) => e.taskId != null && batchIds.has(e.taskId));

        return (
          <div key={batch.id} className="rounded-xl border bg-card p-3 text-sm text-card-foreground elev-1">
            <div className="flex items-center gap-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                {awaitingPlan ? <ClipboardList className="size-3.5" /> : <Hammer className="size-3.5" />}
              </span>
              <p className="min-w-0 flex-1 font-medium text-foreground">
                {awaitingPlan
                  ? "Lu drafted a plan for your approval"
                  : `Lu created ${n} ${n === 1 ? "task" : "tasks"}${hasEngineering ? " and dispatched the Engineer" : ""}`}
              </p>
            </div>

            {latestEvent && !awaitingPlan && (
              <p className="mt-1.5 truncate pl-8 text-xs text-muted-foreground">{latestEvent.message}</p>
            )}

            {/* Missing connections while work is staged → the form, inline, right here. */}
            {missingConnections && (planApprovals.length > 0 || progressTasks.length > 0) && (
              <ConnectCard
                className="mt-2.5"
                title="Connect your accounts to build"
                subtitle="The build ships to your own GitHub and Vercel. Connect them here, then approve the plan."
              />
            )}

            {/* PLAN GATE first: render Lu's plan for each held task so the owner approves before the build. */}
            {planApprovals.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-2">
                {planApprovals.map((a) => {
                  const doc = artifacts.find((art) => art.kind === "doc" && art.taskId === a.taskId);
                  return (
                    <PlanApprovalCard
                      key={a.id}
                      plan={planFromArtifact(doc?.payload ?? null)}
                      busy={pending.has(a.id)}
                      onApprove={() => resolve(a.id, "approved")}
                      onReject={() => resolve(a.id, "rejected")}
                      onRequestChanges={(feedback) => {
                        // Revise loop: cancel this plan, then ask Lu to re-plan with the feedback.
                        void resolve(a.id, "rejected");
                        sendMessage(`Please revise the plan: ${feedback}`);
                      }}
                    />
                  );
                })}
              </div>
            )}

            {progressTasks.length > 0 ? (
              <div className="mt-2.5 space-y-1.5">
                {progressTasks.map((t) => (
                  <a
                    key={t.id}
                    href={`/task/${t.id}`}
                    className="group flex items-center gap-2 rounded-md transition-colors hover:bg-muted/60"
                  >
                    <StatusDot status={t.status} />
                    <span className="min-w-0 flex-1 truncate text-foreground group-hover:underline">{t.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(t.status)}</span>
                  </a>
                ))}
              </div>
            ) : planApprovals.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {loaded ? "Lining up the work…" : "Getting the work going…"}
              </p>
            ) : null}

            {/* Deep links (docs/product.md §7): the rich detail was buried in the canvas —
                give the chat one-click doors to the PR and the workplace. */}
            {progressTasks.length > 0 && (() => {
              const prUrl = (artifacts
                .filter((a) => a.kind === "pr_diff" && a.taskId && batchIds.has(a.taskId))
                .at(-1)?.payload as { prUrl?: string } | null)?.prUrl;
              return (
                <div className="mt-2 flex items-center gap-3 pl-8 text-xs">
                  <a
                    href="/department/engineering"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Open workplace
                  </a>
                  {prUrl && (
                    <a
                      href={prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      View PR
                    </a>
                  )}
                </div>
              );
            })()}

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
