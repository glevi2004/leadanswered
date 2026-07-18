"use client";

import * as React from "react";
import { GitPullRequestArrow, Loader2, Rocket, RotateCcw } from "lucide-react";
import { BrowserChrome } from "@/components/canvas/BrowserChrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSarah } from "@/components/sarah/sarah-context";
import {
  useDockData,
  useSites,
  usePublishApprovals,
  taskStatusLabel,
  siteHost,
  siteUrl,
  type DockSite,
  type DockTask,
} from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The Workplace card's body (canvas.md "Workplace = what it's building now"). The live
 * preview of the site(s) the department is building — a real iframe of the deploy/dev URL —
 * with a **task selector** at the top (engineering tasks from /api/dock/tasks) and the
 * **Publish to Staging · Revert All · Request changes** controls at the bottom. Publish is
 * wired to the real gate (/api/dock/approvals/resolve via usePublishApprovals); Revert /
 * Request changes are honest stubs until their backend lands. Honest-empty when idle.
 */

/** Small status indicator: spinner while working, coloured dot otherwise (mirrors the dock). */
function StatusDot({ status }: { status: string }) {
  if (status === "in_progress") {
    return (
      <span
        className="size-2 shrink-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent"
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

/** The best site to preview: prefer one with a live URL, newest first; else the newest site. */
function pickPrimary(sites: DockSite[]): DockSite | null {
  if (sites.length === 0) return null;
  const byNewest = [...sites].sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  return byNewest.find((s) => siteUrl(s) != null) ?? byNewest[0];
}

export function DepartmentWorkplace({ dept }: { dept: string }) {
  const { tasks } = useDockData(true);
  const { sites, loaded: sitesLoaded } = useSites(true);
  const { approvals, resolve, pending } = usePublishApprovals(true);

  // Engineering slice (v0: unassigned sites are Engineering's — matches EngineerWorkplace).
  const deptTasks = React.useMemo<DockTask[]>(
    () => tasks.filter((t) => t.departmentKey === dept && t.status !== "done" && t.status !== "failed"),
    [tasks, dept],
  );
  const deptSites = React.useMemo(
    () => sites.filter((s) => s.departmentKey === dept || s.departmentKey == null),
    [sites, dept],
  );

  // Selected task — default to the in-progress one (else the first open task).
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  React.useEffect(() => {
    setSelectedTaskId((prev) => {
      if (prev && deptTasks.some((t) => t.id === prev)) return prev;
      return (deptTasks.find((t) => t.status === "in_progress") ?? deptTasks[0])?.id ?? null;
    });
  }, [deptTasks]);
  const selectedTask = deptTasks.find((t) => t.id === selectedTaskId) ?? null;

  // Selected site to preview + a navigable path (the page/route selector).
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null);
  const primary = pickPrimary(deptSites);
  const selectedSite = deptSites.find((s) => s.id === selectedSiteId) ?? primary;
  const [path, setPath] = React.useState("/");
  const previewUrl = selectedSite ? siteUrl(selectedSite) : null;
  const src = previewUrl ? previewUrl.replace(/\/$/, "") + (path.startsWith("/") ? path : `/${path}`) : null;

  // Publish → resolve the pending publish gate the Engineer opened (the real two-stage flow).
  const publishApproval = approvals[0] ?? null;
  const publishing = publishApproval ? pending.has(publishApproval.id) : false;

  const onPublish = () => {
    if (!publishApproval) {
      toast.info("Nothing to publish yet — the Engineer opens a publish gate when a build is ready to ship.");
      return;
    }
    void resolve(publishApproval.id, "approved");
    toast.success("Publishing to staging…");
  };
  // §8b (ladder 0b): Request changes is REAL — prefill the Lu composer with this build's
  // context and jump to the chat; changing things IS asking Lu. Retry re-dispatches a failed
  // build. Revert-all stays Soon until a rollback endpoint exists.
  const { prefillComposer, openWidget, setDockTab } = useSarah();
  const [retrying, setRetrying] = React.useState(false);
  const onRequestChanges = () => {
    prefillComposer(`Request changes on "${selectedTask?.title ?? "the current build"}": `);
    openWidget();
    setDockTab("lu");
  };
  const onRetry = async () => {
    if (!selectedTask) return;
    setRetrying(true);
    try {
      await fetch("/api/dock/tasks/retry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId: selectedTask.id, message: selectedTask.body?.trim() || selectedTask.title }),
      });
      toast.success("Retrying the build…");
    } catch {
      toast.error("Couldn't retry — try again.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ── task selector ── */}
      <div className="flex items-center gap-2 border-b px-4 py-2.5">
        <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Task</span>
        {deptTasks.length === 0 ? (
          <span className="text-xs text-muted-foreground">No active task</span>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
            {deptTasks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTaskId(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                  t.id === selectedTaskId
                    ? "gloss border-transparent text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
                title={t.title}
              >
                <StatusDot status={t.status} />
                <span className="max-w-[14rem] truncate">{t.title}</span>
              </button>
            ))}
          </div>
        )}
        {selectedTask && (
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {taskStatusLabel(selectedTask.status)}
            </span>
            {/* §8b: every surface clicks through to the Task Detail hub. */}
            <a
              href={`/task/${selectedTask.id}`}
              className="text-[11px] font-medium text-primary underline-offset-2 hover:underline"
            >
              Details
            </a>
          </span>
        )}
      </div>

      {/* ── preview context: site selector + route/page selector ── */}
      {deptSites.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2">
          {deptSites.length > 1 && (
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              {deptSites.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedSiteId(s.id)}
                  className={cn(
                    "shrink-0 rounded-md px-2 py-1 font-mono text-[11px] transition",
                    (selectedSiteId ?? primary?.id) === s.id
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {siteHost(s)}
                </button>
              ))}
            </div>
          )}
          <Input
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/"
            aria-label="Preview path"
            className="ml-auto h-7 w-40 font-mono text-xs"
          />
        </div>
      )}

      {/* ── live preview frame ── */}
      <div className="min-h-[320px] flex-1 px-4 pb-3">
        <div className="flex h-full min-h-[300px] flex-col overflow-hidden rounded-xl border border-black/5 bg-card elev-1 dark:border-white/10">
          {selectedSite ? (
            <>
              <BrowserChrome host={siteHost(selectedSite)} page={path} />
              <div className="relative min-h-0 flex-1 bg-background">
                {src ? (
                  <iframe
                    key={selectedSite.id}
                    src={src}
                    title={siteHost(selectedSite)}
                    loading="lazy"
                    className="size-full border-0 bg-background"
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-forms"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="size-7 animate-spin" style={{ color: "rgb(96,165,250)" }} />
                    <span className="text-sm font-medium text-foreground">Building the preview…</span>
                    <span className="max-w-[80%] truncate font-mono text-xs text-muted-foreground/70">
                      {selectedSite.repoFullName ?? siteHost(selectedSite)}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
              {sitesLoaded ? (
                <>
                  <p className="text-sm font-medium text-foreground">Nothing building right now</p>
                  <p className="max-w-xs text-sm">
                    The live preview of the site the department is building appears here once the Engineer picks up a build.
                  </p>
                </>
              ) : (
                <Loader2 className="size-5 animate-spin" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── publish controls ── */}
      <div className="flex items-center gap-1.5 border-t px-4 py-2.5">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={onPublish}
          disabled={publishing}
          title={publishApproval ? "Approve the pending gate — merge and take it live" : "Nothing to publish yet"}
        >
          {publishing ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />}
          {publishing ? "Publishing…" : "Publish to Staging"}
        </Button>
        {selectedTask?.status === "failed" && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onRetry} disabled={retrying}>
            {retrying ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
            Retry build
          </Button>
        )}
        <Button size="sm" variant="outline" className="gap-1.5" disabled title="Rollback — coming soon">
          <RotateCcw className="size-3.5" /> Revert All
          <span className="rounded bg-muted px-1 py-px font-mono text-[9px] uppercase tracking-wide">Soon</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onRequestChanges}
        >
          <GitPullRequestArrow className="size-3.5" /> Request changes
        </Button>
      </div>
    </div>
  );
}
