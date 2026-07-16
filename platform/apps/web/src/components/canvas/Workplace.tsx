"use client";

import * as React from "react";
import { CheckCircle2, CircleDashed, FileText, Loader2 } from "lucide-react";
import { SarahIcon } from "@/components/icons/sarah";
import { agentById, type DeptId } from "@/lib/canvas/graph";
import { useDockData, taskStatusLabel, previewUrl, type DockArtifact } from "@/lib/dock/live";

/**
 * The agent's WORKPLACE — where you watch what the agent is working on right now. REAL data
 * (COCKPIT Part A/D): polls the same live dock proxy as the dock (`/api/dock/tasks` +
 * `/api/dock/artifacts`) and filters to THIS department — the current in-progress task, the
 * queue, and the artifacts on its desk. No fixtures: an idle agent reads honest-empty, not
 * fake-busy. Served chrome-less at /embed/{dept}-work and rendered live on the canvas.
 */

const byNewest = (a: DockArtifact, b: DockArtifact) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

function ArtifactLine({ artifact }: { artifact: DockArtifact }) {
  const url = artifact.kind === "site_preview" ? previewUrl(artifact.payload) : null;
  return (
    <li className="flex items-start gap-2.5 text-sm">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="min-w-0 flex-1 truncate">{artifact.title}</span>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary hover:underline">
          open
        </a>
      )}
    </li>
  );
}

export function Workplace({ dept }: { dept: DeptId }) {
  const agent = agentById(dept);
  const { tasks, artifacts, loaded } = useDockData(true);

  const deptTasks = React.useMemo(() => tasks.filter((t) => t.departmentKey === dept), [tasks, dept]);
  const taskIds = React.useMemo(() => new Set(deptTasks.map((t) => t.id)), [deptTasks]);
  const deptArtifacts = React.useMemo(
    () => artifacts.filter((a) => a.taskId && taskIds.has(a.taskId)).sort(byNewest),
    [artifacts, taskIds],
  );
  if (!agent) return null;

  const current = deptTasks.find((t) => t.status === "in_progress");
  const upNext = deptTasks.filter((t) => t.status !== "in_progress" && t.status !== "done" && t.status !== "failed");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `rgba(${agent.accent},0.14)`, color: `rgb(${agent.accent})` }}>
          <SarahIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{agent.agentName}</h1>
          <p className="text-sm text-muted-foreground">{agent.label} · workplace</p>
        </div>
        {current && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full" style={{ backgroundColor: `rgb(${agent.accent})` }} /> working
          </span>
        )}
      </header>

      {/* current task */}
      {current ? (
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium"><Loader2 className="size-4 animate-spin text-muted-foreground" /> {current.title}</p>
            <span className="text-xs text-muted-foreground">{taskStatusLabel(current.status)}</span>
          </div>
          {current.body && <p className="mt-1.5 text-sm text-muted-foreground">{current.body}</p>}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed bg-card/40 p-4 text-sm text-muted-foreground">
          {loaded
            ? `Nothing on the desk right now — ${agent.agentName} picks up work as it comes in.`
            : "Loading…"}
        </section>
      )}

      {/* up next */}
      {upNext.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium">Up next</p>
          <div className="mt-2 space-y-2">
            {upNext.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 text-sm">
                <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                {t.status === "needs_approval" && (
                  <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">Needs your ok</span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(t.status)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* artifacts on the desk */}
      <section className="rounded-2xl border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-medium"><FileText className="size-4 text-muted-foreground" /> On the desk</p>
        {deptArtifacts.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Quiet so far — files and drafts show up here the moment {agent.agentName} starts working.</p>
        ) : (
          <ol className="mt-2 space-y-2.5">
            {deptArtifacts.map((a) => (
              <ArtifactLine key={a.id} artifact={a} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
