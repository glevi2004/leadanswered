"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { RoutePlan, ScheduleItem, ScheduleItemKind, CalendarSyncStatus, SchedulePost } from "@/lib/data/schedule/types";
import { KIND_META } from "@/components/app/ApprovalCard";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import {
  cancelAppointmentAction,
  rescheduleAppointmentAction,
  markAppointmentOutcomeAction,
} from "@/app/(app)/schedule/actions";
import { statusChip, formatWhen, formatTime } from "@/lib/dashboard-ui";
import { SarahIcon } from "@/components/icons/sarah";
import { DataTable } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
const pad = (n: number) => String(n).padStart(2, "0");
/** 570 → "9:30a" */
const fmtMin = (min: number) => {
  const h = Math.floor(min / 60), m = min % 60, h12 = h % 12 || 12;
  return `${h12}${m ? ":" + pad(m) : ""}${h < 12 ? "a" : "p"}`;
};
/** Local-wall-clock ISO for a date key + minutes (same convention as the reschedule picker). */
const localIso = (dateKey: string, min: number) =>
  new Date(`${dateKey}T${pad(Math.floor(min / 60))}:${pad(min % 60)}:00`).toISOString();

/** Open 60-min starts for a day: standing windows minus existing items. */
function openSlots(dateKey: string, dow: number, windows: AvailabilityWindow[], items: ScheduleItem[], tz: string): string[] {
  const busy = items
    .filter((i) => !i.allDay && localParts(i.startAt, tz).dateKey === dateKey && !["cancelled"].includes(i.status))
    .map((i) => {
      const s = localParts(i.startAt, tz).minutes;
      return [s, Math.max(s + 60, localParts(i.endAt, tz).minutes)] as const;
    });
  const out: string[] = [];
  for (const w of windows.filter((w) => w.dayOfWeek === dow)) {
    for (let t = hm(w.start); t + 60 <= hm(w.end); t += 30) {
      if (!busy.some(([bs, be]) => t < be && t + 60 > bs)) {
        out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);
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

/* ------------------------- kind identity + status looks ------------------------ */

const KIND_LABEL: Record<ScheduleItemKind, string> = { estimate: "Estimate", job: "Job", block: "Blocked time" };

/** "Dana Miller · roof replacement" — name + optional job descriptor (kept separate in the data). */
const displayName = (i: ScheduleItem) => (i.label ? `${i.contactName} · ${i.label}` : i.contactName);

/** Calendar-block tints: kind = identity hue (estimate blue · job violet · block hatched gray). */
function itemLook(item: ScheduleItem): { className: string; style?: React.CSSProperties } {
  const past = new Date(item.endAt).getTime() < Date.now();
  if (item.kind === "block") {
    return {
      className: "border-border bg-muted text-muted-foreground",
      style: { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 5px, color-mix(in oklab, var(--foreground) 8%, transparent) 5px 6px)" },
    };
  }
  if (item.status === "no_show") return { className: "border-red-300 bg-red-500/10 opacity-70 dark:border-red-800" };
  const tint = item.kind === "job" ? "border-violet-300 bg-violet-500/10 dark:border-violet-800" : "border-blue-300 bg-blue-500/10 dark:border-blue-800";
  return {
    className: cn(tint, item.status === "proposed" && "border-dashed opacity-80", past && "opacity-55"),
  };
}

/* --------------------------- overlap lanes (side-by-side) ---------------------- */

function layoutLanes(items: ScheduleItem[], tz: string): Map<string, { lane: number; cols: number }> {
  const evs = items
    .map((i) => {
      const s = localParts(i.startAt, tz).minutes;
      return { id: i.id, s, e: Math.max(localParts(i.endAt, tz).minutes, s + 30) };
    })
    .sort((a, b) => a.s - b.s || a.e - b.e);
  const out = new Map<string, { lane: number; cols: number }>();
  let laneEnds: number[] = [];
  let cluster: typeof evs = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = Math.max(...cluster.map((c) => out.get(c.id)!.lane)) + 1;
    cluster.forEach((c) => (out.get(c.id)!.cols = cols));
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };
  for (const ev of evs) {
    if (cluster.length && ev.s >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= ev.s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(ev.e); } else laneEnds[lane] = ev.e;
    out.set(ev.id, { lane, cols: 1 });
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.e);
  }
  if (cluster.length) flush();
  return out;
}

/* ----------------------------------- now-line ---------------------------------- */

function useNowInfo(tz: string): { key: string; minutes: number } {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, []);
  const n = new Date();
  return { key: dateKeyOf(n, tz), minutes: localParts(n.toISOString(), tz).minutes };
}

/* --------------------------------- component ---------------------------------- */

const HOUR_START = 7;
const HOUR_END = 19;
const HOUR_PX = 44;
const SNAP = 30;

