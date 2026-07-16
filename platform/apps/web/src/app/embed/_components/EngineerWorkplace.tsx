"use client";

import {
  ExternalLink, FileDiff, FileText, Globe, Image as ImageIcon, Loader2, Terminal,
} from "lucide-react";
import { SarahIcon } from "@/components/icons/sarah";
import { agentById } from "@/lib/canvas/graph";
import {
  useDockData, useSites, previewUrl, taskStatusLabel, siteUrl, siteHost,
  type DockArtifact, type DockSite, type DockTask,
} from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The Engineer's WORKPLACE — its REAL work-in-progress, live. Replaces the mock
 * `Workplace`/`AGENT_WORK` miniature (cockpit.md Part D). Two things live here, and
 * they are deliberately NOT conflated:
 *   • Work-in-progress: the Engineer's live tasks + its scratchpad (artifacts) from
 *     /api/dock/tasks + /api/dock/artifacts, filtered to the engineering department.
 *   • Deliverables: the SITES the Engineer ships (deployed `Site` rows via
 *     /api/dock/sites) — a distinct, clearly-labelled section, because a shipped site
 *     is an output, not something on the desk.
 * Honest-empty when idle: no fixtures, ever.
 */

const DEPT = "engineering" as const;
const accent = agentById(DEPT)!.accent; // "r,g,b"

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const truncate = (v: string, n: number): string => (v.length > n ? v.slice(0, n).trimEnd() + "…" : v);
const byNewest = (a: DockArtifact, b: DockArtifact) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

/** Small status indicator mirroring the dock's: spinner while working, coloured dot otherwise. */
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

/** One live artifact off the Engineer's desk — preview link, PR diff, session transcript, image, note. */
function ArtifactRow({ artifact }: { artifact: DockArtifact }) {
  const p = artifact.payload ?? {};

  if (artifact.kind === "site_preview") {
    const url = previewUrl(artifact.payload);
    return (
      <div className="rounded-lg border bg-background p-2.5">
        <div className="flex items-center gap-2">
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{artifact.title}</span>
        </div>
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-xs text-primary underline-offset-2 hover:underline">
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
            <a href={prUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-primary hover:underline">open</a>
          )}
        </div>
        {diff && (
          <pre className="mt-1.5 max-h-32 overflow-auto rounded-md border bg-muted p-2 text-[11px] leading-snug text-muted-foreground">{truncate(diff, 1200)}</pre>
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
          <pre className="mt-1.5 max-h-32 overflow-auto rounded-md border bg-muted p-2 text-[11px] leading-snug text-muted-foreground">{truncate(transcript, 1200)}</pre>
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
      <div className="flex items-center gap-2">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{artifact.title}</span>
      </div>
    </div>
  );
}

/** A shipped deliverable — a deployed Site, styled distinctly from work-in-progress. */
function SiteRow({ site }: { site: DockSite }) {
  const url = siteUrl(site);
  const label =
    site.status === "live" ? "Live"
    : site.status === "preview" ? "Preview"
    : "Building";
  const tone =
    site.status === "live" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    : site.status === "preview" ? "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400"
    : "border-muted-foreground/20 bg-muted text-muted-foreground";
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-background p-2.5">
      <Globe className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        {url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-primary underline-offset-2 hover:underline">
            {siteHost(site)}
          </a>
        ) : (
          <span className="block truncate text-sm font-medium text-foreground">{siteHost(site)}</span>
        )}
        {site.repoFullName && <p className="truncate text-xs text-muted-foreground">{site.repoFullName}</p>}
      </div>
      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", tone)}>{label}</span>
    </div>
  );
}

export function EngineerWorkplace() {
  const agent = agentById(DEPT)!;
  // Live-poll while mounted — this iframe IS the "what the Engineer is on right now" view.
  const { tasks, artifacts, loaded } = useDockData(true);
  const { sites, loaded: sitesLoaded } = useSites(true);

  // Engineering slice only. Sites: this department, plus any not yet assigned a
  // department (v0 provisions Engineering alone, so unassigned sites are its work).
  const deptTasks: DockTask[] = tasks.filter((t) => t.departmentKey === DEPT);
  const taskIds = new Set(deptTasks.map((t) => t.id));
  const deptArtifacts = artifacts.filter((a) => a.taskId && taskIds.has(a.taskId)).sort(byNewest);
  const deptSites = sites.filter((s) => s.departmentKey === DEPT || s.departmentKey == null);

  const working = deptTasks.find((t) => t.status === "in_progress");
  const openTasks = deptTasks.filter((t) => t.status !== "done");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `rgba(${accent},0.14)`, color: `rgb(${accent})` }}>
          <SarahIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{agent.agentName}</h1>
          <p className="text-sm text-muted-foreground">{agent.label} · workplace</p>
        </div>
        {working && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full" style={{ backgroundColor: `rgb(${accent})` }} /> working
          </span>
        )}
      </header>

      {/* WORK IN PROGRESS — the Engineer's live tasks. Honest-empty when idle. */}
      <section className="rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">On the desk</p>
        <p className="mt-0.5 text-xs text-muted-foreground">What the Engineer is working on right now.</p>
        {working && (
          <p className="mt-3 flex items-center gap-2 text-sm font-medium">
            <Loader2 className="size-4 animate-spin text-muted-foreground" /> {working.title}
          </p>
        )}
        {openTasks.length > 0 ? (
          <div className="mt-3 space-y-2 text-sm text-foreground">
            {openTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <StatusDot status={t.status} />
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(t.status)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {loaded
              ? "Nothing on the desk right now — the Engineer picks up work the moment Lu dispatches a task."
              : "Loading the Engineer's work…"}
          </p>
        )}
      </section>

      {/* SCRATCHPAD — the artifacts produced while working (drafts, diffs, transcripts). */}
      <section className="rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Scratchpad</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Drafts, diffs, and transcripts from the work in progress.</p>
        {deptArtifacts.length > 0 ? (
          <div className="mt-3 space-y-2">
            {deptArtifacts.map((a) => (
              <ArtifactRow key={a.id} artifact={a} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Nothing on the desk yet — artifacts show up here as the Engineer works.</p>
        )}
      </section>

      {/* DELIVERABLES — deployed sites the Engineer ships. Deliberately separate from the
          work-in-progress above: these are OUTPUTS, not things on the desk. */}
      <section className="rounded-2xl border border-dashed bg-card/40 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">Sites</p>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">deliverables</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">Deployed things the Engineer has shipped — distinct from the work above.</p>
        {deptSites.length > 0 ? (
          <div className="mt-3 space-y-2">
            {deptSites.map((s) => (
              <SiteRow key={s.id} site={s} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {sitesLoaded ? "No sites shipped yet — deployed sites land here once the Engineer publishes." : "Loading sites…"}
          </p>
        )}
      </section>
    </div>
  );
}
