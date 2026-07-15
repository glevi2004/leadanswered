"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, AppWindow, Image as ImageIcon, FileText, Code2 } from "lucide-react";

/**
 * The focused-site LEFT control (DESIGN-DEPTH-2 ref-82/84). Two states, one component:
 *  - REST: a compact glossy dot-pager — one dot per artifact, the active one blue, ∧/∨ to step.
 *  - HOVER: expands into the labeled "Artifacts" popover (Browser · generated images · Publish to
 *    Preview · PR Diff · Agent Interaction), active row highlighted. Visual/mock for now.
 */
const ARTIFACTS: { icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { icon: AppWindow, label: "Browser" },
  { icon: ImageIcon, label: "lucomputer-landing-mvp" },
  { icon: ImageIcon, label: "lucomputer-landing-mobile" },
  { icon: FileText, label: "Publish to Preview" },
  { icon: Code2, label: "PR Diff" },
  { icon: AppWindow, label: "Agent Interaction" },
];

export function ArtifactsNav() {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(1);
  return (
    <div data-artifacts-nav className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* REST — compact dot-pager */}
      <div className={`gloss flex flex-col items-center gap-1 rounded-full p-0.5 transition-opacity duration-150 ${open ? "opacity-0" : "opacity-100"}`}>
        <button type="button" onClick={() => setActive((i) => Math.max(0, i - 1))} className="gloss grid size-5 place-items-center rounded-full text-muted-foreground">
          <ChevronUp className="size-3" />
        </button>
        <div className="flex flex-col items-center gap-1 py-0.5">
          {ARTIFACTS.map((_, i) => (
            <span key={i} className="rounded-full" style={i === active ? { width: 5, height: 5, background: "#5b9bff" } : { width: 3, height: 3, background: "var(--muted-foreground)", opacity: 0.4 }} />
          ))}
        </div>
        <button type="button" onClick={() => setActive((i) => Math.min(ARTIFACTS.length - 1, i + 1))} className="gloss grid size-5 place-items-center rounded-full text-muted-foreground">
          <ChevronDown className="size-3" />
        </button>
      </div>

      {/* HOVER — labeled Artifacts popover */}
      <div
        className={`elev-4 absolute left-0 top-1/2 w-56 -translate-y-1/2 rounded-2xl bg-popover p-1.5 transition duration-150 ${open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
        style={{ transformOrigin: "left center" }}
      >
        <div className="px-2 pb-1 pt-1.5 text-sm font-semibold text-foreground">Artifacts</div>
        {ARTIFACTS.map((a, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${i === active ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.04]"}`}
          >
            <span className="size-1.5 shrink-0 rounded-full" style={{ background: i === active ? "#5b9bff" : "var(--muted-foreground)", opacity: i === active ? 1 : 0.4 }} />
            <a.icon className="size-4 shrink-0" />
            <span className="truncate">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
