"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { RoutePlan, ScheduleItem, CalendarSyncStatus } from "@/lib/data/schedule/types";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import { cancelAppointmentAction, rescheduleAppointmentAction } from "@/app/(app)/schedule/actions";
import { apptStatusBadge, formatWhen, formatTime } from "@/lib/dashboard-ui";
import { SarahIcon } from "@/components/icons/sarah";
import { DataTable } from "@/components/app/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false });

export interface RouteBase { label: string; lat: number; lng: number }

/* ------------------------------ tz-local helpers ------------------------------ */

const DAY_MS = 86_400_000;

function localParts(iso: string, tz: string): { dateKey: string; minutes: number } {
  const d = new Date(iso);
  const dateKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { dateKey, minutes: (get("hour") % 24) * 60 + get("minute") };
}

function dateKeyOf(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** The 7 dates (Mon-first) of the week containing `anchor`, as local date keys + labels. */
function weekDays(anchor: Date, tz: string): { key: string; label: string; dow: number; isToday: boolean }[] {
  const todayKey = dateKeyOf(new Date(), tz);
  // find Monday: walk back from anchor until weekday is Mon (in tz)
  const dowOf = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d);
  const start = new Date(anchor);
  while (dowOf(start) !== "Mon") start.setTime(start.getTime() - DAY_MS);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start.getTime() + i * DAY_MS);
    return {
      key: dateKeyOf(d, tz),
      label: new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", day: "numeric" }).format(d),
      dow: (i + 1) % 7, // Mon=1 … Sun=0 (matches standingAvailability dayOfWeek)
      isToday: dateKeyOf(d, tz) === todayKey,
    };
  });
}

const hm = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

/** Open 60-min starts for a day: standing windows minus existing items. */
function openSlots(dateKey: string, dow: number, windows: AvailabilityWindow[], items: ScheduleItem[], tz: string): string[] {
  const busy = items
    .filter((i) => !i.allDay && localParts(i.startAt, tz).dateKey === dateKey && !["cancelled"].includes(i.status))
    .map((i) => {
      const s = localParts(i.startAt, tz).minutes;
      return [s, s + 60] as const;
    });
  const out: string[] = [];
  for (const w of windows.filter((w) => w.dayOfWeek === dow)) {
    for (let t = hm(w.start); t + 60 <= hm(w.end); t += 30) {
      if (!busy.some(([bs, be]) => t < be && t + 60 > bs)) {
        out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
      }
    }
  }
  return out.slice(0, 10);
}

/** Synthetic preview route for real orgs: ≈ legs over the day's located stops. */
function synthesizeRoute(dateKey: string, stops: ScheduleItem[]): RoutePlan | null {
  if (stops.length < 2) return null;
  const legs = [
    { from: "base", to: stops[0].id, driveMinutes: 18, miles: 7.1, approx: true },
    ...stops.slice(1).map((s, i) => ({ from: stops[i].id, to: s.id, driveMinutes: 22, miles: 8.3, approx: true })),
    { from: stops[stops.length - 1].id, to: "base", driveMinutes: 18, miles: 7.4, approx: true },
  ];
  return {
    date: dateKey,
    baseLabel: "Base",
    stopIds: stops.map((s) => s.id),
    legs,
    gaps: [],
    bufferMinutes: 10,
    totalDriveMinutes: legs.reduce((a, l) => a + l.driveMinutes, 0),
    totalMiles: Math.round(legs.reduce((a, l) => a + l.miles, 0) * 10) / 10,
  };
}

/* --------------------------------- component ---------------------------------- */

const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_PX = 44;

