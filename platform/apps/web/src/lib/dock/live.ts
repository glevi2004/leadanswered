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
  action: string; // publish_site | approve_plan — the PLAN GATE (propose_plan) vs the publish gate
  status: string; // pending
  createdAt?: string;
}

const POLL_MS = 3000;
const SITES_POLL_MS = 5000;

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

/**
 * Onboarding-mode signal (Phase 2). GET /api/dock/onboarding → { active } tells us the org
 * is mid-onboarding (Lu hasn't finished booting the company yet). Polls on the same ~3s
 * cadence as the other dock pollers while `active` (the surface is on screen). Returns the
 * current onboarding-mode flag; false once the departments are activated.
 */
export function useOnboardingMode(active: boolean): boolean {
  const [onboarding, setOnboarding] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      const d = await getJSON<{ active: boolean }>("/api/dock/onboarding", { active: false });
      if (!alive) return;
      setOnboarding(Boolean(d.active));
    };
    load();
    const iv = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [active]);

  return onboarding;
}

/** One row of the org's journal (docs/system.md §2) — what activity lines derive from. */
export interface DockEvent {
  id: string;
  taskId: string | null;
  kind: string; // plan_proposed | build_dispatched | coding_finished | preview_ready | verify_* | published | build_failed | ...
  message: string;
  payload: Record<string, unknown> | null;
  createdAt?: string;
}

/**
 * Poll the org's journal events while `active` (newest-first). The build tracker renders
 * the latest event as a live activity line, so the owner sees PROCESS (coding finished →
 * preview ready → verifying), not just a spinner.
 */
export function useAgentEvents(active: boolean): DockEvent[] {
  const [events, setEvents] = React.useState<DockEvent[]>([]);

  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      const d = await getJSON<{ events: DockEvent[] }>("/api/dock/events", { events: [] });
      if (!alive) return;
      setEvents(d.events ?? []);
    };
    load();
    const iv = window.setInterval(load, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [active]);

  return events;
}

/* --------------------------- onboarding artifacts --------------------------- */

/** One option in an onboarding decision — a choice Lu offers with an optional one-liner. */
export interface DecisionOption {
  label: string;
  detail?: string;
}

/** A single decision Lu wants the owner to make while setting the company up. */
export interface OnboardingDecision {
  question: string;
  options: DecisionOption[];
  /** index into `options` Lu recommends (clamped in range). */
  recommended: number;
}

/** The `onboarding_decisions` doc payload — the ordered decisions Lu drafted. */
export interface OnboardingDecisions {
  decisions: OnboardingDecision[];
}

/**
 * Read the decisions out of a `doc` artifact payload
 * (`{ type: "onboarding_decisions", decisions: [...] }`), or null when the payload isn't one.
 * Defensive (mirrors planFromArtifact): drops malformed options/decisions and clamps
 * `recommended` into range so the card never indexes off the end.
 */
export function decisionsFromArtifact(payload: Record<string, unknown> | null): OnboardingDecisions | null {
  if (!payload || payload.type !== "onboarding_decisions") return null;
  const rawDecisions = Array.isArray(payload.decisions) ? payload.decisions : [];
  const decisions: OnboardingDecision[] = [];
  for (const d of rawDecisions) {
    if (!d || typeof d !== "object") continue;
    const dd = d as Record<string, unknown>;
    const rawOptions = Array.isArray(dd.options) ? dd.options : [];
    const options: DecisionOption[] = [];
    for (const o of rawOptions) {
      if (!o || typeof o !== "object") continue;
      const oo = o as Record<string, unknown>;
      if (typeof oo.label !== "string") continue;
      options.push({ label: oo.label, detail: typeof oo.detail === "string" ? oo.detail : undefined });
    }
    if (options.length === 0) continue;
    const rawRec = typeof dd.recommended === "number" ? Math.trunc(dd.recommended) : 0;
    const recommended = Math.min(Math.max(0, rawRec), options.length - 1);
    decisions.push({
      question: typeof dd.question === "string" ? dd.question : "",
      options,
      recommended,
    });
  }
  if (decisions.length === 0) return null;
  return { decisions };
}

