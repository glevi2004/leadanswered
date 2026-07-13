/** Pure presentation helpers for the dashboard — statusChip registry + datetime formatting. */
import { DEFAULT_TIMEZONE } from "@/lib/config";

const DEFAULT_TZ = DEFAULT_TIMEZONE;

/** Human-readable date+time in the organization's timezone, e.g. "Tue, Jul 1 · 2:00 PM". */
export function formatWhen(iso: string | null | undefined, timezone = DEFAULT_TZ): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    })
      .format(d)
      .replace(" at ", " · ");
  } catch {
    return d.toLocaleString("en-US");
  }
}

/** Short time only, e.g. "2:04 PM" — for SMS bubble timestamps. */
export function formatTime(iso: string, timezone = DEFAULT_TZ): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(d);
  } catch {
    return "";
  }
}

/* ===== Semantic status colors (approved 2026-07-12; documented in 00-foundation §9) =====
   Color by MEANING, shared by every page: gray=not started/dormant · blue=in flight ·
   violet=being worked · emerald=good outcome · amber=stalled/needs an eye · red=lost/failed.
   The label always carries the meaning; color is reinforcement. */

export type StatusFamily = "gray" | "blue" | "violet" | "emerald" | "amber" | "red";

export const FAMILY_CHIP: Record<StatusFamily, string> = {
  gray: "bg-muted text-muted-foreground",
  blue: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  violet: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  red: "bg-red-500/10 text-red-700 dark:text-red-300",
};

const STATUS_META: Record<string, { label: string; family: StatusFamily }> = {
  // not started / dormant
  new: { label: "New", family: "gray" },
  queued: { label: "Queued", family: "gray" },
  draft: { label: "Draft", family: "gray" },
  proposed: { label: "Proposed", family: "gray" },
  past_customer: { label: "Past customer", family: "gray" },
  off: { label: "Off", family: "gray" },
  not_connected: { label: "Not connected", family: "gray" },
  rescheduled: { label: "Rescheduled", family: "gray" },
  void: { label: "Void", family: "gray" },
  deferred: { label: "Deferred", family: "gray" },
  exhausted: { label: "Out of attempts", family: "gray" },
  // in flight
  contacted: { label: "Contacted", family: "blue" },
  armed: { label: "Armed", family: "blue" },
  sent: { label: "Sent", family: "blue" },
  running: { label: "Running", family: "blue" },
  pending: { label: "Verifying", family: "blue" },
  scheduled: { label: "Scheduled", family: "blue" },
  // being worked
  qualifying: { label: "Qualifying", family: "violet" },
  replied: { label: "Replied", family: "violet" },
  job_scheduled: { label: "Job scheduled", family: "violet" },
  job_done: { label: "Job done", family: "violet" },
  // good outcome
  booked: { label: "Booked", family: "emerald" },
  accepted: { label: "Accepted", family: "emerald" },
  confirmed: { label: "Confirmed", family: "emerald" },
  shown: { label: "Showed", family: "emerald" },
  paid: { label: "Paid", family: "emerald" },
  reviewed: { label: "Reviewed", family: "emerald" },
  viewed: { label: "Viewed", family: "violet" },
  resolved: { label: "Resolved", family: "emerald" },
  completed: { label: "Completed", family: "emerald" },
  verified: { label: "Verified", family: "emerald" },
  synced: { label: "Synced", family: "emerald" },
  on: { label: "On", family: "emerald" },
  published: { label: "Published", family: "emerald" },
  posted: { label: "Posted", family: "emerald" },
  // stalled / needs an eye
  no_response: { label: "No response", family: "amber" },
  held: { label: "Held", family: "amber" },
  skipped: { label: "Skipped", family: "amber" },
  still_quiet: { label: "Still quiet", family: "amber" },
  paused: { label: "Paused", family: "amber" },
  opted_out: { label: "Opted out", family: "amber" },
  needs_reconnect: { label: "Reconnect", family: "amber" },
  // lost / failed
  overdue: { label: "Overdue", family: "red" },
  disqualified: { label: "Disqualified", family: "red" },
  cancelled: { label: "Cancelled", family: "red" },
  failed: { label: "Failed", family: "red" },
  no_show: { label: "No-show", family: "red" },
  declined: { label: "Declined", family: "red" },
  expired: { label: "Expired", family: "red" },
};

/** The one status → colored-chip resolver. Unknown statuses fall back to gray. */
export function statusChip(status: string): { label: string; chip: string } {
  const meta = STATUS_META[status];
  if (!meta) return { label: status, chip: FAMILY_CHIP.gray };
  return { label: meta.label, chip: FAMILY_CHIP[meta.family] };
}

/** Solid dot per family (calendar dots, list markers) — same registry, no bespoke colors. */
export const FAMILY_DOT: Record<StatusFamily, string> = {
  gray: "bg-muted-foreground/50",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function statusDot(status: string): string {
  const meta = STATUS_META[status];
  return FAMILY_DOT[meta?.family ?? "gray"];
}

/** Integer cents → "$14,200" (whole dollars) or "$1,850.50" when cents exist (00 §9). */
export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}
