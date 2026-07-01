import type { AvailabilityWindow } from "./types.js";
import {
  DEFAULT_TIMEZONE,
  localDatesInRange,
  localWallToUtc,
  nextLocalMondayStartUtc,
  safeZone,
  zonedParts,
} from "./timezone.js";

/** Default on-site-estimate duration (minutes). Per-contractor configurable later. */
export const APPOINTMENT_DURATION_MIN = 60;

/** A busy interval [startAt, endAt). Our active appointments now; external free/busy later. */
export interface TimeRange {
  startAt: Date;
  endAt: Date;
}

/** A discrete candidate time (still used by the Scheduler's busy-filter + booking checks). */
export interface SlotOption {
  iso: string;
  label: string;
}

/** Drop candidate slots whose [start, start+duration) overlaps a busy range. Half-open (back-to-back ok). */
export function subtractBusy(
  slots: SlotOption[],
  busy: TimeRange[],
  durationMinutes: number = APPOINTMENT_DURATION_MIN,
): SlotOption[] {
  if (busy.length === 0) return slots;
  return slots.filter((s) => {
    const start = new Date(s.iso).getTime();
    const end = start + durationMinutes * 60_000;
    return !busy.some((b) => start < b.endAt.getTime() && end > b.startAt.getTime());
  });
}

/** An open, bookable stretch of time (a continuous free segment ≥ one appointment). */
export interface OpenWindow {
  /** LOCAL calendar date in the contractor's tz, YYYY-MM-DD. */
  date: string;
  startIso: string;
  endIso: string;
  /** Human label Sarah can read/rephrase, e.g. "Mon, Jul 6 · 6:00-11:00 AM" (in the contractor's tz). */
  label: string;
}

export type PartOfDay = "morning" | "afternoon" | "evening";

export interface AvailabilityQuery {
  /** Inclusive lower bound (ISO). */
  fromIso: string;
  /** Exclusive upper bound (ISO). */
  toIso: string;
  /** 0=Sun … 6=Sat — restrict to a single weekday (for "what about Monday?"). */
  dayOfWeek?: number;
  partOfDay?: PartOfDay;
}

const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/** morning < 12:00, afternoon 12:00-17:00, evening ≥ 17:00 (minutes from LOCAL midnight). */
export function partOfDayBounds(part: PartOfDay): { startMin: number; endMin: number } {
  if (part === "morning") return { startMin: 0, endMin: 12 * 60 };
  if (part === "afternoon") return { startMin: 12 * 60, endMin: 17 * 60 };
  return { startMin: 17 * 60, endMin: 24 * 60 };
}

/** 00:00 on the next LOCAL Monday strictly after `now` in `timezone`, as a UTC instant. */
export function nextWeekStart(now: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  return nextLocalMondayStartUtc(timezone, now);
}

/** Subtract busy intervals from [start,end], returning the free sub-ranges (ms boundaries). */
function subtractIntervals(start: number, end: number, busy: TimeRange[]): Array<[number, number]> {
  let free: Array<[number, number]> = [[start, end]];
  for (const b of busy) {
    const bs = b.startAt.getTime();
    const be = b.endAt.getTime();
    const next: Array<[number, number]> = [];
    for (const [s, e] of free) {
      if (be <= s || bs >= e) {
        next.push([s, e]); // no overlap
        continue;
      }
      if (bs > s) next.push([s, bs]); // free chunk before busy
      if (be < e) next.push([be, e]); // free chunk after busy
    }
    free = next;
  }
  return free;
}

/**
 * The open, bookable windows in [fromIso, toIso): the contractor's standing weekly windows (LOCAL
 * wall-clock hours in `timezone`), intersected with the query range + optional day/part-of-day filter,
 * MINUS busy time, keeping only segments long enough to hold a full appointment. Windows are converted
 * to UTC instants per calendar date via luxon (DST-correct). This is what Sarah reads to describe
 * availability like an employee with the calendar open — she does NOT get a list of discrete slots.
 */
