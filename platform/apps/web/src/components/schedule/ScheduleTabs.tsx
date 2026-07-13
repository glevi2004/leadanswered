"use client";

import type { RoutePlan, ScheduleItem, CalendarSyncStatus, SchedulePost } from "@/lib/data/schedule/types";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleClient, type RouteBase } from "./ScheduleClient";
import { AvailabilityTab } from "./AvailabilityTab";

/** Calendar / Availability tabs (07-schedule §2). */
export function ScheduleTabs(props: {
  items: ScheduleItem[];
  demo: boolean;
  timezone: string;
  windows: AvailabilityWindow[];
  sync: CalendarSyncStatus;
  routeFixture: RoutePlan | null;
  base: RouteBase | null;
  /** The Posts layer (07 §2) — passed through to ScheduleClient. */
  posts?: SchedulePost[];
  /** deep link: /schedule?tab=availability (Settings cross-links here) */
  defaultTab?: "calendar" | "availability";
}) {
  return (
    <Tabs defaultValue={props.defaultTab ?? "calendar"}>
      <TabsList>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="availability">Availability</TabsTrigger>
      </TabsList>
      <TabsContent value="calendar" className="mt-4">
        <ScheduleClient {...props} />
      </TabsContent>
      <TabsContent value="availability" className="mt-4">
        <AvailabilityTab timezone={props.timezone} windows={props.windows} />
      </TabsContent>
    </Tabs>
  );
}
