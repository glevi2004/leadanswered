import { DateTime, IANAZone } from "luxon";

/**
 * The single timezone conversion layer (SCOPE §5). Availability windows are stored as LOCAL wall-clock
 * times ("HH:MM") in the contractor's IANA timezone; appointment instants are stored in UTC. luxon does
 * every wall-time ⇄ instant conversion here so the rest of the codebase never hand-rolls offset math
 * (which is wrong at DST boundaries). Months are 1-12 (luxon convention), dow is 0=Sun..6=Sat.
 */

/** The one fallback timezone used everywhere a contractor tz is missing (SCOPE §5.1). */
export const DEFAULT_TIMEZONE = "America/New_York";

/** True if `tz` is a real IANA zone (e.g. "America/New_York"), so we never store garbage. */
export function isValidZone(tz: string | null | undefined): boolean {
  return !!tz && IANAZone.isValidZone(tz);
}

/** A local timezone falling back to DEFAULT_TIMEZONE if the given one is missing/invalid. */
export function safeZone(tz: string | null | undefined): string {
  return isValidZone(tz) ? (tz as string) : DEFAULT_TIMEZONE;
}

/** Convert a local wall-clock time (y, month 1-12, day, hh, mm) in `tz` to the UTC instant. DST-correct. */
export function localWallToUtc(
  tz: string,
  y: number,
  month1: number,
  d: number,
  hh: number,
  mm: number,
): Date {
  return DateTime.fromObject(
    { year: y, month: month1, day: d, hour: hh, minute: mm },
    { zone: safeZone(tz) },
  )
    .toUTC()
    .toJSDate();
}

export interface ZonedParts {
  y: number;
  month1: number; // 1-12
  d: number;
  dow: number; // 0=Sun..6=Sat
  hh: number;
  mm: number;
}

/** Express a UTC instant (ISO string or Date) as local wall-clock parts in `tz`. */
export function zonedParts(input: string | Date, tz: string): ZonedParts {
  const dt = (typeof input === "string" ? DateTime.fromISO(input) : DateTime.fromJSDate(input)).setZone(
    safeZone(tz),
  );
  return { y: dt.year, month1: dt.month, d: dt.day, dow: dt.weekday % 7, hh: dt.hour, mm: dt.minute };
}

/** Each local calendar date (with its 0=Sun dow) whose day intersects [fromMs, toMs), in `tz`. */
export function localDatesInRange(
  tz: string,
  fromMs: number,
  toMs: number,
): Array<{ y: number; month1: number; d: number; dow: number }> {
  const zone = safeZone(tz);
  const out: Array<{ y: number; month1: number; d: number; dow: number }> = [];
  let cur = DateTime.fromMillis(fromMs, { zone }).startOf("day");
  for (let guard = 0; cur.toMillis() < toMs && guard < 400; guard++) {
    out.push({ y: cur.year, month1: cur.month, d: cur.day, dow: cur.weekday % 7 });
    cur = cur.plus({ days: 1 });
  }
  return out;
}

/** 00:00 on the next LOCAL Monday strictly after `now` in `tz`, as a UTC instant (never mid-week). */
export function nextLocalMondayStartUtc(tz: string, now: Date): Date {
  const dt = DateTime.fromJSDate(now).setZone(safeZone(tz));
  const delta = ((8 - dt.weekday) % 7) || 7; // weekday 1=Mon..7=Sun; always ≥1 → a future Monday
  return dt.plus({ days: delta }).startOf("day").toUTC().toJSDate();
}
