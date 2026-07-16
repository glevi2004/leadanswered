"use client";

import * as React from "react";

/**
 * CLIENT-side live data for the Lu dock (ENGINEER-ACTIVATION §C2 "Watch"). The dock
 * polls the same-origin Next proxy routes (/api/dock/*) — which resolve the session org
 * and forward to apps/api — so the browser never touches Railway and never handles an
 * orgId. Polling runs on a ~3s interval only while `active` (the dock is open); the
 * effect clears the interval on close/unmount.
 */

export interface DockTask {
  id: string;
  orgId: string;
  departmentKey: string;
  agentId: string | null;
  title: string;
  body: string;
  status: string; // agent_can_do | in_progress | needs_approval | done | failed | ...
  createdAt?: string;
  updatedAt?: string;
}

export interface DockArtifact {
  id: string;
  taskId: string | null;
  kind: string; // site_preview | pr_diff | agent_session | image
  title: string;
  payload: Record<string, unknown> | null;
  createdAt?: string;
}

export interface DockApproval {
  id: string;
  taskId: string | null;
  action: string; // publish_site
  status: string; // pending
  createdAt?: string;
}

const POLL_MS = 3000;

async function getJSON<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

/**
 * Poll the org's tasks + artifacts while `active`. Returns the latest snapshot (keeps the
 * last good value across a transient failure) so the dock renders live status without
 * flicker. Not gated to a department — the caller filters by `departmentKey`.
 */
export function useDockData(active: boolean): {
  tasks: DockTask[];
  artifacts: DockArtifact[];
  loaded: boolean;
} {
  const [tasks, setTasks] = React.useState<DockTask[]>([]);
  const [artifacts, setArtifacts] = React.useState<DockArtifact[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      const [t, a] = await Promise.all([
        getJSON<{ tasks: DockTask[] }>("/api/dock/tasks", { tasks: [] }),
        getJSON<{ artifacts: DockArtifact[] }>("/api/dock/artifacts", { artifacts: [] }),
      ]);
      if (!alive) return;
      setTasks(t.tasks ?? []);
      setArtifacts(a.artifacts ?? []);
      setLoaded(true);
    };
    load();
    const iv = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [active]);

  return { tasks, artifacts, loaded };
}

/**
 * Poll the org's pending approvals while `active`, and expose a resolver that POSTs the
 * Publish / Reject decision through the proxy. `resolve` optimistically drops the card and
 * kicks an immediate refresh.
 */
export function usePublishApprovals(active: boolean): {
  approvals: DockApproval[];
  resolve: (id: string, decision: "approved" | "rejected") => Promise<void>;
  pending: Set<string>;
} {
  const [approvals, setApprovals] = React.useState<DockApproval[]>([]);
  const [pending, setPending] = React.useState<Set<string>>(new Set());
  const refreshRef = React.useRef<() => void>(() => {});

  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      const a = await getJSON<{ approvals: DockApproval[] }>("/api/dock/approvals", { approvals: [] });
      if (!alive) return;
      setApprovals(a.approvals ?? []);
    };
    refreshRef.current = load;
    load();
    const iv = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [active]);

  const resolve = React.useCallback(async (id: string, decision: "approved" | "rejected") => {
    setPending((prev) => new Set(prev).add(id));
    try {
      await fetch("/api/dock/approvals/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approvalId: id, decision }),
      });
      setApprovals((prev) => prev.filter((a) => a.id !== id)); // optimistic drop
      refreshRef.current();
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  return { approvals, resolve, pending };
}

/* ------------------------------ render helpers ------------------------------ */

/** Human-readable label for a task status enum. */
export function taskStatusLabel(status: string): string {
  switch (status) {
    case "in_progress":
      return "Working";
    case "needs_approval":
      return "Needs you";
    case "agent_can_do":
      return "Queued";
    case "done":
      return "Done";
    case "failed":
      return "Failed";
    default:
      return status.replace(/_/g, " ");
  }
}

/** Pull the best preview URL off a site_preview artifact payload (null while building). */
export function previewUrl(payload: Record<string, unknown> | null): string | null {
  if (!payload) return null;
  const url = payload.url;
  return typeof url === "string" && url.trim() !== "" ? url : null;
}