type ViewKey = "week" | "day" | "month" | "list";

type DragState = {
  mode: "move" | "resize" | "create";
  id?: string;
  dayIdx: number;
  startMin: number;
  endMin: number;
  grabOffsetMin: number;
  anchorMin: number; // create: the fixed edge
  x0: number;
  y0: number;
  moved: boolean;
};

type CreateDraft = { dateKey: string; startMin: number; endMin: number };

export function ScheduleClient({
  items,
  demo,
  timezone,
  windows,
  sync,
  routeFixture,
  base,
  posts,
}: {
  items: ScheduleItem[];
  demo: boolean;
  timezone: string;
  windows: AvailabilityWindow[];
  sync: CalendarSyncStatus;
  routeFixture: RoutePlan | null;
  base: RouteBase | null;
  /** The Posts layer (07 §2): content items overlaid on the calendar. */
  posts?: SchedulePost[];
}) {
  const router = useRouter();
  const [view, setView] = React.useState<ViewKey>("week");
  // Posts layer toggle — ON by default, persisted (07 §2).
  const [showPosts, setShowPosts] = React.useState(true);
  React.useEffect(() => {
    if (window.localStorage.getItem("schedule_show_posts") === "0") setShowPosts(false);
  }, []);
  const togglePosts = () => {
    setShowPosts((v) => {
      window.localStorage.setItem("schedule_show_posts", v ? "0" : "1");
      return !v;
    });
  };
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [dayKey, setDayKey] = React.useState(() => dateKeyOf(new Date(), timezone));
  const [sheetItem, setSheetItem] = React.useState<ScheduleItem | null>(null);
  const [localItems, setLocalItems] = React.useState(items);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [draft, setDraft] = React.useState<CreateDraft | null>(null);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setLocalItems(items), [items]);

  const now = useNowInfo(timezone);
  const days = weekDays(anchor, timezone);

  const updateItem = (id: string, patch: Partial<ScheduleItem>) =>
    setLocalItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id: string) => setLocalItems((prev) => prev.filter((i) => i.id !== id));

  /* while dragging, show the dragged item at its candidate position */
  const displayed = React.useMemo(() => {
    if (!drag || drag.mode === "create" || !drag.moved || !drag.id) return localItems;
    const key = days[drag.dayIdx].key;
    return localItems.map((i) =>
      i.id === drag.id ? { ...i, startAt: localIso(key, drag.startMin), endAt: localIso(key, drag.endMin) } : i,
    );
  }, [localItems, drag, days]);

  const timed = displayed.filter((i) => !i.allDay);
  const banners = displayed.filter((i) => i.allDay);

  const itemsOn = (key: string) =>
    timed
      .filter((i) => localParts(i.startAt, timezone).dateKey === key && i.status !== "cancelled")
      .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const activePosts = showPosts ? (posts ?? []) : [];
  const postsOn = (key: string) => activePosts.filter((p) => localParts(p.at, timezone).dateKey === key);

  const routeFor = (key: string): RoutePlan | null => {
    if (demo && routeFixture?.date === key) return routeFixture;
    return synthesizeRoute(key, itemsOn(key).filter((i) => i.town || i.address));
  };

  const openDay = (key: string) => {
    setDayKey(key);
    setView("day");
  };

  /* --------------------------- drag geometry + commit --------------------------- */

  const locate = (clientX: number, clientY: number, snap: "round" | "floor" = "round") => {
    const el = bodyRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const gutter = 48; // 3rem time gutter
    const colW = (r.width - gutter) / 7;
    const dayIdx = Math.min(6, Math.max(0, Math.floor((clientX - r.left - gutter) / colW)));
    const raw = HOUR_START * 60 + ((clientY - r.top) / HOUR_PX) * 60;
    const snapped = (snap === "floor" ? Math.floor(raw / SNAP) : Math.round(raw / SNAP)) * SNAP;
    return { dayIdx, min: Math.min(HOUR_END * 60, Math.max(HOUR_START * 60, snapped)) };
  };

  const beginMove = (e: React.PointerEvent, item: ScheduleItem) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const loc = locate(e.clientX, e.clientY);
    if (!loc) return;
    const s = localParts(item.startAt, timezone).minutes;
    const en = Math.max(localParts(item.endAt, timezone).minutes, s + SNAP);
    setDrag({ mode: "move", id: item.id, dayIdx: loc.dayIdx, startMin: s, endMin: en, grabOffsetMin: loc.min - s, anchorMin: 0, x0: e.clientX, y0: e.clientY, moved: false });
  };

  const beginResize = (e: React.PointerEvent, item: ScheduleItem) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const loc = locate(e.clientX, e.clientY);
    if (!loc) return;
    const s = localParts(item.startAt, timezone).minutes;
    const en = Math.max(localParts(item.endAt, timezone).minutes, s + SNAP);
    setDrag({ mode: "resize", id: item.id, dayIdx: loc.dayIdx, startMin: s, endMin: en, grabOffsetMin: 0, anchorMin: s, x0: e.clientX, y0: e.clientY, moved: false });
  };

  const beginCreate = (e: React.PointerEvent, dayIdx: number) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("[data-cal-item]")) return;
    const loc = locate(e.clientX, e.clientY, "floor");
    if (!loc) return;
    setDrag({ mode: "create", dayIdx, startMin: loc.min, endMin: loc.min + SNAP, grabOffsetMin: 0, anchorMin: loc.min, x0: e.clientX, y0: e.clientY, moved: false });
  };

  React.useEffect(() => {
    if (!drag) return;
    const onMove = (ev: PointerEvent) => {
      const loc = locate(ev.clientX, ev.clientY);
      if (!loc) return;
      setDrag((d) => {
        if (!d) return d;
        const moved = d.moved || Math.abs(ev.clientX - d.x0) + Math.abs(ev.clientY - d.y0) > 5;
        if (d.mode === "move") {
          const dur = d.endMin - d.startMin;
          const ns = Math.min(HOUR_END * 60 - dur, Math.max(HOUR_START * 60, loc.min - d.grabOffsetMin));
          return { ...d, moved, dayIdx: loc.dayIdx, startMin: ns, endMin: ns + dur };
        }
        if (d.mode === "resize") {
          return { ...d, moved, endMin: Math.max(d.anchorMin + SNAP, loc.min) };
        }
        // create: drag either direction from the anchor
        return { ...d, moved, startMin: Math.min(d.anchorMin, loc.min), endMin: Math.max(d.anchorMin + SNAP, loc.min) };
      });
    };
    const onUp = () => {
      setDrag((d) => {
        if (!d) return null;
        if (d.mode === "create") {
          setDraft({ dateKey: days[d.dayIdx].key, startMin: d.startMin, endMin: d.moved ? d.endMin : d.startMin + 60 });
          return null;
        }
        const item = localItems.find((i) => i.id === d.id);
        if (!item) return null;
        if (!d.moved) {
          if (d.mode === "move") setSheetItem(item);
          return null;
        }
        const key = days[d.dayIdx].key;
        if (d.mode === "resize") {
          updateItem(item.id, { endAt: localIso(localParts(item.startAt, timezone).dateKey, d.endMin) });
          toast.success("Duration updated.");
          return null;
        }
        // move
        const newStartIso = localIso(key, d.startMin);
        const newEndIso = localIso(key, d.endMin);
        const prev = { startAt: item.startAt, endAt: item.endAt };
        updateItem(item.id, { startAt: newStartIso, endAt: newEndIso });
        const when = `${days[d.dayIdx].label} ${fmtMin(d.startMin)}`;
        if (!demo && item.kind === "estimate") {
          rescheduleAppointmentAction(item.id, newStartIso).then((res) => {
            if (res.ok) toast.success(`Moved to ${when} — Sarah will ask before texting the customer.`);
            else {
              updateItem(item.id, prev);
              toast.error("That move didn't stick — try again.");
            }
          });
        } else if (item.kind === "estimate") {
          toast.success(`Moved to ${when}`, { description: "Sarah drafted the customer notice — check your approvals." });
        } else {
          toast.success(`Moved to ${when}`);
        }
        return null;
      });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null, days.map((d) => d.key).join(), localItems, demo, timezone]);

  /* ------------------------------- toolbar helpers ------------------------------ */

  const shiftAnchor = (dir: 1 | -1) => {
    setAnchor((a) => {
      const d = new Date(a);
      if (view === "month") d.setMonth(d.getMonth() + dir);
      else d.setTime(d.getTime() + dir * 7 * DAY_MS);
      return d;
    });
  };

  const rangeLabel =
    view === "month"
      ? new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "long", year: "numeric" }).format(anchor)
      : `${days[0].label} – ${days[6].label}`;

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
          const c = statusChip(String(getValue()));
          return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", c.chip)}>{c.label}</span>;
        },
      },
    ],
    [timezone],
  );

  /* ------------------------------- week banners -------------------------------- */
  const weekKeys = days.map((d) => d.key);
  const weekBanners = banners
    .filter((b) => {
      const s = localParts(b.startAt, timezone).dateKey;
      const e = localParts(b.endAt, timezone).dateKey;
      return s <= weekKeys[6] && e >= weekKeys[0] && b.status !== "cancelled";
    })
    .map((b) => {
      const s = localParts(b.startAt, timezone).dateKey;
      const e = localParts(b.endAt, timezone).dateKey;
      return {
        item: b,
        startCol: s < weekKeys[0] ? 0 : weekKeys.indexOf(s),
        endCol: e > weekKeys[6] ? 6 : weekKeys.indexOf(e),
      };
    });

  return (
    <div className="flex flex-col gap-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => shiftAnchor(-1)} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => shiftAnchor(1)} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => { setAnchor(new Date()); setDayKey(dateKeyOf(new Date(), timezone)); }}>
            Today
          </Button>
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium hover:bg-muted">
            <CalendarDays className="size-3.5 text-muted-foreground" /> {rangeLabel}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={anchor}
              onSelect={(d) => {
                if (!d) return;
                setAnchor(d);
                setDayKey(dateKeyOf(d, timezone));
                setPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" className="h-8 gap-1" onClick={() => setDraft({ dateKey: dateKeyOf(new Date(), timezone), startMin: 9 * 60, endMin: 10 * 60 })}>
            <Plus className="size-3.5" /> New
          </Button>
          <div className="flex rounded-lg border p-0.5">
            {(["week", "day", "month", "list"] as const).map((v) => (
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
          {(posts?.length ?? 0) > 0 && (
            <button
              type="button"
              onClick={togglePosts}
              title="Show posts on the calendar"
              className={cn(
                "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
                showPosts ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="flex items-center -space-x-0.5" aria-hidden>
                <span className={cn("size-2 rounded-full", KIND_META.post.dot)} />
                <span className={cn("size-2 rounded-full ring-1 ring-background", KIND_META.social_post.dot)} />
              </span>
              Posts
            </button>
          )}
          <SyncChip sync={sync} />
        </div>
      </div>

      {view === "week" && (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <div className="min-w-[760px]">
            {/* all-day banners, spanning their real days */}
            {weekBanners.length > 0 && (
              <div className="grid gap-y-1 border-b py-1.5" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
                {weekBanners.map(({ item, startCol, endCol }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSheetItem(item)}
                    className="truncate rounded-lg border border-violet-300 bg-violet-500/10 px-2.5 py-1 text-left text-xs font-medium hover:opacity-80 dark:border-violet-800"
                    style={{ gridColumn: `${startCol + 2} / ${endCol + 3}` }}
                  >
                    Job — {displayName(item)}
                  </button>
                ))}
              </div>
            )}
            {/* the Posts layer — content going live, as day banners (07 §2) */}
            {activePosts.length > 0 && (
              <div className="grid gap-y-1 border-b py-1.5" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
                {days.flatMap((d, di) =>
                  postsOn(d.key).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => router.push(p.href)}
                      title={p.title}
                      className={cn(
                        "flex items-center gap-1.5 truncate rounded-lg px-2 py-1 text-left text-xs font-medium hover:opacity-80",
                        KIND_META[p.kind].chip,
                      )}
                      style={{ gridColumn: `${di + 2} / ${di + 3}` }}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", KIND_META[p.kind].dot)} />
                      <span className="truncate">{p.title}</span>
                    </button>
                  )),
                )}
              </div>
            )}
            {/* day headers */}
            <div className="grid" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
              <div />
              {days.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => openDay(d.key)}
                  className={cn("border-b border-l px-2 py-1.5 text-left text-xs font-medium hover:bg-muted/50", d.isToday ? "text-foreground" : "text-muted-foreground")}
                >
                  {d.label}
                  {d.isToday && <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] text-background">today</span>}
                </button>
              ))}
            </div>
            {/* time gutter + day columns */}
            <div ref={bodyRef} className="grid select-none" style={{ gridTemplateColumns: "3rem repeat(7, 1fr)" }}>
              <div className="relative" style={{ height: (HOUR_END - HOUR_START) * HOUR_PX }}>
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                  <div key={i} className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: i * HOUR_PX }}>
                    {i + HOUR_START <= 12 ? `${i + HOUR_START}a` : `${i + HOUR_START - 12}p`}
                  </div>
                ))}
              </div>
              {days.map((d, di) => {
                const dayWindows = windows.filter((w) => w.dayOfWeek === d.dow);
                const dayItems = itemsOn(d.key);
                const lanes = layoutLanes(dayItems, timezone);
                return (
                  <div
                    key={d.key}
                    className="relative cursor-cell border-l"
                    style={{ height: (HOUR_END - HOUR_START) * HOUR_PX }}
                    onPointerDown={(e) => beginCreate(e, di)}
                  >
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
                    {/* now line */}
                    {d.key === now.key && now.minutes >= HOUR_START * 60 && now.minutes <= HOUR_END * 60 && (
                      <div className="absolute inset-x-0 z-20 h-px bg-red-500" style={{ top: ((now.minutes - HOUR_START * 60) / 60) * HOUR_PX }}>
                        <span className="absolute -left-[3px] -top-[3px] size-1.5 rounded-full bg-red-500" />
                      </div>
                    )}
                    {/* create ghost */}
                    {drag?.mode === "create" && drag.moved && drag.dayIdx === di && (
                      <div
                        className="absolute inset-x-0.5 z-20 rounded-md border border-dashed border-foreground/40 bg-muted/70 px-1.5 py-0.5 text-[11px] font-medium"
                        style={{
                          top: ((drag.startMin - HOUR_START * 60) / 60) * HOUR_PX,
                          height: Math.max(20, ((drag.endMin - drag.startMin) / 60) * HOUR_PX),
                        }}
                      >
                        {fmtMin(drag.startMin)}–{fmtMin(drag.endMin)}
                      </div>
                    )}
                    {/* items */}
                    {dayItems.map((item) => {
                      const start = localParts(item.startAt, timezone).minutes;
                      const end = Math.max(localParts(item.endAt, timezone).minutes, start + SNAP);
                      const top = ((start - HOUR_START * 60) / 60) * HOUR_PX;
                      const h = Math.max(24, ((end - start) / 60) * HOUR_PX);
                      const lane = lanes.get(item.id) ?? { lane: 0, cols: 1 };
                      const look = itemLook(item);
                      const dragging = drag?.id === item.id && drag.moved;
                      const canResize = item.kind !== "estimate" || demo;
                      return (
                        <div
                          key={item.id}
                          data-cal-item
                          role="button"
                          tabIndex={0}
                          onPointerDown={(e) => beginMove(e, item)}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSheetItem(item)}
                          className={cn(
                            "absolute z-10 touch-none overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-xs",
                            dragging ? "z-30 cursor-grabbing ring-2 ring-ring" : "cursor-grab hover:brightness-95 dark:hover:brightness-110",
                            look.className,
                          )}
                          style={{
                            top,
                            height: h,
                            left: `calc(${(lane.lane / lane.cols) * 100}% + 2px)`,
                            width: `calc(${100 / lane.cols}% - 4px)`,
                            ...look.style,
                          }}
                        >
                          <span className="flex items-center gap-1 font-medium">
                            {item.bookedBy === "sarah" && <SarahIcon className="size-2.5 shrink-0" />}
                            {dragging ? `${fmtMin(start)}–${fmtMin(end)}` : formatTime(item.startAt, timezone)}
                          </span>
                          <span className="block truncate">{item.contactName}</span>
                          {canResize && h >= 32 && (
                            <span
                              className="absolute inset-x-1 bottom-0 h-1.5 cursor-ns-resize"
                              onPointerDown={(e) => beginResize(e, item)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {view === "day" && (
        <DayView
          dayKey={dayKey}
          setDayKey={setDayKey}
          items={itemsOn(dayKey)}
          posts={postsOn(dayKey)}
          route={routeFor(dayKey)}
          timezone={timezone}
          onOpen={setSheetItem}
          onOpenPost={(href) => router.push(href)}
          base={base}
          now={now}
        />
      )}

      {view === "month" && (
        <MonthView
          anchor={anchor}
          timezone={timezone}
          items={displayed}
          posts={activePosts}
          onOpenDay={openDay}
          onOpenPost={(href) => router.push(href)}
        />
      )}

      {view === "list" && (
        <DataTable
          columns={columns}
          data={[...displayed].sort((a, b) => b.startAt.localeCompare(a.startAt))}
          searchPlaceholder="Search contact, town…"
          searchFn={(i, q) => i.contactName.toLowerCase().includes(q) || (i.town ?? "").toLowerCase().includes(q)}
          onRowClick={setSheetItem}
        />
      )}

      <CreateDialog
        draft={draft}
        demo={demo}
        onClose={() => setDraft(null)}
        onCreate={(item) => {
          setLocalItems((prev) => [...prev, item]);
          setDraft(null);
          if (item.kind === "block") toast.success("Blocked — Sarah won't offer these times.");
          else toast.success(`${KIND_LABEL[item.kind]} added.`, {
            description: demo ? undefined : "Lives here for now — owner-created bookings save to the backend soon.",
          });
        }}
      />

      <ItemSheet
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        demo={demo}
        timezone={timezone}
        windows={windows}
        allItems={localItems}
        onGoToContact={(id) => router.push(`/crm/${id}`)}
        onLocalUpdate={updateItem}
        onLocalRemove={removeItem}
      />
    </div>
  );
}

/* --------------------------------- month view ---------------------------------- */

function MonthView({
  anchor,
  timezone,
  items,
  posts = [],
  onOpenDay,
  onOpenPost,
}: {
  anchor: Date;
  timezone: string;
  items: ScheduleItem[];
  posts?: SchedulePost[];
  onOpenDay: (key: string) => void;
  onOpenPost?: (href: string) => void;
}) {
  const todayKey = dateKeyOf(new Date(), timezone);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to Monday
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { key: dateKeyOf(d, timezone), num: d.getDate(), inMonth: d.getMonth() === anchor.getMonth() };
  });

  const byDay = React.useMemo(() => {
    const m = new Map<string, ScheduleItem[]>();
    for (const i of items) {
      if (i.status === "cancelled") continue;
      const s = localParts(i.startAt, timezone).dateKey;
      const e = i.allDay ? localParts(i.endAt, timezone).dateKey : s;
      for (let d = new Date(`${s}T12:00:00`); dateKeyOf(d, timezone) <= e; d.setTime(d.getTime() + DAY_MS)) {
        const k = dateKeyOf(d, timezone);
        m.set(k, [...(m.get(k) ?? []), i]);
        if (!i.allDay) break;
      }
    }
    for (const [, v] of m) v.sort((a, b) => Number(!!b.allDay) - Number(!!a.allDay) || a.startAt.localeCompare(b.startAt));
    return m;
  }, [items, timezone]);

  const DOT: Record<ScheduleItemKind, string> = { estimate: "bg-blue-500", job: "bg-violet-500", block: "bg-muted-foreground" };

  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <div className="grid min-w-[760px] grid-cols-7 border-b text-xs font-medium text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1.5">{d}</div>
        ))}
      </div>
      <div className="grid min-w-[760px] grid-cols-7">
        {cells.map((c, i) => {
          const dayItems = byDay.get(c.key) ?? [];
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onOpenDay(c.key)}
              className={cn(
                "flex min-h-24 flex-col items-stretch gap-0.5 border-b p-1.5 text-left align-top hover:bg-muted/50",
                i % 7 !== 0 && "border-l",
                !c.inMonth && "bg-muted/30",
              )}
            >
              <span
                className={cn(
                  "mb-0.5 self-start text-xs",
                  c.key === todayKey
                    ? "rounded-full bg-foreground px-1.5 py-0.5 font-semibold text-background"
                    : c.inMonth ? "text-foreground" : "text-muted-foreground/60",
                )}
              >
                {c.num}
              </span>
              {dayItems.slice(0, 3).map((it) => (
                <span key={it.id} className="flex items-center gap-1 truncate text-[10px] leading-tight">
                  <span className={cn("size-1.5 shrink-0 rounded-full", DOT[it.kind])} />
                  <span className="truncate text-muted-foreground">
                    {it.allDay ? displayName(it) : `${fmtMin(localParts(it.startAt, timezone).minutes)} ${it.contactName}`}
                  </span>
                </span>
              ))}
              {dayItems.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</span>}
              {/* the Posts layer (07 §2) */}
              {posts
                .filter((p) => localParts(p.at, timezone).dateKey === c.key)
                .map((p) => (
                  <span
                    key={p.id}
                    role="link"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenPost?.(p.href);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && onOpenPost?.(p.href)}
                    className="flex items-center gap-1 truncate rounded px-0.5 text-[10px] leading-tight hover:bg-muted"
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", KIND_META[p.kind].dot)} />
                    <span className="truncate text-muted-foreground">{p.title}</span>
                  </span>
                ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- create dialog -------------------------------- */

const DURATIONS = [
  { min: 30, label: "30 min" },
  { min: 60, label: "1 hour" },
  { min: 90, label: "1½ hours" },
  { min: 120, label: "2 hours" },
  { min: 180, label: "3 hours" },
  { min: 240, label: "4 hours" },
];

function CreateDialog({
  draft,
  demo,
  onClose,
  onCreate,
}: {
  draft: CreateDraft | null;
  demo: boolean;
  onClose: () => void;
  onCreate: (item: ScheduleItem) => void;
}) {
  const [kind, setKind] = React.useState<ScheduleItemKind>("estimate");
  const [name, setName] = React.useState("");
  const [date, setDate] = React.useState("");
  const [time, setTime] = React.useState("09:00");
  const [duration, setDuration] = React.useState(60);
  const [address, setAddress] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!draft) return;
    setKind("estimate");
    setName("");
    setAddress("");
    setNote("");
    setDate(draft.dateKey);
    setTime(`${pad(Math.floor(draft.startMin / 60))}:${pad(draft.startMin % 60)}`);
    setDuration(Math.max(30, draft.endMin - draft.startMin));
  }, [draft]);

  const save = () => {
    if (!name.trim() || !date) return;
    const start = new Date(`${date}T${time}:00`);
    onCreate({
      id: `si_local_${Date.now()}`,
      kind,
      contactName: name.trim(),
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + duration * 60_000).toISOString(),
      status: "confirmed",
      address: kind === "block" ? undefined : address.trim() || undefined,
      town: undefined,
      bookedBy: "owner",
      notes: note.trim() || undefined,
    });
  };

  const timeOptions: string[] = [];
  for (let t = HOUR_START * 60; t < HOUR_END * 60; t += SNAP) timeOptions.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`);

  const inputCls = "h-9 rounded-lg border bg-background px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring";

  return (
    <Dialog open={!!draft} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to the calendar</DialogTitle>
          <DialogDescription>
            {kind === "block" ? "Sarah stops offering these times the moment you save." : "Booked by you — Sarah works around it."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex rounded-lg border p-0.5">
            {(["estimate", "job", "block"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={cn("flex-1 rounded-md px-2 py-1.5 text-xs", kind === k ? "bg-muted font-medium" : "text-muted-foreground")}
              >
                {k === "block" ? "Block time" : KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={kind === "block" ? "What for? e.g. Dentist" : "Customer name"}
            className={inputCls}
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(inputCls, "col-span-1")} />
            <select value={time} onChange={(e) => setTime(e.target.value)} className={inputCls}>
              {timeOptions.map((t) => (
                <option key={t} value={t}>{fmtMin(hm(t))}</option>
              ))}
            </select>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className={inputCls}>
              {DURATIONS.map((d) => (
                <option key={d.min} value={d.min}>{d.label}</option>
              ))}
            </select>
          </div>
          {kind !== "block" && (
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address (optional)" className={inputCls} />
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className={inputCls} />
          {!demo && kind !== "block" && (
            <p className="text-xs text-muted-foreground">Lives on this calendar for now — owner-created bookings save to the backend soon.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={!name.trim() || !date}>
              {kind === "block" ? "Block it" : "Add it"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------- day view ---------------------------------- */

function DayView({
  dayKey,
  setDayKey,
  items,
  posts = [],
  route,
  timezone,
  onOpen,
  onOpenPost,
  base,
  now,
}: {
  dayKey: string;
  setDayKey: (k: string) => void;
  items: ScheduleItem[];
  posts?: SchedulePost[];
  route: RoutePlan | null;
  timezone: string;
  onOpen: (i: ScheduleItem) => void;
  onOpenPost?: (href: string) => void;
  base: RouteBase | null;
  now: { key: string; minutes: number };
}) {
  const shift = (dir: 1 | -1) => {
    const d = new Date(`${dayKey}T12:00:00`);
    d.setTime(d.getTime() + dir * DAY_MS);
    setDayKey(d.toISOString().slice(0, 10));
  };
  const title = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long", month: "short", day: "numeric" }).format(
    new Date(`${dayKey}T12:00:00`),
  );

  // where the "now" divider sits (today only)
  const nowIdx = dayKey === now.key ? items.findIndex((i) => localParts(i.startAt, timezone).minutes > now.minutes) : -1;

  const nowLine = (
    <li key="now" className="flex items-center gap-2 py-0.5 pl-2" aria-label="Current time">
      <span className="size-1.5 rounded-full bg-red-500" />
      <span className="h-px flex-1 bg-red-500/60" />
      <span className="text-[10px] font-medium text-red-500">{fmtMin(now.minutes)}</span>
    </li>
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
        {/* the Posts layer: content going live this day (07 §2) */}
        {posts.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Going live:</span>
            {posts.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenPost?.(p.href)}
                className={cn("flex max-w-64 items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-xs font-medium hover:opacity-80", KIND_META[p.kind].chip)}
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", KIND_META[p.kind].dot)} />
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        )}
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nothing booked — Sarah keeps this day open.</p>
        ) : (
          <ol className="flex flex-col">
            {items.map((item, i) => {
              const leg = route?.legs[i + 1];
              return (
                <React.Fragment key={item.id}>
                  {nowIdx === i && nowLine}
                  <li>
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-muted/50"
                    >
                      <span className="w-14 shrink-0 pt-0.5 text-sm font-medium">{formatTime(item.startAt, timezone)}</span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-sm font-medium">
                          {item.bookedBy === "sarah" && <SarahIcon className="size-3 text-muted-foreground" />}
                          {item.kind === "block" ? item.contactName : `${KIND_LABEL[item.kind]} — ${displayName(item)}`}
                        </span>
                        {item.kind !== "block" && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" /> {item.address ?? item.town ?? "—"}
                          </span>
                        )}
                      </span>
                    </button>
                    {i < items.length - 1 && leg && (
                      <p className="py-1 pl-16 text-[11px] text-muted-foreground">
                        ▤ drive {leg.approx ? "≈" : ""}{leg.driveMinutes} min · {leg.miles} mi
                      </p>
                    )}
                  </li>
                </React.Fragment>
              );
            })}
            {nowIdx === -1 && dayKey === now.key && items.length > 0 && nowLine}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Route</h3>
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
                  ...(base ? [{ id: "base", lat: base.lat, lng: base.lng, label: "⌂", title: base.label }] : []),
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
      <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
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
  onLocalUpdate,
  onLocalRemove,
}: {
  item: ScheduleItem | null;
  onClose: () => void;
  demo: boolean;
  timezone: string;
  windows: AvailabilityWindow[];
  allItems: ScheduleItem[];
  onGoToContact: (id: string) => void;
  onLocalUpdate: (id: string, patch: Partial<ScheduleItem>) => void;
  onLocalRemove: (id: string) => void;
}) {
  const [rescheduling, setRescheduling] = React.useState(false);
  const [pickDate, setPickDate] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    setRescheduling(false);
    setPickDate("");
  }, [item?.id]);

  if (!item) return null;
  const c = statusChip(item.status);
  const isBlock = item.kind === "block";
  const isPast = new Date(item.endAt).getTime() < Date.now();
  const needsOutcome = item.kind === "estimate" && isPast && ["confirmed", "proposed"].includes(item.status);

  const slots = pickDate
    ? openSlots(pickDate, new Date(`${pickDate}T12:00:00`).getDay(), windows, allItems, timezone)
    : [];

  const doCancel = async () => {
    if (isBlock) {
      onLocalRemove(item.id);
      toast.success("Block removed — those times are open again.");
      onClose();
      return;
    }
    if (!window.confirm(`Cancel ${item.contactName}? Sarah will draft the customer notice for your OK.`)) return;
    setBusy(true);
    if (demo || item.kind === "job") {
      onLocalUpdate(item.id, { status: "cancelled" });
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
    const durMs = new Date(item.endAt).getTime() - new Date(item.startAt).getTime();
    const newStart = new Date(`${pickDate}T${slot}:00`);
    if (demo || item.kind !== "estimate") {
      onLocalUpdate(item.id, { startAt: newStart.toISOString(), endAt: new Date(newStart.getTime() + durMs).toISOString() });
      toast.success(
        `Moved to ${pickDate} ${slot}`,
        item.kind === "estimate" ? { description: "Sarah drafted the customer notice — check your approvals." } : undefined,
      );
    } else {
      const res = await rescheduleAppointmentAction(item.id, newStart.toISOString());
      res.ok ? toast.success("Rescheduled — Sarah will ask before texting the customer.") : toast.error("That time didn't work — pick another.");
    }
    setBusy(false);
    onClose();
  };

  const markOutcome = async (outcome: "shown" | "no_show") => {
    setBusy(true);
    onLocalUpdate(item.id, { status: outcome });
    if (!demo) {
      const res = await markAppointmentOutcomeAction(item.id, outcome);
      if (!res.ok) {
        onLocalUpdate(item.id, { status: item.status });
        toast.error("Couldn't save that — try again.");
        setBusy(false);
        return;
      }
    }
    toast.success(outcome === "shown" ? "Marked as showed." : "Marked as a no-show — Sarah can follow up to rebook.");
    setBusy(false);
    onClose();
  };

  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isBlock ? item.contactName : `${KIND_LABEL[item.kind]} — ${displayName(item)}`}
            {!isBlock && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", c.chip)}>{c.label}</span>}
          </SheetTitle>
          <SheetDescription>{formatWhen(item.startAt, timezone)}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 px-4 text-sm">
          {!isBlock && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-3.5" /> {item.address ?? item.town ?? "No address yet"}
            </p>
          )}
          {isBlock && <p className="text-muted-foreground">Sarah doesn't offer these times to customers.</p>}
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

          {!isBlock && (item.address || item.town) && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(item.address ?? item.town ?? "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Get directions ↗
            </a>
          )}

          {needsOutcome && (
            <div className="mt-1 flex items-center gap-2 rounded-xl border p-3">
              <span className="text-xs text-muted-foreground">How did it go?</span>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busy} onClick={() => markOutcome("shown")}>
                Showed ✓
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" disabled={busy} onClick={() => markOutcome("no_show")}>
                No-show
              </Button>
            </div>
          )}

          {!rescheduling ? (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setRescheduling(true)} disabled={busy}>
                <CalendarDays className="size-3.5" /> {isBlock ? "Move" : "Reschedule"}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={doCancel} disabled={busy}>
                <X className="size-3.5" /> {isBlock ? "Remove block" : "Cancel visit"}
              </Button>
            </div>
          ) : (
            <div className="mt-2 flex flex-col gap-2 rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                {isBlock
                  ? "Pick the new time for this block."
                  : `Pick a new time — Sarah tells ${item.contactName.split(" ")[0]} after your OK.`}
              </p>
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
