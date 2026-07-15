"use client";

import * as React from "react";
import Link from "next/link";
import {
  Boxes, ChevronRight, Code2, Headphones, Megaphone, PenTool,
  Plus, Scale, Sparkles, TrendingUp, Wallet,
} from "lucide-react";
import { PAGES, agentById, type DeptId, type PageNode } from "@/lib/canvas/graph";
import { AGENT_WORK } from "@/lib/canvas/agent-work";

/**
 * The selected-department panel inside Lu's dock (canvas → dock, 2026-07-15).
 * Extracted from the old CompanyCanvas `DeptPanel`, retokened to the app's
 * editorial palette so it reads in both themes. Its "Space" pages link to the
 * real routes (the dock is global, not pinned to the canvas viewport).
 */

const DEPT_ICON: Record<DeptId, React.ComponentType<{ className?: string }>> = {
  support: Headphones, operations: Boxes, finance: Wallet, legal: Scale,
  engineering: Code2, design: PenTool, marketing: Megaphone, sales: TrendingUp,
};

export function AgentDockPanel({ dept }: { dept: string }) {
  const agent = agentById(dept);
  if (!agent) return null;
  const Icon = DEPT_ICON[agent.id];
  const work = AGENT_WORK[agent.id];
  const pages: PageNode[] = PAGES.filter((p) => p.dept === agent.id);
  const accentBg = { backgroundColor: `rgba(${agent.accent},0.14)`, color: `rgb(${agent.accent})` };

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
            <p className="text-xs text-muted-foreground">
              {work.current ? `Working: ${work.current.title}` : `${agent.label} department agent.`}
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

      {/* Tasks */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Tasks</p>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Current and recent work owned by this department.</p>
        {(work.current || work.pending.length > 0) && (
          <div className="mt-3 space-y-2 text-foreground">
            {work.current && (
              <div className="flex items-center gap-2">
                <span
                  className="size-2 animate-spin rounded-full border-[1.5px] border-muted-foreground border-t-transparent"
                  style={{ animationDuration: "1.6s" }}
                />
                <span className="min-w-0 flex-1 truncate">{work.current.title}</span>
                <span className="text-xs text-muted-foreground">{work.current.startedAgo}</span>
              </div>
            )}
            {work.pending.map((p) => (
              <div key={p.title} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <span className="text-xs text-muted-foreground">{p.ago}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scratchpad */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-foreground">Scratchpad</p>
          <ChevronRight className="size-4 text-muted-foreground" />
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Files, notes, and drafts produced while agents work.</p>
        {work.draft && (
          <div className="mt-3 rounded-lg border bg-background p-2.5">
            <p className="font-medium text-foreground">{work.draft.title}</p>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{work.draft.preview}</p>
          </div>
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
