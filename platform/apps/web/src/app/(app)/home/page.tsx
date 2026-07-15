import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { getHomeDataMock, getHomeDataReal } from "@/lib/data/home";
import { getFunnelMock, getHeadlineMock, getResponseTimeMock, getSeriesMock } from "@/lib/data/analytics";
import { APEX, APEX_CONTACTS } from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { NeedsYou } from "@/components/dashboard/NeedsYou";
import { WidgetBoard } from "@/components/dashboard/WidgetBoard";
import { DEFAULT_WIDGETS, type DashboardData } from "@/components/dashboard/widget-catalog";

function greeting(tz: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/**
 * Dashboard home — a pinned "Needs you" inbox above a customizable, drag/resize
 * widget board. Same shape for New and Mature orgs; only the data differs (New =
 * honest-empty via the real path against an empty org, Mature = Apex fixtures).
 */
export default async function HomePage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const isNew = organization.demoProfile === "new";
  const tz = demo ? APEX.timezone : organizationTz(organization);
  const ownerFirst = demo ? APEX.ownerName : ((organization.name as string)?.split(" ")[0] ?? "");

  const home = demo ? getHomeDataMock() : await getHomeDataReal(organization.id, tz);
  // A freshly-onboarded org has quotes/invoices/reviews live — show ZERO, not the
  // not-live-yet "soon" tiles the real (unbuilt-backend) path renders.
  if (isNew) {
    home.stats.quotesAwaiting ??= 0;
    home.stats.owedCents ??= 0;
    home.stats.reviewsCollected ??= 0;
  }

  // Analytics + CRM summaries feed the reports/customers widgets. Only the Apex
  // (demo) path has data; the New path passes empty variants — widgets render
  // honest-empty states from the `demo` flag regardless.
  const crm = demo
    ? {
        followUpCount: APEX_CONTACTS.filter((c) => c.stage === "qualifying").length,
        recent: [...APEX_CONTACTS]
          .sort((a, b) => (b.lastActivityAt || "").localeCompare(a.lastActivityAt || ""))
          .slice(0, 4)
          .map((c) => ({ id: c.id, name: c.name, town: c.town, stage: c.stage })),
      }
    : null;

  const data: DashboardData = demo
    ? {
        home,
        crm,
        funnel: getFunnelMock("30d"),
        headline: getHeadlineMock("30d"),
        responseTime: getResponseTimeMock("30d"),
        series: getSeriesMock("30d"),
      }
    : { home, crm: null, funnel: null, headline: null, responseTime: null, series: null };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={
          <>
            {greeting(tz)}, <span className="text-gradient-green">{ownerFirst}</span>
          </>
        }
        description="Here's where things stand."
      />

      {/* Zone A — cross-agent "Needs you" rollup (compiles every agent's workplace). */}
      <NeedsYou />

      {/* Zone B — the customizable widget board (layout persists to localStorage). */}
      <WidgetBoard key={organization.id} layout={DEFAULT_WIDGETS} ctx={{ organization, demo, data }} />
    </div>
  );
}