/** How Lu classified the company from the onboarding conversation. */
export interface BusinessClassification {
  companyType: string;
  industry: string;
  userType: string;
}

/** The `business_plan` doc payload — Lu's drafted plan the owner accepts to boot the company. */
export interface BusinessPlan {
  classification: BusinessClassification;
  values: string[];
  summary?: string;
}

/**
 * Read the accept-gate doc out of a `doc` artifact payload — the FINAL Business Context
 * (`{ type: "business_context", draft: false, classification, values, summary }`, roadmap
 * Ch.1) or the legacy Business Plan. Returns null for drafts (the growing doc renders in
 * the Library, not as the accept card). Defensive like the other parsers.
 */
export function businessPlanFromArtifact(payload: Record<string, unknown> | null): BusinessPlan | null {
  if (!payload) return null;
  if (payload.type === "business_context") {
    if (payload.draft === true || !payload.classification) return null;
  } else if (payload.type !== "business_plan") {
    return null;
  }
  const str = (v: unknown): string => (typeof v === "string" ? v : "");
  const c =
    payload.classification && typeof payload.classification === "object"
      ? (payload.classification as Record<string, unknown>)
      : {};
  const values = Array.isArray(payload.values)
    ? payload.values.filter((s): s is string => typeof s === "string")
    : [];
  return {
    classification: {
      companyType: str(c.companyType),
      industry: str(c.industry),
      userType: str(c.userType),
    },
    values,
    summary: typeof payload.summary === "string" ? payload.summary : undefined,
  };
}

/* ------------------------------ the Library ------------------------------ */

/**
 * One company document in the LIBRARY (docs/product.md §3 — "docs become the Library").
 * All Library surfaces (dock cards, the Company list, the /doc viewer) render THIS shape;
 * every doc-typed artifact payload is normalized into markdown here so the Notion-style
 * viewer and the card previews share one rendering path. `sql` is set for migrations
 * (rendered as a code block instead of markdown).
 */
export interface LibraryDoc {
  id: string;
  title: string;
  /** business_plan | onboarding_decisions | architecture | strategy | spec | note | migration */
  type: string;
  /** Human label for the type chip. */
  typeLabel: string;
  /** The Library folder this doc files under — "general" (company docs) or a department key. */
  folder: string;
  markdown: string;
  sql?: string;
  /** true when this doc is gated behind an `approve_doc` approval (the architecture doc). */
  gated: boolean;
  createdAt?: string;
}

const GENERIC_DOC_TYPES = new Set(["architecture", "strategy", "spec", "note"]);

/** Folder assignment (docs/product.md §3): company-level docs → General; build docs →
 *  Engineering. Later departments get their own folders as they produce docs. */
function docFolder(type: string): string {
  return type === "architecture" || type === "spec" || type === "migration" ? "engineering" : "general";
}

