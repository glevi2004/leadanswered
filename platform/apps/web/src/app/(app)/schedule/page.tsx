import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { getRouteMock, listItemsMock, listItemsReal } from "@/lib/data/schedule";
import type { SchedulePost } from "@/lib/data/schedule/types";
import { APEX, APEX_BASE, APEX_POSTS, APEX_SOCIAL_POSTS } from "@/lib/data/fixtures/apex";
import { getCalendarConnection } from "@/lib/calendar";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import { PageHeader } from "@/components/app/PageHeader";
import { ScheduleTabs } from "@/components/schedule/ScheduleTabs";

export const metadata = { title: "Schedule — Lead Answered" };

const APEX_WINDOWS: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: "08:00", end: "17:00" }));

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const organization = await requireOrganization();
  const { tab } = await searchParams;
  const demo = await isDemoMode();
  const tz = demo ? APEX.timezone : organizationTz(organization);
  const items = demo ? listItemsMock() : await listItemsReal(organization.id);
  const windows: AvailabilityWindow[] = demo
    ? APEX_WINDOWS
    : ((organization.standingAvailability?.windows as AvailabilityWindow[]) ?? []);
  const conn = await getCalendarConnection(organization.id).catch(() => null);
  const sync = { state: conn?.status === "connected" ? ("connected" as const) : ("not_connected" as const), email: conn?.email ?? undefined };
  const routeFixture = demo ? (items.map((i) => getRouteMock(i.startAt.slice(0, 10))).find(Boolean) ?? null) : null;

  // The Posts layer (07 §2): content projected onto the calendar, gated with its module.
  const contentStatus = resolveModuleStatus(organization, "content", demo);
  const posts: SchedulePost[] =
    contentStatus === "coming_soon" || contentStatus === "hidden"
      ? []
      : [
          ...APEX_POSTS.filter((p) => p.publishedAt || p.scheduledFor).map((p) => ({
            id: p.id,
            title: p.title,
            at: (p.status === "scheduled" ? p.scheduledFor : p.publishedAt)!,
            kind: "post" as const,
            status: p.status,
            href: `/content/${p.id}`,
          })),
          ...APEX_SOCIAL_POSTS.filter((s) => s.postedAt || s.scheduledFor).map((s) => ({
            id: s.id,
            title: `Facebook — ${s.body.slice(0, 40)}…`,
            at: (s.postedAt ?? s.scheduledFor)!,
            kind: "social_post" as const,
            status: s.status,
            href: `/content/${s.id}`,
          })),
        ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Schedule"
        description="Estimates and jobs on one calendar, in your timezone."
      />
      <ScheduleTabs items={items} demo={demo} timezone={tz} windows={windows} sync={sync} routeFixture={routeFixture} base={demo ? APEX_BASE : null} posts={posts} defaultTab={tab === "availability" ? "availability" : "calendar"} />
    </div>
  );
}
