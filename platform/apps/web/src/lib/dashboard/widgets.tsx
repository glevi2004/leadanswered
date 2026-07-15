import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { HomeData } from "@/lib/data/home";
import type {
  FunnelSnapshot,
  HeadlineStat,
  MetricSeries,
  ResponseTimeStat,
} from "@/lib/data/analytics/types";
import { formatTime, formatCents, FAMILY_CHIP } from "@/lib/dashboard-ui";
import { ActivityDigest } from "@/app/(app)/home/HomeClient";

/**
 * Dashboard widget catalog — the customizable Home board (see WidgetBoard).
 *
 * Each widget is a compact glance rendered from an already-fetched `DashboardData`
 * bundle (no data fetching inside `render`). Widgets are honest-empty aware: on a
 * New / non-demo org they show a muted "fills in when…" state, never fake numbers.
 * The Mature (Apex) path serves the mock data. Grouped by surface so the "Add
 * widget" picker can section them.
 */

/* ------------------------------ data bundle ------------------------------- */

export interface DashboardCrm {
  /** Leads that have gone quiet — candidates for a nudge. */
  followUpCount: number;
  /** A few most-recent contacts for the "Recent customers" glance. */
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

export type WidgetSurface = "customers" | "schedule" | "money" | "agents" | "reports" | "utility";

export interface WidgetCtx {
  organization: Record<string, any>;
  demo: boolean;
  data: DashboardData;
}

export interface WidgetDef {
  id: string;
  title: string;
  surface: WidgetSurface;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  href: string;
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

export const SURFACES: WidgetSurface[] = ["customers", "schedule", "money", "agents", "reports", "utility"];

export const SURFACE_LABEL: Record<WidgetSurface, string> = {
  customers: "Customers",
  schedule: "Schedule",
  money: "Money",
  agents: "Agents",
  reports: "Reports",
  utility: "Utility",
};

/* ------------------------------ presenters -------------------------------- */

function Stat({
  value,
  hint,
  tone,
}: {
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "default" | "destructive";
}) {
  return (
    <div>
      <p className={`text-3xl font-semibold tracking-tight ${tone === "destructive" ? "text-destructive" : ""}`}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

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
  /* ------------------------------ customers ------------------------------ */
  {
    id: "customers-new-leads",
    title: "New leads this week",
    surface: "customers",
    href: "/customers",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) =>
      demo ? (
        <Stat
          value={data.home.stats.newLeadsThisWeek}
          hint={
            data.home.stats.medianResponseSecs != null
              ? `every one answered in ~${data.home.stats.medianResponseSecs}s`
              : undefined
          }
        />
      ) : (
        <Fills>New leads land here the moment Lu answers your line.</Fills>
      ),
  },
  {
    id: "customers-follow-up",
    title: "Needs follow-up",
    surface: "customers",
    href: "/customers",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) =>
      demo && data.crm ? (
        <Stat value={data.crm.followUpCount} hint="leads gone quiet — Lu nudges them for you" />
      ) : (
        <Fills>Customers who go quiet show up here for a nudge.</Fills>
      ),
  },
  {
    id: "customers-recent",
    title: "Recent customers",
    surface: "customers",
    href: "/customers",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, data }) => {
      if (!demo || !data.crm || data.crm.recent.length === 0) {
        return <Fills>Your most recent customers will appear here.</Fills>;
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

  /* ------------------------------- schedule ------------------------------ */
  {
    id: "schedule-today",
    title: "Today's jobs",
    surface: "schedule",
    href: "/schedule",
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, data, organization }) => {
      const tz = orgTz(organization);
      const g = data.home.scheduleGlance;
      if (!demo || g.items.length === 0) {
        return <Fills>Estimates and jobs Lu books land on your calendar here.</Fills>;
      }
      return (
        <ol className="flex flex-col">
          {g.items.map((item, i) => (
            <li key={item.id} className="relative flex gap-3 pb-3 last:pb-0">
              {i < g.items.length - 1 && (
                <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
              )}
              <span className="mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary bg-background" />
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
    id: "schedule-week",
    title: "Booked this week",
    surface: "schedule",
    href: "/schedule",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) =>
      demo ? (
        <Stat value={data.home.stats.bookedThisWeek} hint="estimates + jobs on the calendar" />
      ) : (
        <Fills>Bookings this week tally here as Lu fills your calendar.</Fills>
      ),
  },
  {
    id: "schedule-next-route",
    title: "Next job + route",
    surface: "schedule",
    href: "/schedule",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, data, organization }) => {
      const tz = orgTz(organization);
      const g = data.home.scheduleGlance;
      const next = g.items[0];
      if (!demo || !next) {
        return <Fills>Your next job and its drive route will show here.</Fills>;
      }
      return (
        <div className="flex flex-col gap-1">
          {next.contactId ? (
            <Link
              href={`/customers/${next.contactId}`}
              className="text-sm font-medium underline-offset-2 hover:underline"
            >
              {formatTime(next.startAt, tz)} · {next.name}
            </Link>
          ) : (
            <p className="text-sm font-medium">
              {formatTime(next.startAt, tz)} · {next.name}
            </p>
          )}
          {next.town && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3" /> {next.town}
            </p>
          )}
          {g.routeNote && <p className="mt-1 text-xs text-primary">{g.routeNote}</p>}
        </div>
      );
    },
  },

  /* -------------------------------- money -------------------------------- */
  {
    id: "money-outstanding",
    title: "Outstanding",
    surface: "money",
    href: "/money",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) => {
      const owed = data.home.stats.owedCents;
      if (!demo || !owed) return <Fills>Unpaid invoices total here once you're billing.</Fills>;
      return <Stat value={formatCents(owed)} hint="across open invoices" />;
    },
  },
  {
    id: "money-overdue",
    title: "Overdue",
    surface: "money",
    href: "/money",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) => {
      const overdue = data.home.stats.overdueCents;
      if (!demo || !overdue) return <Fills>Overdue invoices Lu is chasing appear here.</Fills>;
      return <Stat tone="destructive" value={formatCents(overdue)} hint="past due — Lu is chasing it" />;
    },
  },
  {
    id: "money-paid",
    title: "Paid this month",
    surface: "money",
    href: "/money",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) => {
      const rev = data.headline?.find((h) => h.key === "revenue");
      if (!demo || !rev) return <Fills>Money collected this month shows here.</Fills>;
      return (
        <Stat
          value={rev.value}
          hint={rev.delta ? `▲ ${rev.delta.pct}% vs last period` : "collected this month"}
        />
      );
    },
  },

  /* -------------------------------- agents ------------------------------- */
  {
    id: "agents-receptionist",
    title: "Receptionist activity",
    surface: "agents",
    href: "/agents",
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 3, h: 3 },
    // Self-gating: ActivityDigest shows its own empty state when Lu has no actions.
    render: () => <ActivityDigest />,
  },
  {
    id: "agents-reviews",
    title: "Reviews collected",
    surface: "agents",
    href: "/reviews",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) => {
      const collected = data.home.stats.reviewsCollected;
      if (!demo || !collected) return <Fills>Reviews Lu collects and your rating show here.</Fills>;
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

  /* ------------------------------- reports ------------------------------- */
  {
    id: "reports-funnel",
    title: "Leads funnel",
    surface: "reports",
    href: "/analytics",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 3 },
    render: ({ demo, data }) => {
      if (!demo || !data.funnel) {
        return <Fills>Your leads-to-paid funnel builds here as work flows through.</Fills>;
      }
      const stages = data.funnel.stages.filter((s) => s.key !== "visits");
      const max = Math.max(...stages.map((s) => s.count), 1);
      return (
        <ul className="flex flex-col gap-1.5">
          {stages.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-xs">
              <span className="w-20 shrink-0 truncate text-muted-foreground">{s.label}</span>
              <span
                className="h-2 rounded-full bg-primary/70"
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
    id: "reports-revenue",
    title: "Revenue trend",
    surface: "reports",
    href: "/analytics",
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, data }) => {
      const s = data.series?.find((x) => x.key === "revenue");
      if (!demo || !s || s.points.length === 0) {
        return <Fills>Revenue trend charts here once money's moving.</Fills>;
      }
      const vals = s.points.map((p) => p.v);
      const max = Math.max(...vals, 1);
      const last = vals[vals.length - 1] ?? 0;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold tracking-tight">{formatCents(last)}</p>
          <div className="flex h-12 items-end gap-1">
            {vals.map((v, i) => (
              <span
                key={i}
                className="flex-1 rounded-sm bg-primary/60"
                style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">collected by month</p>
        </div>
      );
    },
  },
  {
    id: "reports-response-time",
    title: "Response time",
    surface: "reports",
    href: "/analytics",
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
    render: ({ demo, data }) => {
      const r = data.responseTime;
      if (!demo || !r) return <Fills>Lu's answer speed will report here.</Fills>;
      return (
        <div className="flex flex-col gap-1">
          <p className="text-3xl font-semibold tracking-tight">{r.medianSeconds}s</p>
          <p className="text-xs text-muted-foreground">median · p90 {r.p90Seconds}s</p>
          <span className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${FAMILY_CHIP.emerald}`}>
            {Math.round(r.withinTargetPct * 100)}% within {r.targetSeconds}s
          </span>
        </div>
      );
    },
  },
  {
    id: "reports-roi",
    title: "ROI headline",
    surface: "reports",
    href: "/analytics",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, data }) => {
      if (!demo || !data.headline) return <Fills>Your headline results summarize here.</Fills>;
      const keys = ["leads", "booked", "revenue"];
      const items = data.headline.filter((h) => keys.includes(h.key));
      return (
        <div className="grid grid-cols-3 gap-2">
          {items.map((h) => (
            <div key={h.key}>
              <p className="text-lg font-semibold tracking-tight">{h.value}</p>
              <p className="text-[11px] text-muted-foreground">{h.label}</p>
            </div>
          ))}
        </div>
      );
    },
  },

  /* ------------------------------- utility ------------------------------- */
  {
    id: "utility-line-status",
    title: "Everything's running",
    surface: "utility",
    href: "/settings",
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    render: ({ demo, organization }) => {
      const number = demo ? "(844) 415-7642" : (organization?.twilioNumber ?? "—");
      const status = (organization?.verificationStatus as string) ?? "pending";
      const chip = status === "verified" ? FAMILY_CHIP.emerald : status === "failed" ? FAMILY_CHIP.red : FAMILY_CHIP.blue;
      const label = status === "verified" ? "Verified" : status === "failed" ? "Needs attention" : "Verifying — live & sending";
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Lu is answering
            </span>
            <span className="font-medium">{number}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Your line</span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${chip}`}>{label}</span>
          </div>
        </div>
      );
    },
  },
];

/** Look up a widget definition by id. */
export function widgetById(id: string): WidgetDef | undefined {
  return WIDGETS.find((w) => w.id === id);
}

/**
 * A sensible starter board on the 12-column grid — the glance an owner wants
 * first: today's jobs, what's owed, new leads, what Lu's been up to.
 */
export const DEFAULT_DASHBOARD: DashItem[] = [
  { i: "schedule-today", x: 0, y: 0, w: 6, h: 3 },
  { i: "money-outstanding", x: 6, y: 0, w: 3, h: 2 },
  { i: "money-overdue", x: 9, y: 0, w: 3, h: 2 },
  { i: "customers-new-leads", x: 6, y: 2, w: 3, h: 2 },
  { i: "agents-reviews", x: 9, y: 2, w: 3, h: 2 },
  { i: "agents-receptionist", x: 0, y: 3, w: 6, h: 4 },
  { i: "reports-funnel", x: 6, y: 4, w: 6, h: 3 },
];
