/** Schedule-owned types (07-schedule §4). */

export type ScheduleItemKind = "estimate" | "job"; // 'estimate' maps from Appointment; 'job' is NEW

export interface ScheduleItem {
  id: string; // maps from: Appointment.id (estimates)
  kind: ScheduleItemKind;
  contactId?: string; // maps from: Appointment.leadId
  contactName: string; // maps from: lead.contactName
  startAt: string; // ISO UTC; maps from: Appointment.startAt
  endAt: string; // maps from: Appointment.endAt
  allDay?: boolean; // multi-day jobs render as banners (new)
  status: "proposed" | "confirmed" | "completed" | "no_show" | "cancelled" | "shown" | "rescheduled";
  address?: string;
  town?: string;
  lat?: number; // maps from: none (TRAVEL_ROUTING geocode block)
  lng?: number;
  bookedBy: "sarah" | "owner";
  syncState?: string; // maps from: Appointment.syncState
  notes?: string;
}

export interface RouteLeg {
  from: string; // ScheduleItem id or 'base'
  to: string;
  driveMinutes: number;
  miles: number;
  approx: boolean; // haversine fail-open marker → "≈" prefix
}

/** Computed per local day — PREVIEW until travel routing ships (TRAVEL_ROUTING). */
export interface RoutePlan {
  date: string; // YYYY-MM-DD local
  baseLabel: string;
  stopIds: string[];
  legs: RouteLeg[];
  gaps: { label: string; minutes: number; usable: boolean }[];
  bufferMinutes: number;
  totalDriveMinutes: number;
  totalMiles: number;
}

export interface CalendarSyncStatus {
  state: "not_connected" | "connected" | "needs_reconnect";
  email?: string;
}
