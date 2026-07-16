"use client";

import * as React from "react";
import Link from "next/link";
import {
  Boxes, ChevronRight, Code2, ExternalLink, FileDiff, Headphones, Image as ImageIcon,
  Megaphone, PenTool, Plus, Scale, Sparkles, Terminal, TrendingUp, Wallet,
} from "lucide-react";
import { PAGES, agentById, type DeptId, type PageNode } from "@/lib/canvas/graph";
import { useSarah } from "@/components/sarah/sarah-context";
import { useDockData, previewUrl, taskStatusLabel, type DockArtifact, type DockTask } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The selected-department panel inside Lu's dock (canvas → dock). Its Space + Context
 * are static department chrome; the Agents · Tasks · Scratchpad sections now render LIVE
 * data (ENGINEER-ACTIVATION §C2 "Watch"): the dock polls /api/dock/tasks + /api/dock/artifacts
 * every ~3s while it's open, and this panel filters them to THIS department — real task
 * status, the agent_session transcript, the pr_diff summary, and the site_preview link.
 */

const DEPT_ICON: Record<DeptId, React.ComponentType<{ className?: string }>> = {
  support: Headphones, operations: Boxes, finance: Wallet, legal: Scale,
  engineering: Code2, design: PenTool, marketing: Megaphone, sales: TrendingUp,
};

const nullPayload = (a: DockArtifact): Record<string, unknown> => a.payload ?? {};
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const truncate = (v: string, n: number): string => (v.length > n ? v.slice(0, n).trimEnd() + "…" : v);
const byNewest = (a: DockArtifact, b: DockArtifact) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

/** Status indicator: a spinner while working, a colored dot otherwise. */
function StatusDot({ status }: { status: string }) {
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

/** One live artifact the agent produced — a preview link, a PR diff, a session transcript, an image. */
function ArtifactRow({ artifact }: { artifact: DockArtifact }) {
  const p = nullPayload(artifact);

  if (artifact.kind === "site_preview") {
    const url = previewUrl(artifact.payload);
    return (
      <div className="rounded-lg border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{artifact.title}</span>
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
  }

  if (artifact.kind === "pr_diff") {
    const diff = str(p.diff);
    const prUrl = str(p.prUrl);
    return (
      <div className="rounded-lg border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <FileDiff className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{artifact.title}</span>
          {prUrl && (
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary hover:underline">
              open
            </a>
          )}
        </div>
        {diff && (
          <pre className="mt-1.5 max-h-32 overflow-auto rounded-md border bg-muted p-2 text-[11px] leading-snug text-muted-foreground">
            {truncate(diff, 1200)}
          </pre>
        )}
      </div>
    );
  }

  if (artifact.kind === "agent_session") {
    const transcript = (str(p.stdout) || str(p.stderr)).trim();
    return (
      <div className="rounded-lg border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{artifact.title}</span>
        </div>
        {transcript && (
          <pre className="mt-1.5 max-h-32 overflow-auto rounded-md border bg-muted p-2 text-[11px] leading-snug text-muted-foreground">
            {truncate(transcript, 1200)}
          </pre>
        )}
      </div>
    );
  }

  if (artifact.kind === "image") {
    const dataUrl = str(p.dataUrl);
    return (
      <div className="rounded-lg border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <ImageIcon className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{artifact.title}</span>
        </div>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={artifact.title} className="mt-1.5 max-h-40 w-full rounded-md border object-cover" />
        ) : (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{truncate(str(p.prompt), 140)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background p-2.5">
      <p className="truncate font-medium text-foreground">{artifact.title}</p>
    </div>
  );
}

export function AgentDockPanel({ dept }: { dept: string }) {
  const agent = agentById(dept);
  const { widgetOpen } = useSarah();
  const { tasks, artifacts, loaded } = useDockData(widgetOpen);
  if (!agent) return null;

  const Icon = DEPT_ICON[agent.id];
  const pages: PageNode[] = PAGES.filter((p) => p.dept === agent.id);
  const accentBg = { backgroundColor: `rgba(${agent.accent},0.14)`, color: `rgb(${agent.accent})` };

  // Live, this-department slice of the polled data.
  const deptTasks: DockTask[] = tasks.filter((t) => t.departmentKey === agent.id);
  const taskIds = new Set(deptTasks.map((t) => t.id));
  const deptArtifacts = artifacts.filter((a) => a.taskId && taskIds.has(a.taskId)).sort(byNewest);
  const working = deptTasks.find((t) => t.status === "in_progress");
  const openTasks = deptTasks.filter((t) => t.status !== "done");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="grid size-6 place-items-center rounded-md" style={accentBg}>
          <Icon className="size-4" />
        </span>
        <h2 className="text-base font-semibold text-foreground">{agent.label}</h2>
      </div>
      <p className="leading-relaxed text-muted-foreground">{agent.blurb}</p>

      {/* Space — the agent's two pages; each opens the real route */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="font-medium text-foreground">Space</p>
        <p className="mt-0.5 text-xs text-muted-foreground">The pages this agent keeps.</p>
        <div className="mt-3 space-y-2">
          {pages.map((pg) => (
            <Link
              key={pg.id}
              href={pg.href}
              className="flex w-full items-center gap-2.5 rounded-lg border bg-background px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="size-1.5 rounded-full" style={{ backgroundColor: `rgb(${agent.accent})` }} />
              <span className="min-w-0 flex-1 truncate text-foreground">{pg.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{pg.pageKind}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Agents */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="font-medium text-foreground">Agents</p>
        <p className="mt-0.5 text-xs text-muted-foreground">The default and custom agents in this department.</p>
        <div className="mt-3 flex items-center gap-3 rounded-lg border bg-background p-3">
          <span className="grid size-8 place-items-center rounded-md" style={accentBg}>
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{agent.agentName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {working ? `Working: ${working.title}` : `${agent.label} department agent.`}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3.5" /> New Agent
        </button>
      </div>

      {/* Tasks — live from the Store */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Tasks</p>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Current and recent work owned by this department.</p>
        {openTasks.length > 0 ? (
          <div className="mt-3 space-y-2 text-foreground">
            {openTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <StatusDot status={t.status} />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(t.status)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            {loaded ? "No open tasks. Ask Lu to get this department working." : "Loading…"}
          </p>
        )}
      </div>

      {/* Scratchpad — live artifacts (transcript · diff · preview · images) */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Scratchpad</p>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Files, notes, and drafts produced while agents work.</p>
        {deptArtifacts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {deptArtifacts.map((a) => (
              <ArtifactRow key={a.id} artifact={a} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">Nothing on the desk yet.</p>
        )}
      </div>

      {/* Context */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="font-medium text-foreground">Context</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Department knowledge shared with every agent here.</p>
        <pre className="mt-3 overflow-x-auto rounded-lg border bg-muted p-3 text-xs text-muted-foreground">{`{\n  "summary": "${agent.context}"\n}`}</pre>
      </div>
    </div>
  );
}
