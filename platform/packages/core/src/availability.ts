import type { StandingAvailability } from "./types.js";

export interface SlotOption {
  /** ISO 8601 datetime — the stable id the AI must echo back when a lead picks it. */
  iso: string;
  /** Human-readable label for Sarah to say. */
  label: string;
}

export interface ProposeSlotsOptions {
  /**
   * Start searching from this date instead of `now` — lets the agent request a
   * later window (e.g. "do you have next week?") without changing the rule that
   * a slot must still be in the future relative to `now`.
   */
  fromDate?: Date;
  /** How many days forward to search from the start date (default 21). */
  horizonDays?: number;
}

/**
 * Generate the next `count` concrete appointment slots from a contractor's
 * standing weekly availability, after `now`. `now` is injected for determinism
 * (SCOPE §7.5). `opts.fromDate` shifts where the search starts (for "next week"
 * style requests). Computed in UTC for Phase 1; timezone-accurate rendering is a
 * later hardening item.
 */
export function proposeSlots(
  availability: StandingAvailability,
  count: number,
  now: Date,
  opts: ProposeSlotsOptions = {},
): SlotOption[] {
  const out: SlotOption[] = [];
  const slots = [...availability.slots].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time),
  );

  // Start from fromDate when it's in the future, else from now (back-compatible).
  const start =
    opts.fromDate && opts.fromDate.getTime() > now.getTime() ? opts.fromDate : now;
  const horizonDays = opts.horizonDays ?? 21;

  for (let dayOffset = 0; dayOffset < horizonDays && out.length < count; dayOffset++) {
    const day = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + dayOffset,
      ),
    );
    const dow = day.getUTCDay();
    for (const slot of slots.filter((s) => s.dayOfWeek === dow)) {
      const [h, m] = slot.time.split(":").map(Number);
      const dt = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m),
      );
      if (dt.getTime() > now.getTime()) {
        out.push({ iso: dt.toISOString(), label: formatSlot(dt) });
        if (out.length >= count) break;
      }
    }
  }
  return out;
}

export function formatSlot(dt: Date | string): string {
  const d = typeof dt === "string" ? new Date(dt) : dt;
  if (Number.isNaN(d.getTime())) return typeof dt === "string" ? dt : ""; // never throw
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(d);
}

/** A busy interval [startAt, endAt). Returned by the Scheduler (local appts now, external free/busy later). */
export interface TimeRange {
  startAt: Date;
  endAt: Date;
}

/** Default on-site-estimate duration (minutes). Per-contractor configurable later. */
export const APPOINTMENT_DURATION_MIN = 60;

/**
 * Drop any candidate slot whose [start, start+duration) interval overlaps a busy
 * range — so Sarah never *offers* a time that's already taken. Half-open overlap so
 * back-to-back slots don't false-collide. Pure (unit-testable); the busy ranges come
 * from the Scheduler. This is a UX guard; the DB EXCLUDE constraint is the real backstop.
 */
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