export function ScheduleClient({
  items,
  demo,
  timezone,
  windows,
  sync,
  routeFixture,
  base,
}: {
  items: ScheduleItem[];
  demo: boolean;
  timezone: string;
  windows: AvailabilityWindow[];
  sync: CalendarSyncStatus;
  routeFixture: RoutePlan | null;
  base: RouteBase | null;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<"week" | "day" | "list">("week");
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [dayKey, setDayKey] = React.useState(() => dateKeyOf(new Date(), timezone));
  const [sheetItem, setSheetItem] = React.useState<ScheduleItem | null>(null);

  const days = weekDays(anchor, timezone);
  const timed = items.filter((i) => !i.allDay);
  const banners = items.filter((i) => i.allDay);

  const itemsOn = (key: string) =>
    timed
      .filter((i) => localParts(i.startAt, timezone).dateKey === key && i.status !== "cancelled")
      .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const routeFor = (key: string): RoutePlan | null => {
    if (demo && routeFixture?.date === key) return routeFixture;
    return synthesizeRoute(key, itemsOn(key).filter((i) => i.town || i.address));
  };

  const openDay = (key: string) => {
    setDayKey(key);
    setView("day");
  };

  const rangeLabel = `${days[0].label} – ${days[6].label}`;

  /* ------------------------------- list columns ------------------------------- */
  const columns = React.useMemo<ColumnDef<ScheduleItem, unknown>[]>(
    () => [
      { header: "When", accessorKey: "startAt", cell: ({ getValue }) => formatWhen(String(getValue()), timezone) },
      {
        header: "Contact",
        accessorKey: "contactName",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 font-medium">
            {row.original.bookedBy === "sarah" && <SarahIcon className="size-3 text-muted-foreground" />}
            {row.original.contactName}
          </span>
        ),
      },
      { header: "Kind", accessorKey: "kind", cell: ({ getValue }) => <span className="capitalize text-muted-foreground">{String(getValue())}</span> },
      {
        header: "Town",
        accessorKey: "town",
        cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue() ?? "—")}</span>,
        meta: { headClass: "hidden md:table-cell", cellClass: "hidden md:table-cell" },
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => {
          const b = apptStatusBadge(String(getValue()));
          return <Badge variant={b.variant}>{b.label}</Badge>;
        },
      },
    ],
    [timezone],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setAnchor((a) => new Date(a.getTime() - 7 * DAY_MS))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setAnchor((a) => new Date(a.getTime() + 7 * DAY_MS))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setAnchor(new Date()); setDayKey(dateKeyOf(new Date(), timezone)); }}>
            Today
          </Button>
        </div>
        <span className="text-sm font-medium">{rangeLabel}</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex rounded-lg border p-0.5">
            {(["week", "day", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn("rounded-md px-2.5 py-1 text-xs capitalize", view === v ? "bg-muted font-medium" : "text-muted-foreground")}
              >
                {v}
              </button>
            ))}
          </div>
          <SyncChip sync={sync} />
        </div>
      </div>

      {view === "week" && (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          {/* all-day banners */}
          {banners.length > 0 && (
            <div className="flex gap-2 border-b px-14 py-2">
              {banners.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSheetItem(b)}
                  className="truncate rounded-lg bg-muted px-2.5 py-1 text-xs font-medium hover:bg-muted/70"
                >
                  Job — {b.contactName}
                </button>
              ))}
            </div>
          )}
          <div className="grid min-w-[760px]" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
            <div />
            {days.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => openDay(d.key)}
                className={cn("border-b border-l px-2 py-1.5 text-left text-xs font-medium hover:bg-muted/50", d.isToday && "text-foreground", !d.isToday && "text-muted-foreground")}
              >
                {d.label}
                {d.isToday && <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] text-background">today</span>}
              </button>
            ))}
            {/* time gutter + day columns */}
            <div className="relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_PX }}>
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                <div key={i} className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: i * HOUR_PX }}>
                  {i + HOUR_START <= 12 ? `${i + HOUR_START}a` : `${i + HOUR_START - 12}p`}
                </div>
              ))}
            </div>
            {days.map((d) => {
              const dayWindows = windows.filter((w) => w.dayOfWeek === d.dow);
              return (
                <div key={d.key} className="relative border-l" style={{ height: (HOUR_END - HOUR_START) * HOUR_PX }}>
                  {/* dim off-availability */}
                  <div className="absolute inset-0 bg-muted/50" />
                  {dayWindows.map((w, i) => {
                    const top = ((hm(w.start) - HOUR_START * 60) / 60) * HOUR_PX;
                    const h = ((hm(w.end) - hm(w.start)) / 60) * HOUR_PX;
                    return <div key={i} className="absolute inset-x-0 bg-card" style={{ top: Math.max(0, top), height: h }} />;
                  })}
                  {/* hour lines */}
                  {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                    <div key={i} className="absolute inset-x-0 border-t border-border/50" style={{ top: i * HOUR_PX }} />
                  ))}
                  {/* items */}
                  {itemsOn(d.key).map((item) => {
                    const start = localParts(item.startAt, timezone).minutes;
                    const end = localParts(item.endAt, timezone).minutes;
                    const top = ((start - HOUR_START * 60) / 60) * HOUR_PX;
                    const h = Math.max(24, ((end - start) / 60) * HOUR_PX);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSheetItem(item)}
                        className="absolute inset-x-0.5 z-10 overflow-hidden rounded-md border bg-background px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-xs hover:border-foreground/40"
                        style={{ top, height: h }}
                      >
                        <span className="flex items-center gap-1 font-medium">
                          {item.bookedBy === "sarah" && <SarahIcon className="size-2.5 shrink-0" />}
                          {formatTime(item.startAt, timezone)}
                        </span>
                        <span className="block truncate text-muted-foreground">{item.contactName}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "day" && (
        <DayView
          dayKey={dayKey}
          setDayKey={setDayKey}
          items={itemsOn(dayKey)}
          route={routeFor(dayKey)}
          timezone={timezone}
          onOpen={setSheetItem}
          base={base}
        />
      )}

      {view === "list" && (
        <DataTable
          columns={columns}
          data={[...items].sort((a, b) => b.startAt.localeCompare(a.startAt))}
          searchPlaceholder="Search contact, town…"
          searchFn={(i, q) => i.contactName.toLowerCase().includes(q) || (i.town ?? "").toLowerCase().includes(q)}
          onRowClick={setSheetItem}
        />
      )}

      <ItemSheet
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        demo={demo}
        timezone={timezone}
        windows={windows}
        allItems={items}
        onGoToContact={(id) => router.push(`/crm/${id}`)}
      />
    </div>
  );
}

/* ---------------------------------- day view ---------------------------------- */

function DayView({
  dayKey,
  setDayKey,
  items,
  route,
  timezone,
  onOpen,
  base,
}: {
  dayKey: string;
  setDayKey: (k: string) => void;
  items: ScheduleItem[];
  route: RoutePlan | null;
  timezone: string;
  onOpen: (i: ScheduleItem) => void;
  base: RouteBase | null;
}) {
  const shift = (dir: 1 | -1) => {
    const d = new Date(`${dayKey}T12:00:00`);
    d.setTime(d.getTime() + dir * DAY_MS);
    setDayKey(d.toISOString().slice(0, 10));
  };
  const title = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long", month: "short", day: "numeric" }).format(
    new Date(`${dayKey}T12:00:00`),
  );

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border bg-card p-4 lg:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 px-1.5" onClick={() => shift(-1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-1.5" onClick={() => shift(1)}>
            <ChevronRight className="size-4" />
          </Button>
          <h2 className="text-sm font-semibold">{title}</h2>
          {route && (
            <span className="ml-auto text-xs text-muted-foreground">
              {route.stopIds.length} stops · {route.totalDriveMinutes} min driving · {route.totalMiles} mi
            </span>
          )}
        </div>
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing booked — Sarah keeps this day open.</p>
        ) : (
          <ol className="flex flex-col">
            {items.map((item, i) => {
              const leg = route?.legs[i + 1];
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/50"
                  >
                    <span className="w-14 shrink-0 pt-0.5 text-sm font-medium">{formatTime(item.startAt, timezone)}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm font-medium">
                        {item.bookedBy === "sarah" && <SarahIcon className="size-3 text-muted-foreground" />}
                        {item.kind === "estimate" ? "Estimate" : "Job"} — {item.contactName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" /> {item.address ?? item.town ?? "—"}
                      </span>
                    </span>
                  </button>
                  {i < items.length - 1 && leg && (
                    <p className="py-1 pl-16 text-[11px] text-muted-foreground">
                      ▤ drive {leg.approx ? "≈" : ""}{leg.driveMinutes} min · {leg.miles} mi
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Route</h3>
          <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
            Preview
          </span>
        </div>
        {!route ? (
          <p className="mt-3 text-sm text-muted-foreground">The route rail appears on days with 2+ located stops.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-0.5 text-sm">
            <li className="text-muted-foreground">⌂ {route.baseLabel}</li>
            {route.stopIds.map((id, i) => {
              const item = items.find((x) => x.id === id);
              const leg = route.legs[i];
              return (
                <React.Fragment key={id}>
                  <li className="pl-3 text-[11px] text-muted-foreground">
                    │ drive {leg?.approx ? "≈" : ""}{leg?.driveMinutes} min · {leg?.miles} mi
                  </li>
                  <li className="font-medium">
                    {i + 1}. {item ? `${formatTime(item.startAt, timezone)} ${item.contactName}` : id}
                    <span className="text-muted-foreground"> — {item?.town}</span>
                  </li>
                </React.Fragment>
              );
            })}
            <li className="pl-3 text-[11px] text-muted-foreground">
              │ drive {route.legs.at(-1)?.approx ? "≈" : ""}{route.legs.at(-1)?.driveMinutes} min · {route.legs.at(-1)?.miles} mi
            </li>
            <li className="text-muted-foreground">⌂ back at base</li>
            {route.gaps.map((g) => (
              <li key={g.label} className="mt-1 rounded-md bg-muted/60 px-2 py-1 text-xs text-muted-foreground">
                ▒ {g.label} — {g.usable ? "fits a visit" : "too short for an estimate; Sarah keeps it"}
              </li>
            ))}
            <li className="mt-2 text-xs text-muted-foreground">Buffer: {route.bufferMinutes} min/stop</li>
            <li className="mt-2">
              {(() => {
                const located = route.stopIds
                  .map((id, i) => ({ item: items.find((x) => x.id === id), n: i + 1 }))
                  .filter((x): x is { item: ScheduleItem; n: number } => !!x.item && x.item.lat != null && x.item.lng != null);
                if (located.length === 0)
                  return (
                    <span className="flex h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                      map appears when stops have locations
                    </span>
                  );
                const stops = [
                  ...(base ? [{ id: "base", lat: base.lat, lng: base.lng, label: "\u2302", title: base.label }] : []),
                  ...located.map(({ item, n }) => ({ id: item.id, lat: item.lat!, lng: item.lng!, label: String(n), title: item.contactName })),
                ];
                return <RouteMap stops={stops} />;
              })()}
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- sync chip ---------------------------------- */

function SyncChip({ sync }: { sync: CalendarSyncStatus }) {
  if (sync.state === "connected") {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <RefreshCw className="size-3" /> Google: synced ✓
      </span>
    );
  }
  return (
    <Link href="/settings" className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline">
      <RefreshCw className="size-3" /> Google: not connected · Connect
    </Link>
  );
}

/* --------------------------------- item sheet --------------------------------- */

function ItemSheet({
  item,
  onClose,
  demo,
  timezone,
  windows,
  allItems,
  onGoToContact,
}: {
  item: ScheduleItem | null;
  onClose: () => void;
  demo: boolean;
  timezone: string;
  windows: AvailabilityWindow[];
  allItems: ScheduleItem[];
  onGoToContact: (id: string) => void;
}) {
  const [rescheduling, setRescheduling] = React.useState(false);
  const [pickDate, setPickDate] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    setRescheduling(false);
    setPickDate("");
  }, [item?.id]);

  if (!item) return null;
  const b = apptStatusBadge(item.status);

  const slots = pickDate
    ? openSlots(pickDate, new Date(`${pickDate}T12:00:00`).getDay(), windows, allItems, timezone)
    : [];

  const doCancel = async () => {
    if (!window.confirm(`Cancel ${item.contactName}? Sarah will draft the customer notice for your OK.`)) return;
    setBusy(true);
    if (demo || item.kind === "job") {
      toast.success("Cancelled", { description: "Sarah drafted the customer notice — check your approvals." });
    } else {
      const res = await cancelAppointmentAction(item.id);
      res.ok ? toast.success("Cancelled — Sarah will ask before texting the customer.") : toast.error("Couldn't cancel — try again.");
    }
    setBusy(false);
    onClose();
  };

  const doReschedule = async (slot: string) => {
    setBusy(true);
    const newStartIso = new Date(`${pickDate}T${slot}:00`).toISOString();
    if (demo || item.kind === "job") {
      toast.success(`Moved to ${pickDate} ${slot}`, { description: "Sarah drafted the customer notice — check your approvals." });
    } else {
      const res = await rescheduleAppointmentAction(item.id, newStartIso);
      res.ok ? toast.success("Rescheduled — Sarah will ask before texting the customer.") : toast.error("That time didn't work — pick another.");
    }
    setBusy(false);
    onClose();
  };

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {item.kind === "estimate" ? "Estimate" : "Job"} — {item.contactName}
            <Badge variant={b.variant}>{b.label}</Badge>
          </SheetTitle>
          <SheetDescription>{formatWhen(item.startAt, timezone)}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 text-sm">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="size-3.5" /> {item.address ?? item.town ?? "No address yet"}
          </p>
          {item.bookedBy === "sarah" && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <SarahIcon className="size-3.5" /> Booked by Sarah
              {item.contactId && (
                <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => onGoToContact(item.contactId!)}>
                  see the conversation
                </button>
              )}
            </p>
          )}
          {item.notes && <p className="text-muted-foreground">{item.notes}</p>}
          {item.syncState === "push_failed" && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Didn't reach Google Calendar — the booking is still valid here.</p>
          )}

          {(item.address || item.town) && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address ?? item.town ?? "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Get directions ↗
            </a>
          )}

          {!rescheduling ? (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRescheduling(true)} disabled={busy}>
                <CalendarDays className="size-3.5" /> Reschedule
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={doCancel} disabled={busy}>
                <X className="size-3.5" /> Cancel visit
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2 rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Pick a new time — Sarah tells {item.contactName.split(" ")[0]} after your OK.</p>
              <input
                type="date"
                value={pickDate}
                onChange={(e) => setPickDate(e.target.value)}
                className="h-9 rounded-lg border bg-background px-2 text-sm outline-none focus:border-ring"
              />
              {pickDate && (
                <div className="flex flex-wrap gap-1.5">
                  {slots.length === 0 && <p className="text-xs text-muted-foreground">No open times that day.</p>}
                  {slots.map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={busy}
                      onClick={() => doReschedule(s)}
                      className="rounded-full border px-2.5 py-1 text-xs hover:border-foreground/40 hover:bg-muted"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <Button size="sm" variant="ghost" className="self-start text-muted-foreground" onClick={() => setRescheduling(false)}>
                Never mind
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
