import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { getRouteMock, listItemsMock, listItemsReal } from "@/lib/data/schedule";
import { APEX, APEX_BASE } from "@/lib/data/fixtures/apex";
import { getCalendarConnection } from "@/lib/calendar";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import { PageHeader } from "@/components/app/PageHeader";
import { ScheduleTabs } from "@/components/schedule/ScheduleTabs";

export const metadata = { title: "Schedule — Lead Answered" };

const APEX_WINDOWS: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: "08:00", end: "17:00" }));

export default async function SchedulePage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const tz = demo ? APEX.timezone : organizationTz(organization);
  const items = demo ? listItemsMock() : await listItemsReal(organization.id);
  const windows: AvailabilityWindow[] = demo
    ? APEX_WINDOWS
    : ((organization.standingAvailability?.windows as AvailabilityWindow[]) ?? []);
  const conn = await getCalendarConnection(organization.id).catch(() => null);
  const sync = { state: conn?.status === "connected" ? ("connected" as const) : ("not_connected" as const), email: conn?.email ?? undefined };
  const routeFixture = demo ? getRouteMock(items[0] ? items[0].startAt.slice(0, 10) : "") ?? null : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Schedule"
        description="Estimates and jobs on one calendar, in your timezone."
      />
      <ScheduleTabs items={items} demo={demo} timezone={tz} windows={windows} sync={sync} routeFixture={routeFixture} base={demo ? APEX_BASE : null} />
    </div>
  );
}
