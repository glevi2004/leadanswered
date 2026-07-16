"use client";

import * as React from "react";
import { AppWindow, ExternalLink, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import { useSites, siteHost, siteUrl, type DockSite } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The Department card's **Home** view (canvas.md "Home = what it has shipped"). Lists the
 * department's **applications (sites)** — real `Site` rows from /api/dock/sites, filtered to
 * this department (v0 provisions Engineering alone, so sites with no departmentKey are its
 * work). Each row: name · a page/app label · "Last updated" · a Staging/Live status · open.
 * Honest-empty when the department hasn't shipped anything yet — no fixtures.
 */

/** Site status → the human label + chip tone shown in the status column. */
function statusChip(status: string): { label: string; tone: string } {
  switch (status) {
    case "live":
      return { label: "Live", tone: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
    case "preview":
      return { label: "Staging", tone: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400" };
    default:
      return { label: "Building", tone: "border-muted-foreground/20 bg-muted text-muted-foreground" };
  }
}

/** Compact relative "last updated" (e.g. "3h", "2d"), falling back to a date. */
function lastUpdated(site: DockSite): string {
  const iso = site.updatedAt ?? site.createdAt;
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** App display name — the repo's short name, else the pretty host. */
function siteName(site: DockSite): string {
  const repo = site.repoFullName?.split("/").pop();
  if (repo && repo.trim() !== "") return repo;
  return siteHost(site);
}

function SiteRow({ site }: { site: DockSite }) {
  const url = siteUrl(site);
  const { label, tone } = statusChip(site.status);
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_5rem_5.5rem_auto]">
      {/* name + host */}
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <AppWindow className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{siteName(site)}</p>
          <p className="truncate font-mono text-xs text-muted-foreground">{siteHost(site)}</p>
        </div>
      </div>
      {/* app/page label */}
      <span className="hidden text-xs text-muted-foreground sm:block">Website</span>
      {/* last updated */}
      <span className="hidden font-mono text-xs text-muted-foreground tabular-nums sm:block">
        {lastUpdated(site)}
      </span>
      {/* status + open */}
      <div className="flex items-center justify-end gap-2">
        <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium", tone)}>{label}</span>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
            title={`Open ${siteHost(site)}`}
          >
            <ExternalLink className="size-4" />
          </a>
        ) : (
          <span className="grid size-7 shrink-0 place-items-center text-muted-foreground/40">
            <ExternalLink className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

export function DepartmentHome({ dept }: { dept: string }) {
  const { sites, loaded } = useSites(true);
  const deptSites = React.useMemo(
    () => sites.filter((s) => s.departmentKey === dept || s.departmentKey == null),
    [sites, dept],
  );

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (deptSites.length === 0) {
    return (
      <div className="px-4 py-8">
        <EmptyState
          icon={AppWindow}
          title="No applications yet"
          body="Sites this department builds and ships show up here — with their staging/live status — the moment the Engineer publishes."
        />
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* column header (mono micro-labels, sm+ only) */}
      <div className="hidden grid-cols-[minmax(0,1fr)_5rem_5.5rem_auto] gap-3 border-b py-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Application</span>
        <span>Type</span>
        <span>Last updated</span>
        <span className="text-right">Status</span>
      </div>
      <div className="divide-y divide-border/60">
        {deptSites.map((s) => (
          <SiteRow key={s.id} site={s} />
        ))}
      </div>
    </div>
  );
}
