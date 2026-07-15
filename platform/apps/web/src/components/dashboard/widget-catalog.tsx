import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { HomeData } from "@/lib/data/home";
import type {
  FunnelSnapshot,
  HeadlineStat,
  MetricSeries,
  ResponseTimeStat,
} from "@/lib/data/analytics/types";
import { formatCents, formatTime, FAMILY_CHIP } from "@/lib/dashboard-ui";
import { AGENT_WORK } from "@/lib/canvas/agent-work";
import { StatCard } from "@/components/app/StatCard";
import { SparklineStat } from "@/components/app/SparklineStat";
import { ActivityDigest } from "@/app/(app)/home/HomeClient";

/**
 * Zone B — the customizable widget catalog. Each widget is a compact slice of one
 * department's data, rendered from an already-fetched `DashboardData` bundle (no
 * fetching inside `render`). Lightweight real components (StatCard, SparklineStat)
 * are reused as full-bleed `bare` tiles; heavier index pages (CrmIndex, Invoices…)
 * would fight the grid, so those departments get a small bespoke summary instead.
 * Widgets are honest-empty aware: a New (non-demo) org shows a muted "fills in
 * when…" state or the "soon" tile, never fabricated numbers.
 */

/* ------------------------------ data bundle ------------------------------- */

export interface DashboardCrm {
  /** Leads that have gone quiet — candidates for a nudge. */
  followUpCount: number;
  /** A few most-recent contacts for the "Recent leads" glance. */
  recent: { id: string; name: string; town?: string; stage: string }[];
}

/** Everything the board needs, gathered once on the server and handed to the client. */
export interface DashboardData {
  home: HomeData;
  crm: DashboardCrm | null;
  funnel: FunnelSnapshot | null;
  headline: HeadlineStat[] | null;
  responseTime: ResponseTimeStat | null;
  series: MetricSeries[] | null;
}

/* -------------------------------- widgets --------------------------------- */

export type WidgetSurface = "sales" | "operations" | "finance" | "marketing" | "support" | "reports";

export interface WidgetCtx {
  organization: Record<string, any>;
  demo: boolean;
  data: DashboardData;
}

export interface WidgetDef {
  id: string;
  title: string;
  surface: WidgetSurface;
  href: string;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  /** `bare` widgets render a self-carded component full-bleed (no WidgetCard chrome). */
  bare?: boolean;
  render: (ctx: WidgetCtx) => React.ReactNode;
}

/** One placed tile in the saved dashboard layout (react-grid-layout geometry). */
export interface DashItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const SURFACES: WidgetSurface[] = [
  "sales",
  "operations",
  "finance",
  "marketing",
  "support",
  "reports",
];

export const SURFACE_LABEL: Record<WidgetSurface, string> = {
  sales: "Sales",
  operations: "Operations",
  finance: "Finance",
  marketing: "Marketing",
  support: "Support",
  reports: "Reports",
};

/* ------------------------------ presenters -------------------------------- */

/** The honest-empty state: what the widget will show once data lands. */
function Fills({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    qualifying: "New lead",
    past_customer: "Past customer",
    paid: "Paid",
    customer: "Customer",
    new: "New lead",
  };
  return map[stage] ?? stage;
}

function orgTz(organization: Record<string, any>): string {
  return organization?.standingAvailability?.timezone ?? "America/New_York";
}

/* -------------------------------- catalog --------------------------------- */

