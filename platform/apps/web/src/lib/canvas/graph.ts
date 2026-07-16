/**
 * The company-canvas graph (PLATFORM-VISION 2026-07-15, Cofounder-style) — pure data,
 * no React. Lu sits at the origin; each department AGENT orbits her; each agent owns
 * exactly two PAGE nodes in its Lu space: the **Department** (a dashboard collapsing
 * everything from that function) and the **Workplace** (what the agent is working on
 * right now). Both are REAL pages served chrome-less under /embed/[node] and rendered
 * live on the canvas. Every node is movable; positions persist in localStorage.
 */

export type DeptId =
  | "sales" | "operations" | "finance" | "legal"
  | "engineering" | "design" | "marketing" | "support";

export type PageKind = "department" | "workplace";

export interface AgentNode {
  kind: "agent";
  id: DeptId;
  label: string;
  angle: number; // default radial placement, degrees (0 = right, +down)
  accent: string; // "r,g,b"
  active: boolean; // has a real built surface — inactive renders dimmed (Cofounder-style)
  blurb: string;
  agentName: string;
  context: string;
}

export interface PageNode {
  kind: "page";
  id: string; // e.g. "finance-dept" | "finance-work" — also the /embed/[node] key
  dept: DeptId;
  pageKind: PageKind;
  label: string;
  href: string; // the REAL route double-click opens
}

export const AGENTS: AgentNode[] = [
  { kind: "agent", id: "support", label: "Support", angle: -90, accent: "56,189,248", active: true, blurb: "Support agents answer customers, book jobs, and escalate what actually needs you.", agentName: "Receptionist", context: "Answers the line, books jobs, escalates questions only the owner can resolve." },
  { kind: "agent", id: "operations", label: "Operations", angle: -45, accent: "251,146,60", active: true, blurb: "Operations agents streamline your processes, coordinate the crew, and keep everything running.", agentName: "Ops Agent", context: "Jobs, scheduling, dispatch, and drive-time routing." },
  { kind: "agent", id: "finance", label: "Finance", angle: 0, accent: "52,211,153", active: true, blurb: "Finance agents quote, invoice, collect, and keep the books straight.", agentName: "Bookkeeper", context: "Quotes, invoices, payments (Stripe / AbacatePay Pix + boleto), overdue collection." },
  { kind: "agent", id: "legal", label: "Legal", angle: 45, accent: "167,139,250", active: false, blurb: "Legal agents draft and review contracts and documents, and route things for signature.", agentName: "Legal Agent", context: "Engagement letters, contracts, e-sign, doc review." },
  { kind: "agent", id: "engineering", label: "Engineering", angle: 90, accent: "96,165,250", active: false, blurb: "Engineering agents build, ship, and maintain your product — code reviews to deploys.", agentName: "Engineer", context: "Builds tools, sites, and integrations; ships and maintains." },
  { kind: "agent", id: "design", label: "Design", angle: 135, accent: "232,121,249", active: false, blurb: "Design agents produce wireframes, prototypes, and assets — keeping everything on-brand.", agentName: "Design Agent", context: "Wireframes, brand assets, prototypes, the design system." },
  { kind: "agent", id: "marketing", label: "Marketing", angle: 180, accent: "244,114,182", active: true, blurb: "Marketing agents drive awareness, run campaigns, and surface the insights that grow your audience.", agentName: "Marketing Agent", context: "Brand, content, SEO, reviews, sites, demand generation." },
  { kind: "agent", id: "sales", label: "Sales", angle: -135, accent: "163,230,53", active: true, blurb: "Sales agents track the pipeline, follow up on leads, and help close deals faster.", agentName: "Sales Agent", context: "Leads, quotes, pipeline, follow-ups, closing." },
];

/** Each agent's two pages: the collapsing dashboard + the live workplace. */
export const PAGES: PageNode[] = AGENTS.flatMap((a): PageNode[] => [
  {
    kind: "page", id: `${a.id}-dept`, dept: a.id, pageKind: "department",
    label: `${a.label} Department`,
    href: `/embed/${a.id}-dept`,
  },
  { kind: "page", id: `${a.id}-work`, dept: a.id, pageKind: "workplace", label: `${a.agentName} Workplace`, href: `/embed/${a.id}-work` },
]);

