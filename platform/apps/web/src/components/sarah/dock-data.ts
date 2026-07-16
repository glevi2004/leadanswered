"use client";

import * as React from "react";
import { AGENTS } from "@/lib/canvas/graph";
import type { DockSite, DockTask } from "@/lib/dock/live";
import { siteHost, siteUrl } from "@/lib/dock/live";

/**
 * Derived, REAL state for the Lu dock's Home / Company tabs (canvas.md §"the dock"). Nothing
 * here is a fixture — every value is computed from the same live proxies the rest of the dock
 * polls (`/api/dock/tasks`, `/api/dock/sites`, `/api/connect/status`). The browser never sees
 * an orgId; the proxies resolve the session org server-side.
 */

/* -------------------------------- connect status -------------------------------- */

export interface ConnectStatus {
  /** the owner has connected their GitHub */
  github: boolean;
  /** the owner has connected their Vercel */
  vercel: boolean;
  loaded: boolean;
}

/**
 * Fetch the org's provider-connect status once while `active` (the dock tab is mounted).
 * `/api/connect/status` only reports github/vercel today (the proxy maps just those two);
 * Supabase state isn't exposed client-side, so the Stack shows it as "Setup".
 */
export function useConnectStatus(active: boolean): ConnectStatus {
  const [state, setState] = React.useState<ConnectStatus>({ github: false, vercel: false, loaded: false });
  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/connect/status", { cache: "no-store" });
        const data = (res.ok ? await res.json() : {}) as Partial<ConnectStatus>;
        if (alive) setState({ github: Boolean(data.github), vercel: Boolean(data.vercel), loaded: true });
      } catch {
        if (alive) setState((s) => ({ ...s, loaded: true }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [active]);
  return state;
}

/* ---------------------------------- roadmap % ---------------------------------- */

export interface RoadmapStep {
  label: string;
  done: boolean;
}

export interface Roadmap {
  percent: number;
  steps: RoadmapStep[];
}

/**
 * A coarse-but-honest workspace-setup progress: four real milestones (connect GitHub, connect
 * Vercel, dispatch a build, ship a site) plus the fraction of tasks completed, as a fifth unit.
 * Auto-completes as the workspace changes — no hardcoded stages.
 */
export function computeRoadmap(input: {
  github: boolean;
  vercel: boolean;
  tasks: DockTask[];
  sites: DockSite[];
}): Roadmap {
  const { github, vercel, tasks, sites } = input;
  const steps: RoadmapStep[] = [
    { label: "Connect GitHub", done: github },
    { label: "Connect Vercel", done: vercel },
    { label: "Dispatch a build", done: tasks.length > 0 },
    { label: "Ship a site", done: sites.length > 0 },
  ];
  const doneSteps = steps.filter((s) => s.done).length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const taskFraction = tasks.length > 0 ? doneTasks / tasks.length : 0;
  // steps + task-progress as one extra unit → all milestones + all tasks done = 100%.
  const percent = Math.round((100 * (doneSteps + taskFraction)) / (steps.length + 1));
  return { percent, steps };
}

/* -------------------------------- suggested next -------------------------------- */

/** Derive concrete next moves from real state (never fiction). Empty ⇒ "you're all set". */
export function suggestNext(input: {
  github: boolean;
  vercel: boolean;
  tasks: DockTask[];
  sites: DockSite[];
}): string[] {
  const { github, vercel, tasks, sites } = input;
  const out: string[] = [];
  if (!github) out.push("Connect GitHub so the Engineer can build");
  if (!vercel) out.push("Connect Vercel to deploy your sites");
  if (tasks.length === 0) out.push("Dispatch your first build — ask Lu to build something");
  else if (sites.length === 0) out.push("Ship your first site to a preview");
  return out;
}

/* --------------------------------- the stack ---------------------------------- */

export interface StackProvider {
  label: string;
  connected: boolean;
  /** null ⇒ we can't observe this client-side, so it renders as "Setup", not "Connected". */
  observable: boolean;
}

/** The Hosting row's sub-providers — GitHub/Vercel are real; Supabase isn't exposed client-side. */
export function hostingProviders(c: ConnectStatus): StackProvider[] {
  return [
    { label: "GitHub", connected: c.github, observable: true },
    { label: "Vercel", connected: c.vercel, observable: true },
    { label: "Supabase", connected: false, observable: false },
  ];
}

/* -------------------------------- important links ------------------------------ */

export interface ImportantLink {
  id: string;
  label: string;
  host: string;
  url: string | null;
  status: string;
}

/**
 * The org's real sites, labelled App vs Marketing by a light heuristic on repo/domain (the
 * honest data is the host + status + url). No sites ⇒ empty, so Company renders honest-empty.
 */
export function importantLinks(sites: DockSite[]): ImportantLink[] {
  return sites.map((s) => {
    const hay = `${s.repoFullName ?? ""} ${s.domain ?? ""}`.toLowerCase();
    const marketing = /market|www|landing|blog/.test(hay);
    return {
      id: s.id,
      label: marketing ? "Marketing Website" : "App",
      host: siteHost(s),
      url: siteUrl(s),
      status: s.status,
    };
  });
}

/* ----------------------------------- agents ----------------------------------- */

export interface DerivedAgent {
  key: string;
  label: string;
  agentName: string;
  accent: string;
}

/**
 * The provisioned agents, observed from real state. There's no client proxy for
 * `/api/departments` (the browser can't hit apps/api directly), so we take the departments
 * that actually have a footprint — a task or a site — and map them to their agent identity.
 * v0 provisions Engineering only; this shows exactly the departments doing real work.
 */
export function deriveAgents(tasks: DockTask[], sites: DockSite[]): DerivedAgent[] {
  const keys = new Set<string>();
  for (const t of tasks) if (t.departmentKey) keys.add(t.departmentKey);
  for (const s of sites) if (s.departmentKey) keys.add(s.departmentKey);
  return AGENTS.filter((a) => keys.has(a.id)).map((a) => ({
    key: a.id,
    label: a.label,
    agentName: a.agentName,
    accent: a.accent,
  }));
}