export const WIDGETS: WidgetDef[] = [
  /* --------------------------------- sales -------------------------------- */
  {
    id: "sales-pipeline",
    title: "Sales pipeline",
    surface: "sales",
    href: "/customers",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 3 },
    render: ({ demo, data }) => {
      if (!demo || !data.funnel) {
        return <Fills>Your leads-to-paid pipeline builds here as work flows through.</Fills>;
      }
      const stages = data.funnel.stages.filter((s) => s.key !== "visits");
      const max = Math.max(...stages.map((s) => s.count), 1);
      return (
        <ul className="flex flex-col gap-1.5">
          {stages.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 truncate text-muted-foreground">{s.label}</span>
              <span
                className="h-2 rounded-full bg-foreground/70"
                style={{ width: `${Math.max(6, (s.count / max) * 100)}%` }}
              />
              <span className="ml-auto font-medium tabular-nums">{s.count}</span>
            </li>
          ))}
        </ul>
      );
    },
  },
  {
    id: "sales-recent-leads",
    title: "Recent leads",
    surface: "sales",
    href: "/customers",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, data }) => {
      if (!demo || !data.crm || data.crm.recent.length === 0) {
        return <Fills>Leads land here the moment the Sales agent logs one.</Fills>;
      }
      return (
        <ul className="flex flex-col gap-2.5">
          {data.crm.recent.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
              <Link
                href={`/customers/${c.id}`}
                className="truncate font-medium underline-offset-2 hover:underline"
              >
                {c.name}
              </Link>
              <span className="shrink-0 text-xs text-muted-foreground">{c.town || stageLabel(c.stage)}</span>
            </li>
          ))}
        </ul>
      );
    },
  },
  {
    id: "sales-follow-up",
    title: "Needs follow-up",
    surface: "sales",
    href: "/customers",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    bare: true,
    render: ({ demo, data }) => (
      <StatCard
        label="Needs follow-up"
        value={data.crm?.followUpCount}
        soon={!demo || !data.crm}
        hint="leads gone quiet — the Sales agent nudges them"
        href="/customers"
      />
    ),
  },

  /* ------------------------------ operations ------------------------------ */
  {
    id: "schedule-today",
    title: "Today's schedule",
    surface: "operations",
    href: "/schedule",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, data, organization }) => {
      const tz = orgTz(organization);
      const g = data.home.scheduleGlance;
      if (!demo || g.items.length === 0) {
        return <Fills>Estimates and jobs the Ops agent books land on your calendar here.</Fills>;
      }
      return (
        <ol className="flex flex-col">
          {g.items.map((item, i) => (
            <li key={item.id} className="relative flex gap-3 pb-3 last:pb-0">
              {i < g.items.length - 1 && (
                <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
              )}
              <span className="mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-foreground/60 bg-background" />
              <div className="min-w-0">
                {item.contactId ? (
                  <Link
                    href={`/customers/${item.contactId}`}
                    className="text-sm font-medium underline-offset-2 hover:underline"
                  >
                    {formatTime(item.startAt, tz)} · {item.name}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">
                    {formatTime(item.startAt, tz)} · {item.name}
                  </p>
                )}
                {item.town && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" /> {item.town}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      );
    },
  },
  {
    id: "operations-board",
    title: "Operations board",
    surface: "operations",
    href: "/schedule",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    render: ({ demo }) => {
      if (!demo) {
        return <Fills>The Ops agent's routes and reschedules queue up here.</Fills>;
      }
      const w = AGENT_WORK.operations;
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          {w.pending.map((p, i) => (
            <div key={i} className="flex items-start gap-2">
              <span
                className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  p.status === "needs_approval"
                    ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
                    : FAMILY_CHIP.blue
                }`}
              >
                {p.status === "needs_approval" ? "Approve" : "Queued"}
              </span>
              <span className="min-w-0 flex-1">{p.title}</span>
              <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{p.ago}</span>
            </div>
          ))}
          {w.activity.length > 0 && (
            <div className="mt-0.5 flex flex-col gap-1.5 border-t pt-2.5">
              {w.activity.slice(0, 2).map((a, i) => (
                <p key={i} className="flex gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 font-mono text-[10px]">{a.at}</span>
                  <span className="min-w-0">{a.line}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: "schedule-booked",
    title: "Booked this week",
    surface: "operations",
    href: "/schedule",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    bare: true,
    render: ({ demo, data }) => (
      <StatCard
        label="Booked this week"
        value={data.home.stats.bookedThisWeek}
        soon={!demo}
        hint="estimates + jobs on the calendar"
        href="/schedule"
      />
    ),
  },

  /* -------------------------------- finance ------------------------------- */
  {
    id: "finance-unpaid",
    title: "Finance — unpaid",
    surface: "finance",
    href: "/money",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) => {
      const owed = data.home.stats.owedCents;
      const overdue = data.home.stats.overdueCents;
      if (!demo || !owed) return <Fills>Unpaid and overdue invoices total here once you're billing.</Fills>;
      return (
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-2xl font-semibold tracking-tight">{formatCents(owed)}</p>
            <p className="text-xs text-muted-foreground">outstanding across open invoices</p>
          </div>
          {overdue ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {formatCents(overdue)} overdue — the Bookkeeper is chasing it
            </p>
          ) : null}
        </div>
      );
    },
  },
  {
    id: "finance-paid",
    title: "Paid this month",
    surface: "finance",
    href: "/money",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    bare: true,
    render: ({ demo, data }) => {
      const rev = data.headline?.find((h) => h.key === "revenue");
      return (
        <StatCard
          label="Paid this month"
          value={rev?.value}
          soon={!demo || !rev}
          hint={rev?.delta ? `▲ ${rev.delta.pct}% vs last period` : "collected this month"}
          href="/money"
        />
      );
    },
  },
  {
    id: "finance-revenue-trend",
    title: "Revenue trend",
    surface: "finance",
    href: "/analytics",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
    bare: true,
    render: ({ demo, data }) => {
      const s = data.series?.find((x) => x.key === "revenue");
      if (!demo || !s || s.points.length === 0) {
        return <BareEmpty label="Revenue trend">Charts here once money's moving.</BareEmpty>;
      }
      const vals = s.points.map((p) => p.v);
      const last = vals[vals.length - 1] ?? 0;
      return (
        <SparklineStat
          label="Revenue trend"
          value={formatCents(last)}
          hint="collected by month"
          series={vals}
          seriesLabel="Revenue"
        />
      );
    },
  },

  /* ------------------------------- marketing ------------------------------ */
  {
    id: "marketing-reviews",
    title: "Reviews collected",
    surface: "marketing",
    href: "/reviews",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) => {
      const collected = data.home.stats.reviewsCollected;
      if (!demo || !collected) return <Fills>Reviews the Marketing agent collects show here.</Fills>;
      return (
        <div>
          <div className="flex items-center gap-2.5">
            <p className="text-3xl font-semibold tracking-tight">{data.home.stats.reviewsAvg}</p>
            <div className="flex gap-0.5" aria-label={`${data.home.stats.reviewsAvg} star average`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{collected} new reviews collected</p>
        </div>
      );
    },
  },
  {
    id: "marketing-content",
    title: "Marketing — in progress",
    surface: "marketing",
    href: "/agents/content",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    render: ({ demo }) => {
      if (!demo) return <Fills>Posts the Marketing agent drafts appear here for a quick look.</Fills>;
      const w = AGENT_WORK.marketing;
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          {w.current && (
            <div>
              <p className="text-xs font-medium">{w.current.title}</p>
              <p className="line-clamp-2 text-[11px] text-muted-foreground">{w.current.detail}</p>
            </div>
          )}
          {w.draft && (
            <div className="rounded-lg bg-muted/50 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{w.draft.kind}</p>
              <p className="text-xs font-medium">{w.draft.title}</p>
              <p className="line-clamp-3 text-[11px] text-muted-foreground">{w.draft.preview}</p>
            </div>
          )}
        </div>
      );
    },
  },

  /* -------------------------------- support ------------------------------- */
  {
    id: "support-line",
    title: "Support — the line",
    surface: "support",
    href: "/sarah",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, organization }) => {
      const number = demo ? "(844) 415-7642" : (organization?.twilioNumber ?? "—");
      const w = AGENT_WORK.support;
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Answering the line
            </span>
            <span className="font-medium">{number}</span>
          </div>
          {w.current && <p className="text-xs text-muted-foreground">{w.current.detail}</p>}
        </div>
      );
    },
  },

  /* -------------------------------- reports ------------------------------- */
  {
    id: "reports-response-time",
    title: "Response time",
    surface: "reports",
    href: "/analytics",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    bare: true,
    render: ({ demo, data }) => {
      const r = data.responseTime;
      return (
        <StatCard
          label="Response time"
          value={r ? `${r.medianSeconds}s` : undefined}
          soon={!demo || !r}
          hint={r ? `median · p90 ${r.p90Seconds}s` : undefined}
          badge={
            r ? (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${FAMILY_CHIP.emerald}`}>
                {Math.round(r.withinTargetPct * 100)}% within {r.targetSeconds}s
              </span>
            ) : undefined
          }
          href="/analytics"
        />
      );
    },
  },
  {
    id: "reports-activity",
    title: "Agent activity",
    surface: "reports",
    href: "/sarah",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 3, h: 3 },
    // Self-gating: ActivityDigest renders its own empty state when there's nothing yet.
    render: () => <ActivityDigest />,
  },
];

/** A small self-carded tile — the bare-widget fallback when a chart has no data. */
function BareEmpty({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card-lift flex h-full flex-col rounded-2xl border bg-card p-5 text-card-foreground shadow-xs">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

/** Look up a widget definition by id. */
export function widgetById(id: string): WidgetDef | undefined {
  return WIDGETS.find((w) => w.id === id);
}

/**
 * A sensible starter board on the 12-column grid — the glance an owner wants
 * first: today's schedule, what's owed, response time, the sales pipeline, a
 * couple of stat tiles, and the revenue trend.
 */
export const DEFAULT_WIDGETS: DashItem[] = [
  { i: "schedule-today", x: 0, y: 0, w: 6, h: 3 },
  { i: "finance-unpaid", x: 6, y: 0, w: 3, h: 2 },
  { i: "reports-response-time", x: 9, y: 0, w: 3, h: 2 },
  { i: "sales-follow-up", x: 6, y: 2, w: 3, h: 2 },
  { i: "schedule-booked", x: 9, y: 2, w: 3, h: 2 },
  { i: "sales-pipeline", x: 0, y: 3, w: 6, h: 3 },
  { i: "finance-revenue-trend", x: 6, y: 4, w: 6, h: 3 },
];
