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

/* -------------------------------- Lu intents -------------------------------- */

/** Deep-link to the connections settings — the secondary affordance on connect items. */
export const SETTINGS_HREF = "/settings";

/**
 * The natural-language prompt each "next" fires at the REAL Lu (/api/lu/chat) when clicked, so a
 * suggestion actually TAKES the step (Lu walks the connect / proposes the plan) instead of
 * dead-ending at a static Settings link. Shared by the Roadmap steps and the Suggested-next list
 * so both speak with one voice.
 */
export const LU_INTENTS = {
  connectGithub: "Walk me through connecting my GitHub so you can build into it.",
  connectVercel: "Walk me through connecting my Vercel so you can deploy my sites.",
  dispatchBuild: "Draft a plan to build me my first project — something simple to get started.",
  shipSite: "Ship my first site to a preview so I can see it live.",
} as const;

/* ---------------------------------- roadmap % ---------------------------------- */

export interface RoadmapStep {
  label: string;
  done: boolean;
  /** the Lu prompt clicking an INCOMPLETE step fires (done steps aren't actionable) */
  intent: string;
  /** optional Settings deep-link — the secondary affordance for connect steps */
  settingsHref?: string;
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
    { label: "Connect GitHub", done: github, intent: LU_INTENTS.connectGithub, settingsHref: SETTINGS_HREF },
    { label: "Connect Vercel", done: vercel, intent: LU_INTENTS.connectVercel, settingsHref: SETTINGS_HREF },
    { label: "Dispatch a build", done: tasks.length > 0, intent: LU_INTENTS.dispatchBuild },
    { label: "Ship a site", done: sites.length > 0, intent: LU_INTENTS.shipSite },
  ];
  const doneSteps = steps.filter((s) => s.done).length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const taskFraction = tasks.length > 0 ? doneTasks / tasks.length : 0;
  // steps + task-progress as one extra unit → all milestones + all tasks done = 100%.
  const percent = Math.round((100 * (doneSteps + taskFraction)) / (steps.length + 1));
  return { percent, steps };
}

/* -------------------------------- suggested next -------------------------------- */

/** A concrete next move — a label the owner reads and the Lu intent clicking it fires. */
export interface Suggestion {
  id: string;
  label: string;
  /** the natural-language prompt clicking it sends to the REAL Lu (/api/lu/chat) */
  intent: string;
  /** optional Settings deep-link — the secondary affordance for connect items */
  settingsHref?: string;
}

/**
 * Derive concrete next moves from real state (never fiction). Each carries a Lu intent so the
 * click TAKES the step (Lu acts) rather than just navigating. Empty ⇒ "you're all set".
 */
export function suggestNext(input: {
  github: boolean;
  vercel: boolean;
  tasks: DockTask[];
  sites: DockSite[];
}): Suggestion[] {
  const { github, vercel, tasks, sites } = input;
  const out: Suggestion[] = [];
  if (!github)
    out.push({
      id: "connect-github",
      label: "Connect GitHub so the Engineer can build",
      intent: LU_INTENTS.connectGithub,
      settingsHref: SETTINGS_HREF,
    });
  if (!vercel)
    out.push({
      id: "connect-vercel",
      label: "Connect Vercel to deploy your sites",
      intent: LU_INTENTS.connectVercel,
      settingsHref: SETTINGS_HREF,
    });
  if (tasks.length === 0)
    out.push({
      id: "dispatch-build",
      label: "Dispatch your first build — ask Lu to build something",
      intent: LU_INTENTS.dispatchBuild,
    });
  else if (sites.length === 0)
    out.push({ id: "ship-site", label: "Ship your first site to a preview", intent: LU_INTENTS.shipSite });
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
