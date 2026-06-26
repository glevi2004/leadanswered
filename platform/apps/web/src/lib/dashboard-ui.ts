/** Pure presentation helpers for the dashboard — status → badge + datetime formatting. */

type BadgeVariant = "default" | "secondary" | "destructive";
export type StatusBadge = { label: string; variant: BadgeVariant };

const LEAD_STATUS: Record<string, StatusBadge> = {
  new: { label: "New", variant: "secondary" },
  contacted: { label: "Contacted", variant: "secondary" },
  qualifying: { label: "Qualifying", variant: "secondary" },
  booked: { label: "Booked", variant: "default" },
  disqualified: { label: "Disqualified", variant: "destructive" },
  no_response: { label: "No response", variant: "secondary" },
};

const APPT_STATUS: Record<string, StatusBadge> = {
  proposed: { label: "Proposed", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  shown: { label: "Showed", variant: "default" },
  no_show: { label: "No-show", variant: "destructive" },
  rescheduled: { label: "Rescheduled", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export const leadStatusBadge = (status: string): StatusBadge =>
  LEAD_STATUS[status] ?? { label: status, variant: "secondary" };

export const apptStatusBadge = (status: string): StatusBadge =>
  APPT_STATUS[status] ?? { label: status, variant: "secondary" };

const DEFAULT_TZ = "America/New_York";

/** Human-readable date+time in the contractor's timezone, e.g. "Tue, Jul 1 · 2:00 PM". */
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
