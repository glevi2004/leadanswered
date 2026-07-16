"use client";

import * as React from "react";
import { ChevronUp, ChevronDown, AppWindow, Image as ImageIcon, FileText, Code2, Terminal } from "lucide-react";
import type { DockArtifact } from "@/lib/dock/live";

/**
 * The focused-site LEFT control (DESIGN-DEPTH-2 ref-82/84). Two states, one component:
 *  - REST: a compact glossy dot-pager — one dot per artifact, the active one blue, ∧/∨ to step.
 *  - HOVER: expands into the labeled "Artifacts" popover, active row highlighted.
 * Now LIVE (ENGINEER-ACTIVATION §C2): it polls /api/dock/artifacts (~3s while mounted, i.e.
 * while a frame is selected) and lists the real artifacts the Engineer produced — the preview,
 * generated images, the PR diff, and the agent session — newest first. A site_preview row links
 * out to its live URL.
 */

const ICON_FOR_KIND: Record<string, React.ComponentType<{ className?: string }>> = {
  site_preview: AppWindow,
  image: ImageIcon,
  pr_diff: Code2,
  agent_session: Terminal,
};
const iconFor = (kind: string) => ICON_FOR_KIND[kind] ?? FileText;
const byNewest = (a: DockArtifact, b: DockArtifact) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

/** The live URL a site_preview row links to (null while still building or for other kinds). */
function urlFor(a: DockArtifact): string | null {
  const p = a.payload ?? {};
  const url = a.kind === "site_preview" ? p.url : a.kind === "pr_diff" ? p.prUrl : null;
  return typeof url === "string" && url.trim() !== "" ? url : null;
}

export function ArtifactsNav() {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [artifacts, setArtifacts] = React.useState<DockArtifact[]>([]);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/dock/artifacts", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { artifacts?: DockArtifact[] };
        if (alive) setArtifacts((data.artifacts ?? []).slice().sort(byNewest));
      } catch {
        /* keep last snapshot */
      }
    };
    load();
    const iv = window.setInterval(load, 3000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, []);

  // keep the active index in range as the list grows/shrinks
  React.useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, artifacts.length - 1)));
  }, [artifacts.length]);

  const empty = artifacts.length === 0;
  const count = empty ? 1 : artifacts.length;

  return (
    <div data-artifacts-nav className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      {/* REST — compact dot-pager */}
      <div className={`gloss flex flex-col items-center gap-1 rounded-full p-0.5 transition-opacity duration-150 ${open ? "opacity-0" : "opacity-100"}`}>
        <button type="button" onClick={() => setActive((i) => Math.max(0, i - 1))} className="gloss grid size-5 place-items-center rounded-full text-muted-foreground">
          <ChevronUp className="size-3" />
        </button>
        <div className="flex flex-col items-center gap-1 py-0.5">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className="rounded-full" style={i === active ? { width: 5, height: 5, background: "#5b9bff" } : { width: 3, height: 3, background: "var(--muted-foreground)", opacity: 0.4 }} />
          ))}
        </div>
        <button type="button" onClick={() => setActive((i) => Math.min(count - 1, i + 1))} className="gloss grid size-5 place-items-center rounded-full text-muted-foreground">
          <ChevronDown className="size-3" />
        </button>
      </div>

      {/* HOVER — labeled Artifacts popover */}
      <div
        className={`elev-4 absolute left-0 top-1/2 w-56 -translate-y-1/2 rounded-2xl bg-popover p-1.5 transition duration-150 ${open ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}
        style={{ transformOrigin: "left center" }}
      >
        <div className="px-2 pb-1 pt-1.5 text-sm font-semibold text-foreground">Artifacts</div>
        {empty ? (
          <div className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground">
            <AppWindow className="size-4 shrink-0" />
            <span className="truncate">No artifacts yet</span>
          </div>
        ) : (
          artifacts.map((a, i) => {
            const Icon = iconFor(a.kind);
            const href = urlFor(a);
            const inner = (
              <>
                <span className="size-1.5 shrink-0 rounded-full" style={{ background: i === active ? "#5b9bff" : "var(--muted-foreground)", opacity: i === active ? 1 : 0.4 }} />
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{a.title}</span>
              </>
            );
            const cls = `flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors ${i === active ? "bg-foreground/[0.06] text-foreground" : "text-muted-foreground hover:bg-foreground/[0.04]"}`;
            return href ? (
              <a key={a.id} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setActive(i)} className={cls}>
                {inner}
              </a>
            ) : (
              <button key={a.id} type="button" onClick={() => setActive(i)} className={cls}>
                {inner}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