function docTypeLabel(type: string): string {
  switch (type) {
    case "business_plan":
      return "Business Plan";
    case "business_context":
      return "Business Context";
    case "onboarding_decisions":
      return "Decisions";
    case "architecture":
      return "Architecture";
    case "migration":
      return "Migration";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

/** Human label for a business-context field key (camelCase → Title Case, few specials). */
function fieldLabel(key: string): string {
  const specials: Record<string, string> = {
    icp: "ICP", jtbd: "Job to be done", gtm: "Go-to-market", b2x: "B2B / B2C",
    outcome90: "90-day outcome", oneLiner: "One-sentence summary",
  };
  if (specials[key]) return specials[key];
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/** Normalize one doc artifact into a LibraryDoc, or null when it isn't a Library doc. */
export function libraryDocFromArtifact(a: DockArtifact): LibraryDoc | null {
  if (a.kind !== "doc") return null;
  const p = a.payload;
  const type = typeof p?.type === "string" ? p.type : "";
  if (type === "business_context") {
    // The GROWING doc (roadmap Ch.1): draft or final, rendered from whatever's captured.
    const draft = p?.draft === true;
    const fields =
      p?.fields && typeof p.fields === "object" ? (p.fields as Record<string, unknown>) : {};
    const c =
      p?.classification && typeof p.classification === "object"
        ? (p.classification as Record<string, unknown>)
        : null;
    const values = Array.isArray(p?.values)
      ? (p!.values as unknown[]).filter((s): s is string => typeof s === "string")
      : [];
    const sections: string[] = [];
    if (typeof p?.summary === "string" && p.summary) sections.push(`## Summary\n\n${p.summary}`);
    if (c) {
      const rows = [
        typeof c.companyType === "string" && c.companyType && `- **Company Type** — ${c.companyType}`,
        typeof c.industry === "string" && c.industry && `- **Industry** — ${c.industry}`,
        typeof c.userType === "string" && c.userType && `- **User Type** — ${c.userType}`,
      ].filter(Boolean);
      if (rows.length) sections.push(`## Business Classification\n\n${rows.join("\n")}`);
    }
    if (values.length) sections.push(`## Company Values\n\n${values.map((v) => `- ${v}`).join("\n")}`);
    const fieldLines = Object.entries(fields)
      .filter(([, v]) => typeof v === "string" && v)
      .map(([k, v]) => `- **${fieldLabel(k)}** — ${v}`);
    if (fieldLines.length) sections.push(`## The Picture\n\n${fieldLines.join("\n")}`);
    if (sections.length === 0) return null;
    return {
      id: a.id,
      title: a.title || "Business Context",
      type,
      typeLabel: draft ? "Business Context · Draft" : docTypeLabel(type),
      markdown: sections.join("\n\n"),
      gated: false,
      folder: docFolder(type),
      createdAt: a.createdAt,
    };
  }
  if (type === "business_plan") {
    const plan = businessPlanFromArtifact(p);
    if (!plan) return null;
    const md = [
      plan.summary ? `## Summary\n\n${plan.summary}` : "",
      "## Business Classification",
      [
        plan.classification.companyType && `- **Company Type** — ${plan.classification.companyType}`,
        plan.classification.industry && `- **Industry** — ${plan.classification.industry}`,
        plan.classification.userType && `- **User Type** — ${plan.classification.userType}`,
      ]
        .filter(Boolean)
        .join("\n"),
      plan.values.length ? `## Company Values\n\n${plan.values.map((v) => `- ${v}`).join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    return { id: a.id, title: a.title || "Business Plan", type, typeLabel: docTypeLabel(type), folder: docFolder(type), markdown: md, gated: false, createdAt: a.createdAt };
  }
  if (type === "onboarding_decisions") {
    const d = decisionsFromArtifact(p);
    if (!d) return null;
    const md = d.decisions
      .map((dec, i) => {
        const opts = dec.options
          .map((o, j) => `- ${o.label}${j === dec.recommended ? " **(recommended)**" : ""}${o.detail ? ` — ${o.detail}` : ""}`)
          .join("\n");
        return `## ${i + 1}. ${dec.question}\n\n${opts}`;
      })
      .join("\n\n");
    return { id: a.id, title: a.title || "Decisions", type, typeLabel: docTypeLabel(type), folder: docFolder(type), markdown: md, gated: false, createdAt: a.createdAt };
  }
  if (type === "migration") {
    const sql = typeof p?.sql === "string" ? p.sql : "";
    if (!sql) return null;
    const title = typeof p?.title === "string" && p.title ? p.title : a.title || "Migration";
    return { id: a.id, title, type, typeLabel: docTypeLabel(type), folder: docFolder(type), markdown: "", sql, gated: false, createdAt: a.createdAt };
  }
  if (GENERIC_DOC_TYPES.has(type)) {
    const md = typeof p?.markdown === "string" ? p.markdown : "";
    if (!md) return null;
    const title = typeof p?.title === "string" && p.title ? p.title : a.title || docTypeLabel(type);
    return { id: a.id, title, type, typeLabel: docTypeLabel(type), folder: docFolder(type), markdown: md, gated: p?.gated === true, createdAt: a.createdAt };
  }
  return null;
}

/**
 * The org's Library documents, newest first, deduped so revisions REPLACE older versions:
 * one Business Plan, one Decisions doc, one generic doc per type+title; every migration kept.
 */
export function libraryDocs(artifacts: DockArtifact[]): LibraryDoc[] {
  const all = artifacts.map(libraryDocFromArtifact).filter((d): d is LibraryDoc => d !== null);
  const seen = new Set<string>();
  const out: LibraryDoc[] = [];
  // artifacts arrive append-ordered → walk newest-first and keep the first of each identity.
  for (const d of [...all].reverse()) {
    const key =
      d.type === "business_plan" || d.type === "business_context" || d.type === "onboarding_decisions"
        ? d.type
        : d.type === "migration"
          ? `migration:${d.id}`
          : `${d.type}:${d.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(d);
  }
  return out;
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

/** The plan Lu drafted for a build — the objective, ordered steps, and acceptance criteria. */
export interface DockPlan {
  objective: string;
  steps: string[];
  acceptance: string[];
}

/**
 * Read the plan out of a `doc` artifact payload (propose_plan writes
 * `{ type: "plan", objective, steps, acceptance }`), or null when the payload isn't a plan.
 * The plan-review card renders this so the owner approves it BEFORE the Engineer builds.
 */
export function planFromArtifact(payload: Record<string, unknown> | null): DockPlan | null {
  if (!payload || payload.type !== "plan") return null;
  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
  return {
    objective: typeof payload.objective === "string" ? payload.objective : "",
    steps: strings(payload.steps),
    acceptance: strings(payload.acceptance),
  };
}

/* --------------------------------- sites --------------------------------- */

/** A preview / production deploy of a Site (apps/api DeploymentRecord). */
export interface DockDeployment {
  id: string;
  siteId: string;
  env: string; // preview | production
  url: string;
  sha: string | null;
  prNumber: number | null;
  status: string; // READY | BUILDING | ERROR | ...
  createdAt?: string;
  updatedAt?: string;
}

/** One org Site as returned by GET /api/sites, joined with its latest deployment. */
export interface DockSite {
  id: string;
  orgId: string;
  departmentKey: string | null; // "engineering"
  repoFullName: string | null; // owner/name
  vercelProjectId: string | null;
  domain: string | null; // "{slug}.lu.computer" once live
  status: string; // building | preview | live
  /** created (Lu stood it up) | imported (the owner's existing repo — ladder step 2) */
  kind?: string;
  setupCommand?: string | null;
  testCommand?: string | null;
  createdAt?: string;
  updatedAt?: string;
  latestDeployment?: DockDeployment | null;
}

/**
 * Poll the org's sites while `active` (canvas mounted). Each Site carries its latest
 * deployment; the canvas turns them into browser-frame nodes. Keeps the last good value
 * across a transient failure, so a hiccup never blanks the frames.
 */
export function useSites(active: boolean): { sites: DockSite[]; loaded: boolean } {
  const [sites, setSites] = React.useState<DockSite[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!active) return;
    let alive = true;
    const load = async () => {
      const d = await getJSON<{ sites: DockSite[] }>("/api/dock/sites", { sites: [] });
      if (!alive) return;
      setSites(d.sites ?? []);
      setLoaded(true);
    };
    load();
    const iv = window.setInterval(load, SITES_POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(iv);
    };
  }, [active]);

  return { sites, loaded };
}

/** Best live/preview URL for a Site (domain wins once live, else the latest deploy), or
 *  null while it's still building — the canvas shows "Building…" until this resolves. */
export function siteUrl(site: DockSite): string | null {
  const withProto = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);
  if (site.domain && site.domain.trim() !== "") return withProto(site.domain.trim());
  const url = site.latestDeployment?.url;
  return typeof url === "string" && url.trim() !== "" ? withProto(url.trim()) : null;
}

/** The host shown in the frame's chrome (the pretty domain, the deploy host, else the repo). */
export function siteHost(site: DockSite): string {
  const u = siteUrl(site);
  if (!u) return site.repoFullName ?? "building";
  try {
    return new URL(u).host;
  } catch {
    return u.replace(/^https?:\/\//i, "");
  }
}
