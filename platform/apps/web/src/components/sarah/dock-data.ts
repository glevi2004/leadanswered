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
  /** the owner has connected their Supabase (optional — only database-backed apps need it) */
  supabase: boolean;
  loaded: boolean;
}

/**
 * Poll the org's provider-connect status while `active` (gentle — 15s), so connecting via the
 * inline ConnectCard is reflected everywhere (roadmap ticks, chat banner clears) without a
 * reload. `/api/connect/status` reports github/vercel through the proxy.
 */
export function useConnectStatus(active: boolean): ConnectStatus {
  const [state, setState] = React.useState<ConnectStatus>({
    github: false,
    vercel: false,
    supabase: false,
    loaded: false,
  });
  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/connect/status", { cache: "no-store" });
        const data = (res.ok ? await res.json() : {}) as Partial<ConnectStatus>;
        if (alive)
          setState({
            github: Boolean(data.github),
            vercel: Boolean(data.vercel),
            supabase: Boolean(data.supabase),
            loaded: true,
          });
      } catch {
        if (alive) setState((s) => ({ ...s, loaded: true }));
      }
    };
    void load();
    const iv = window.setInterval(load, 15_000);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [active]);
  return state;
}

/* -------------------------------- Lu intents -------------------------------- */

/**
 * The natural-language prompt each "next" fires at the REAL Lu (/api/lu/chat) when clicked.
 * Connect intents are phrased so Lu answers with the FORM (her show_connect_form tool renders
 * the connect card as her reply) — the click's whole journey is Home → Lu → form, one line.
 */
export const LU_INTENTS = {
  connectGithub: "I want to connect my GitHub.",
  connectVercel: "I want to connect my Vercel.",
  connectSupabase: "I want to connect my Supabase.",
  dispatchBuild: "Draft a plan to build me my first project — something simple to get started.",
  shipSite: "Ship my first site to a preview so I can see it live.",
} as const;

/* -------------------------------- suggested next -------------------------------- */

/** A concrete next move — a label the owner reads and the Lu intent clicking it fires. */
export interface Suggestion {
  id: string;
  label: string;
  /** the natural-language prompt clicking it sends to the REAL Lu (/api/lu/chat) */
  intent: string;
}

/**
 * The owner's to-do list, derived from real state (never fiction) — THE Home surface.
 * Ordered: connections first (GitHub + Vercel required; Supabase optional), then the first
 * build, then the first ship. Every click goes to Lu, who answers with the action (the
 * connect form, a drafted plan). Empty ⇒ "you're all set".
 */
export function suggestNext(input: {
  github: boolean;
  vercel: boolean;
  supabase: boolean;
  tasks: DockTask[];
  sites: DockSite[];
}): Suggestion[] {
  const { github, vercel, supabase, tasks, sites } = input;
  const out: Suggestion[] = [];
  if (!github)
    out.push({
      id: "connect-github",
      label: "Connect GitHub so the Engineer can build",
      intent: LU_INTENTS.connectGithub,
    });
  if (!vercel)
    out.push({
      id: "connect-vercel",
      label: "Connect Vercel to deploy your sites",
      intent: LU_INTENTS.connectVercel,
    });
  if (!supabase)
    out.push({
      id: "connect-supabase",
      label: "Connect Supabase (optional — for apps with a database)",
      intent: LU_INTENTS.connectSupabase,
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
