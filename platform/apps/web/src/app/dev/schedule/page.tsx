"use client";

/** DEV-ONLY visual check for the Schedule calendar (public in development). */
import { APEX_BASE, APEX_POSTS, APEX_ROUTE_THURSDAY, APEX_SCHEDULE_ITEMS, APEX_SOCIAL_POSTS } from "@/lib/data/fixtures/apex";
import type { SchedulePost } from "@/lib/data/schedule/types";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import { PageHeader } from "@/components/app/PageHeader";
import { ScheduleClient } from "@/components/schedule/ScheduleClient";

const WINDOWS: AvailabilityWindow[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({ dayOfWeek, start: "08:00", end: "17:00" }));

const POSTS: SchedulePost[] = [
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

export default function DevSchedule() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-8">
      <PageHeader title="Schedule" description="Estimates and jobs on one calendar, in your timezone." />
      <ScheduleClient
        items={APEX_SCHEDULE_ITEMS}
        demo
        timezone="America/New_York"
        windows={WINDOWS}
        sync={{ state: "connected" }}
        routeFixture={APEX_ROUTE_THURSDAY}
        base={APEX_BASE}
        posts={POSTS}
      />
    </div>
  );
}
