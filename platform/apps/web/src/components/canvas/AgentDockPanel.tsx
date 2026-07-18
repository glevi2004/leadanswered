"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUp, Boxes, ChevronRight, Code2, Headphones,
  Megaphone, PenTool, Plus, Scale, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import { PAGES, agentById, type DeptId, type PageNode } from "@/lib/canvas/graph";
import { PixelIcon, type PixelGlyph } from "@/components/ds/PixelIcon";
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

/** Artifact kind → pixel glyph + hue (design board: the PixelIcon file tiles). */
const ARTIFACT_GLYPH: Record<string, { glyph: PixelGlyph; color: "blue" | "green" | "amber" | "violet" }> = {
  site_preview: { glyph: "app", color: "blue" },
  pr_diff: { glyph: "file", color: "green" },
  agent_session: { glyph: "sparkle", color: "violet" },
  image: { glyph: "chart", color: "amber" },
};
const artifactGlyph = (kind: string): { glyph: PixelGlyph; color: "blue" | "green" | "amber" | "violet" } =>
  ARTIFACT_GLYPH[kind] ?? { glyph: "file", color: "blue" };

/**
 * The soft-embossed tile an artifact sits on (design board: `neu-card hover-lift press`),
 * fronted by a pixel-art glyph for its kind — then any kind-specific body underneath.
 */
function ArtifactShell({
  artifact,
  trailing,
  children,
}: {
  artifact: DockArtifact;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const g = artifactGlyph(artifact.kind);
  return (
    <div className="neu-card hover-lift press flex flex-col gap-1.5 rounded-xl bg-card p-3">
      <div className="flex items-center gap-2.5">
        <PixelIcon glyph={g.glyph} color={g.color} size={26} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{artifact.title}</span>
        {trailing}
      </div>
      {children}
    </div>
  );
}

/** One live artifact the agent produced — a preview link, a PR diff, a session transcript, an image. */
function ArtifactRow({ artifact }: { artifact: DockArtifact }) {
  const p = nullPayload(artifact);

  if (artifact.kind === "site_preview") {
    const url = previewUrl(artifact.payload);
    return (
      <ArtifactShell artifact={artifact}>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-xs text-primary underline-offset-2 hover:underline"
          >
            {url}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">Building the preview…</p>
        )}
      </ArtifactShell>
    );
  }

  if (artifact.kind === "pr_diff") {
    const diff = str(p.diff);
    const prUrl = str(p.prUrl);
    return (
      <ArtifactShell
        artifact={artifact}
        trailing={
          prUrl ? (
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary hover:underline">
              open
            </a>
          ) : null
        }
      >
        {diff && (
          <pre className="max-h-32 overflow-auto rounded-md border bg-muted p-2 text-[11px] leading-snug text-muted-foreground">
            {truncate(diff, 1200)}
          </pre>
        )}
      </ArtifactShell>
    );
  }

  if (artifact.kind === "agent_session") {
    const transcript = (str(p.stdout) || str(p.stderr)).trim();
    return (
      <ArtifactShell artifact={artifact}>
        {transcript && (
          <pre className="max-h-32 overflow-auto rounded-md border bg-muted p-2 text-[11px] leading-snug text-muted-foreground">
            {truncate(transcript, 1200)}
          </pre>
        )}
      </ArtifactShell>
    );
  }

  if (artifact.kind === "image") {
    const dataUrl = str(p.dataUrl);
    return (
      <ArtifactShell artifact={artifact}>
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={artifact.title} className="max-h-40 w-full rounded-md border object-cover" />
        ) : (
          <p className="line-clamp-2 text-xs text-muted-foreground">{truncate(str(p.prompt), 140)}</p>
        )}
      </ArtifactShell>
    );
  }

  return <ArtifactShell artifact={artifact} />;
}

export function AgentDockPanel({ dept }: { dept: string }) {
  const agent = agentById(dept);
  const { widgetOpen, sendMessage } = useSarah();
  const { tasks, artifacts, loaded } = useDockData(widgetOpen);
  const [ask, setAsk] = React.useState("");
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

  // Composer → the real owner thread (sarah-context → /api/lu/chat). Lu decomposes
  // the goal into tasks the dock is already watching; here we just hand off the text.
  const submitAsk = (e: React.FormEvent) => {
    e.preventDefault();
    const text = ask.trim();
    if (!text) return;
    sendMessage(text);
    setAsk("");
  };

  return (
    <div className="neu-card-in flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-2xl bg-card px-4 py-4 text-sm">
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
          disabled
          title="Coming soon"
          className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-muted-foreground/70"
        >
          <Plus className="size-3.5" /> New Agent
          <span className="rounded bg-muted px-1 py-px font-mono text-[9px] uppercase tracking-wide">Soon</span>
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

      {/* Context — the department's real context string, shown as-is (no fake JSON dressing;
          docs/product.md §7: never render mock as real). */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="font-medium text-foreground">Context</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Department knowledge shared with every agent here.</p>
        {agent.context?.trim() ? (
          <p className="mt-3 whitespace-pre-wrap rounded-lg border bg-muted p-3 text-xs text-muted-foreground">
            {agent.context}
          </p>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No context yet — Lu seeds this from onboarding and your corrections.
          </p>
        )}
      </div>

      {/* Composer — ask Lu to build something (hands off to the real owner thread) */}
      <form onSubmit={submitAsk} className="neu-socket mt-1 flex items-center gap-2 rounded-xl bg-background px-3 py-2.5">
        <input
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          placeholder="Ask Lu to build something…"
          aria-label="Ask Lu to build something"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send to Lu"
          className="gloss-ink grid size-7 shrink-0 place-items-center rounded-lg text-white"
        >
          <ArrowUp className="size-3.5" />
        </button>
      </form>
    </div>
  );
}
