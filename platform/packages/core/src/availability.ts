import type { StandingAvailability } from "./types.js";

export interface SlotOption {
  /** ISO 8601 datetime — the stable id the AI must echo back when a lead picks it. */
  iso: string;
  /** Human-readable label for Sarah to say. */
  label: string;
}

/**
 * Generate the next `count` concrete appointment slots from a contractor's
 * standing weekly availability, after `now`. `now` is injected for determinism
 * (SCOPE §7.5). Computed in UTC for Phase 1; timezone-accurate rendering is a
 * later hardening item.
 */
export function proposeSlots(
  availability: StandingAvailability,
  count: number,
  now: Date,
): SlotOption[] {
  const out: SlotOption[] = [];
  const slots = [...availability.slots].sort(
    (a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time),
  );

  for (let dayOffset = 0; dayOffset < 21 && out.length < count; dayOffset++) {
    const day = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + dayOffset,
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
