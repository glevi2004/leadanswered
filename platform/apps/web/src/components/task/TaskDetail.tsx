"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  GitPullRequestArrow,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSarah } from "@/components/sarah/sarah-context";
import { StatusDot } from "@/components/sarah/LuBuildTracker";
import {
  useDockData,
  usePublishApprovals,
  useAgentEvents,
  planFromArtifact,
  previewUrl,
  taskStatusLabel,
  type DockArtifact,
} from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * THE TASK DETAIL — the §8b hub (docs/product.md; DEVELOPMENT ladder step 0): ONE page that
 * holds everything about a Build — the plan, the acceptance checklist with verify verdicts,
 * the events timeline (the journal, human-readable), the PR, the live preview, pending
 * approvals with their buttons, and the actions (Retry · Request changes). Every task row and
 * chat card across the app clicks through to here. All server rows, polled live — reload-safe.
 */

/** The latest acceptance verdict artifact for the task ({ pass, unmet, notes }). */
function verdictFromArtifacts(artifacts: DockArtifact[]): { pass: boolean; unmet: string[]; notes: string } | null {
  const doc = artifacts
    .filter((a) => a.kind === "doc" && (a.payload as { type?: string } | null)?.type === "acceptance")
    .at(-1);
  if (!doc) return null;
  const p = doc.payload as { pass?: boolean; unmet?: unknown; notes?: string } | null;
  return {
    pass: Boolean(p?.pass),
    unmet: Array.isArray(p?.unmet) ? p.unmet.filter((s): s is string => typeof s === "string") : [],
    notes: typeof p?.notes === "string" ? p.notes : "",
  };
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const { prefillComposer, openWidget, setDockTab } = useSarah();
  const { tasks, artifacts, loaded } = useDockData(true);
  const { approvals, resolve, pending } = usePublishApprovals(true);
  const events = useAgentEvents(true);
  const [retrying, setRetrying] = React.useState(false);

  const task = tasks.find((t) => t.id === taskId);
  const mine = artifacts.filter((a) => a.taskId === taskId);
  const plan = planFromArtifact(
    (mine.find((a) => a.kind === "doc" && (a.payload as { type?: string } | null)?.type === "plan")
      ?.payload ?? null) as Record<string, unknown> | null,
  );
  const verdict = verdictFromArtifacts(mine);
  const diff = mine.filter((a) => a.kind === "pr_diff").at(-1);
  const diffPayload = (diff?.payload ?? null) as { prUrl?: string; prNumber?: number; diff?: string } | null;
  const preview = mine.filter((a) => a.kind === "site_preview").at(-1);
  const url = previewUrl((preview?.payload ?? null) as Record<string, unknown> | null);
  const session = mine.filter((a) => a.kind === "agent_session").at(-1);
  const transcript = ((session?.payload ?? null) as { stdout?: string } | null)?.stdout ?? "";
  const myApprovals = approvals.filter((a) => a.taskId === taskId);
  const myEvents = events.filter((e) => e.taskId === taskId);

  const requestChanges = () => {
    prefillComposer(`Request changes on "${task?.title ?? "this build"}": `);
    openWidget();
    setDockTab("lu");
  };

  const retry = async () => {
    if (!task) return;
    setRetrying(true);
    try {
      await fetch("/api/dock/tasks/retry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: task.id, message: task.body?.trim() || task.title }),
      });
    } finally {
      setRetrying(false);
    }
  };

  if (!loaded) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (!task) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Task not found (or not yours).</p>
        <Link href="/canvas" className="mt-2 inline-block text-sm text-primary hover:underline">
          Back to the workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* header */}
      <div>
        <Link
          href="/canvas"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Workspace
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <StatusDot status={task.status} />
          <h1 className="text-xl font-semibold text-foreground">{task.title}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {taskStatusLabel(task.status)}
          </span>
          <span className="text-xs capitalize text-muted-foreground">{task.departmentKey}</span>
        </div>
        {task.body && <p className="mt-1.5 text-sm text-muted-foreground">{task.body}</p>}
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center gap-2">
        {task.status === "failed" && (
          <Button size="sm" onClick={retry} disabled={retrying}>
            {retrying ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            Retry build
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={requestChanges}>
          <GitPullRequestArrow className="size-3.5" /> Request changes
        </Button>
        {diffPayload?.prUrl && (
          <Button size="sm" variant="ghost" nativeButton={false} render={<a href={diffPayload.prUrl} target="_blank" rel="noopener noreferrer" />}>
            <ExternalLink className="size-3.5" /> PR #{diffPayload.prNumber}
          </Button>
        )}
        {url && (
          <Button size="sm" variant="ghost" nativeButton={false} render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
            <ExternalLink className="size-3.5" /> Preview
          </Button>
        )}
      </div>

      {/* pending approvals — the gates, right here */}
      {myApprovals.map((a) => {
        const label =
          a.action === "approve_plan"
            ? { title: "Plan awaiting your approval", yes: "Approve plan" }
            : a.action === "run_migration"
              ? { title: "Database migration awaiting your approval — review the SQL below", yes: "Run migration" }
              : { title: "Ready to publish", yes: "Publish" };
        return (
          <div key={a.id} className="rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-4">
            <p className="text-sm font-medium text-foreground">{label.title}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => resolve(a.id, "approved")} disabled={pending.has(a.id)}>
                {pending.has(a.id) ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                {label.yes}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => resolve(a.id, "rejected")} disabled={pending.has(a.id)}>
                <X className="size-3.5" /> Reject
              </Button>
            </div>
          </div>
        );
      })}

      {/* staged migration — the SQL, reviewable before the gate above is approved */}
      {(() => {
        const mig = mine
          .filter((a) => a.kind === "doc" && (a.payload as { type?: string } | null)?.type === "migration")
          .at(-1);
        const p = (mig?.payload ?? null) as { title?: string; sql?: string } | null;
        if (!p?.sql) return null;
        return (
          <details open className="rounded-xl border bg-card p-4 elev-1">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Migration — {p.title ?? "untitled"}
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              {p.sql}
            </pre>
          </details>
        );
      })()}

      {/* the plan + the acceptance CHECKLIST */}
      {plan && (
        <div className="rounded-xl border bg-card p-4 elev-1">
          <p className="text-sm font-medium text-foreground">Plan</p>
          {plan.objective && <p className="mt-1 text-sm text-muted-foreground">{plan.objective}</p>}
          {plan.steps.length > 0 && (
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-foreground">
              {plan.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          )}
          {plan.acceptance.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Acceptance {verdict ? (verdict.pass ? "— passed" : "— needs work") : "— not yet verified"}
              </p>
              <ul className="mt-1.5 space-y-1">
                {plan.acceptance.map((c) => {
                  const unmet = verdict?.unmet.some((u) => u.toLowerCase().includes(c.slice(0, 24).toLowerCase()));
                  const state = !verdict ? "pending" : unmet ? "fail" : "pass";
                  return (
                    <li key={c} className="flex items-start gap-2 text-sm">
                      {state === "pass" ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
                      ) : state === "fail" ? (
                        <X className="mt-0.5 size-3.5 shrink-0 text-red-500" />
                      ) : (
                        <span className="mt-1 size-2.5 shrink-0 rounded-full border border-muted-foreground/40" />
                      )}
                      <span className={cn(state === "fail" && "text-foreground", state !== "fail" && "text-muted-foreground")}>
                        {c}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {verdict?.notes && <p className="mt-2 text-xs text-muted-foreground">{verdict.notes}</p>}
            </div>
          )}
        </div>
      )}

      {/* the live preview */}
      {url && (
        <div className="overflow-hidden rounded-xl border bg-card elev-1">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <p className="text-sm font-medium text-foreground">Preview</p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-primary hover:underline">
              {url}
            </a>
          </div>
          <iframe src={url} title="Preview" className="h-96 w-full bg-background" />
        </div>
      )}

      {/* the events timeline — the journal, human-readable */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="text-sm font-medium text-foreground">Timeline</p>
        {myEvents.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted-foreground">No events yet.</p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {myEvents.map((e) => (
              <div key={e.id} className="flex items-baseline gap-2 text-sm">
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {e.kind.replace(/_/g, " ")}
                </span>
                <span className="min-w-0 flex-1 text-foreground">{e.message}</span>
                {e.createdAt && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* diff + transcript (collapsed) */}
      {diffPayload?.diff && (
        <details className="rounded-xl border bg-card p-4 elev-1">
          <summary className="cursor-pointer text-sm font-medium text-foreground">
            Diff{diffPayload.prNumber ? ` — PR #${diffPayload.prNumber}` : ""}
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            {diffPayload.diff.slice(0, 20_000)}
          </pre>
        </details>
      )}
      {transcript && (
        <details className="rounded-xl border bg-card p-4 elev-1">
          <summary className="cursor-pointer text-sm font-medium text-foreground">Build transcript</summary>
          <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            {transcript.slice(-20_000)}
          </pre>
        </details>
      )}
    </div>
  );
}