export const agentById = (id: string): AgentNode | undefined => AGENTS.find((a) => a.id === id);

/* ------------------------------ sheets ------------------------------ */
// Spreadsheet nodes — a department can keep editable tables (a Finance cash-flow, etc.)
// you zoom into and use directly. The grid DATA lives in `sheets.ts`; this is just the
// node so it gets a position + renders on the canvas.
export interface SheetMeta { id: string; dept: DeptId; label: string; }
export const SHEETS: SheetMeta[] = [
  { id: "finance-sheet", dept: "finance", label: "Cash Flow" },
];
export const sheetById = (id: string): SheetMeta | undefined => SHEETS.find((s) => s.id === id);

/* ------------------------------ teammates ------------------------------ */
// Human teammates on the graph — a person attached to the department they work with
// (a CFO next to Finance, an engineer next to Engineering). Game-like nodes: avatar +
// name + role. Rich profile lives in `team.ts`.
export interface TeammateMeta { id: string; dept: DeptId; name: string; role: string; initials: string; }
export const TEAMMATES: TeammateMeta[] = [
  { id: "tm-cfo", dept: "finance", name: "Marina", role: "CFO", initials: "M" },
  { id: "tm-eng", dept: "engineering", name: "Dev", role: "Engineer", initials: "D" },
  { id: "tm-design", dept: "design", name: "Sol", role: "Designer", initials: "S" },
];
export const teammateById = (id: string): TeammateMeta | undefined => TEAMMATES.find((t) => t.id === id);

/* ------------------------------ default layout ------------------------------ */

export const ORBIT_R = 780; // agent orbit radius
const OUT_DIST = 720; // frames sit this far OUTWARD from the agent (clear of the pill)
const PAGE_GAP = 350; // horizontal spacing between an agent's frames (they form a row)

const rad = (d: number) => (d * Math.PI) / 180;

export type Positions = Record<string, { x: number; y: number }>;

/** Lu at origin, agents on the ring; each agent's frames (pages + any sheet) sit in a
 *  HORIZONTAL ROW NEXT TO that agent, out beyond it (away from Lu). */
export function defaultPositions(): Positions {
  const pos: Positions = { lu: { x: 0, y: 0 } };
  for (const a of AGENTS) {
    const ux = Math.cos(rad(a.angle)), uy = Math.sin(rad(a.angle));
    const ax = ux * ORBIT_R, ay = uy * ORBIT_R;
    pos[a.id] = { x: ax, y: ay };
    const items = [
      ...PAGES.filter((p) => p.dept === a.id).map((p) => p.id),
      ...SHEETS.filter((s) => s.dept === a.id).map((s) => s.id),
    ];
    const n = items.length;
    const cx = ax + ux * OUT_DIST, cy = ay + uy * OUT_DIST; // row centre, outward from agent
    items.forEach((id, i) => {
      pos[id] = { x: cx + (i - (n - 1) / 2) * PAGE_GAP, y: cy };
    });
  }
  // teammates sit between Lu and their department agent, offset to the side
  for (const t of TEAMMATES) {
    const a = agentById(t.dept);
    if (!a) continue;
    const ux = Math.cos(rad(a.angle)), uy = Math.sin(rad(a.angle));
    const tx = -uy, ty = ux;
    pos[t.id] = { x: ux * (ORBIT_R * 0.45) + tx * 190, y: uy * (ORBIT_R * 0.45) + ty * 190 };
  }
  return pos;
}

/* ------------------------------ persistence ------------------------------ */

const LAYOUT_KEY = "lu_canvas_layout_v7"; // bumped: rows-below-agent layout + shrunk frames

export function loadPositions(): Positions {
  const base = defaultPositions();
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Positions;
    return { ...base, ...saved }; // saved positions win; new nodes get defaults
  } catch {
    return base;
  }
}

export function savePositions(pos: Positions): void {
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(pos));
  } catch {
    /* full/unavailable — the canvas still works, just doesn't persist */
  }
}

export function clearPositions(): void {
  try {
    window.localStorage.removeItem(LAYOUT_KEY);
  } catch {
    /* noop */
  }
}