export function computeOpenWindows(
  standingWindows: AvailabilityWindow[],
  query: AvailabilityQuery,
  busy: TimeRange[],
  now: Date,
  timezone: string = DEFAULT_TIMEZONE,
  durationMin: number = APPOINTMENT_DURATION_MIN,
): OpenWindow[] {
  const tz = safeZone(timezone);
  const from = Math.max(new Date(query.fromIso).getTime(), now.getTime());
  const to = new Date(query.toIso).getTime();
  if (!(to > from)) return [];
  const pod = query.partOfDay ? partOfDayBounds(query.partOfDay) : null;

  const out: OpenWindow[] = [];
  for (const { y, month1, d, dow } of localDatesInRange(tz, from, to)) {
    if (query.dayOfWeek != null && query.dayOfWeek !== dow) continue;
    for (const w of standingWindows.filter((s) => s.dayOfWeek === dow)) {
      let wStart = toMin(w.start);
      let wEnd = toMin(w.end);
      if (pod) {
        wStart = Math.max(wStart, pod.startMin);
        wEnd = Math.min(wEnd, pod.endMin);
      }
      if (wEnd - wStart < durationMin) continue;
      // Convert the LOCAL window edges on this local date to UTC instants (luxon normalizes day+1).
      const winStartMs = localWallToUtc(tz, y, month1, d, Math.floor(wStart / 60), wStart % 60).getTime();
      const winEndMs =
        wEnd >= 1440
          ? localWallToUtc(tz, y, month1, d + 1, 0, 0).getTime()
          : localWallToUtc(tz, y, month1, d, Math.floor(wEnd / 60), wEnd % 60).getTime();
      const rangeStart = Math.max(winStartMs, from);
      const rangeEnd = Math.min(winEndMs, to);
      if (rangeEnd - rangeStart < durationMin * 60_000) continue;
      for (const [s, e] of subtractIntervals(rangeStart, rangeEnd, busy)) {
        if (e - s < durationMin * 60_000) continue;
        out.push({
          date: `${y}-${String(month1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          startIso: new Date(s).toISOString(),
          endIso: new Date(e).toISOString(),
          label: `${formatDayLabel(new Date(s), tz)} · ${formatClock(new Date(s), tz)}-${formatClock(new Date(e), tz)}`,
        });
      }
    }
  }
  return out.sort((a, b) => a.startIso.localeCompare(b.startIso));
}

/** Concrete bookable start times inside an open window (every `stepMin`, each fitting `durationMin`). */
export function windowStarts(
  open: OpenWindow,
  timezone: string = DEFAULT_TIMEZONE,
  stepMin = 60,
  durationMin: number = APPOINTMENT_DURATION_MIN,
): SlotOption[] {
  const out: SlotOption[] = [];
  const end = new Date(open.endIso).getTime();
  for (
    let t = new Date(open.startIso).getTime();
    t + durationMin * 60_000 <= end;
    t += stepMin * 60_000
  ) {
    out.push({ iso: new Date(t).toISOString(), label: formatSlot(new Date(t), timezone) });
  }
  return out;
}

/** True if a `durationMin` appointment starting at `startIso` fits inside a standing window (LOCAL tz). */
export function isWithinStandingWindow(
  standingWindows: AvailabilityWindow[],
  startIso: string,
  timezone: string = DEFAULT_TIMEZONE,
  durationMin: number = APPOINTMENT_DURATION_MIN,
): boolean {
  if (Number.isNaN(new Date(startIso).getTime())) return false;
  const p = zonedParts(startIso, timezone);
  const startMin = p.hh * 60 + p.mm;
  const endMin = startMin + durationMin;
  return standingWindows.some(
    (w) => w.dayOfWeek === p.dow && toMin(w.start) <= startMin && endMin <= toMin(w.end),
  );
}

/** Human weekly-availability summary for the system prompt, e.g. "Mon 6-11am, Wed 11am-4pm" (local). */
export function formatWeeklyAvailability(standingWindows: AvailabilityWindow[]): string {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = new Map<number, string[]>();
  for (const w of [...standingWindows].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start))) {
    (byDay.get(w.dayOfWeek) ?? byDay.set(w.dayOfWeek, []).get(w.dayOfWeek)!).push(
      `${clockShort(w.start)}-${clockShort(w.end)}`,
    );
  }
  // Order Mon→Sun for readability.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order
    .filter((d) => byDay.has(d))
    .map((d) => `${DAYS[d]} ${byDay.get(d)!.join(", ")}`)
    .join(", ");
}

// --- small formatters (rendered in the contractor's timezone) ---
function formatDayLabel(dt: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: safeZone(timezone) }).format(dt);
}
function formatClock(dt: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: safeZone(timezone) }).format(dt);
}
/** "06:00"→"6am", "11:30"→"11:30am", "16:00"→"4pm". */
function clockShort(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h < 12 ? "am" : "pm";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${period}` : `${h12}${period}`;
}

/** Full slot label for SMS/notifications, e.g. "Monday, July 6 at 8:00 AM" in the contractor's tz. */
export function formatSlot(dt: Date | string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  if (Number.isNaN(d.getTime())) return typeof dt === "string" ? dt : "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: safeZone(timezone),
  }).format(d);
}
