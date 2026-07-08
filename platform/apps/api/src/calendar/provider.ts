import {
  computeOpenWindows,
  safeZone,
  type AvailabilityQuery,
  type ContractorConfig,
  type OpenWindow,
  type TimeRange,
} from "@leadanswered/core";
import { Scheduler } from "../scheduler/scheduler.js";
import { useGoogleCalendar } from "../env.js";
import { googleBusy } from "./google/service.js";
import type { BookOutcome, Store } from "../store/types.js";

/**
 * The calendar Sarah reads + writes — a stable PORT (Ports & Adapters). The agent only ever talks to
 * this interface, never an implementation, so the contractor's real Google Calendar can drop in later
 * as another adapter (that's where MCP lives) with ZERO agent changes.
 */
export interface CalendarProvider {
  /** Open, bookable windows in a range (+ optional day/part-of-day filter). */
  getAvailability(query: AvailabilityQuery): Promise<OpenWindow[]>;
  book(input: { leadId: string; startIso: string; durationMin?: number }): Promise<BookOutcome>;
  reschedule(appointmentId: string, startIso: string, durationMin?: number): Promise<BookOutcome>;
  cancel(appointmentId: string, reason: string | null, nowIso: string): Promise<void>;
  getBusy(range: { startIso: string; endIso: string }): Promise<TimeRange[]>;
}

/**
 * Adapter over OUR data: the contractor's standing weekly windows minus booked appointments (Postgres).
 * Booking goes through the Scheduler, whose DB EXCLUDE constraints are the real double-booking backstop.
 * Bound to one contractor + `now` for the turn.
 */
export class InternalCalendarProvider implements CalendarProvider {
  private scheduler: Scheduler;
  constructor(
    private store: Store,
    private contractor: ContractorConfig,
    private now: Date,
  ) {
    this.scheduler = new Scheduler(store);
  }

  /** The contractor's IANA timezone — availability windows are wall-clock times in this zone. */
  tz(): string {
    return safeZone(this.contractor.standingAvailability?.timezone);
  }

  async getBusy(range: { startIso: string; endIso: string }): Promise<TimeRange[]> {
    const dbBusy = await this.store.getBusyTimes(this.contractor.id, range);
    if (!useGoogleCalendar()) return dbBusy;
    // Merge the contractor's Google busy blocks so Sarah won't offer a slot they're busy on (§7.1).
    // Fail-open: googleBusy returns [] on any error, so Google never blocks availability.
    const gBusy = await googleBusy(this.store, this.contractor.id, range);
    return gBusy.length ? [...dbBusy, ...gBusy] : dbBusy;
  }

  async getAvailability(query: AvailabilityQuery): Promise<OpenWindow[]> {
    const busy = await this.getBusy({ startIso: query.fromIso, endIso: query.toIso });
    return computeOpenWindows(
      this.contractor.standingAvailability?.windows ?? [],
      query,
      busy,
      this.now,
      this.tz(),
    );
  }

  book(input: { leadId: string; startIso: string; durationMin?: number }): Promise<BookOutcome> {
    return this.scheduler.book({
      leadId: input.leadId,
      contractorId: this.contractor.id,
      startIso: input.startIso,
      timezone: this.tz(),
      durationMin: input.durationMin,
    });
  }

  reschedule(appointmentId: string, startIso: string, durationMin?: number): Promise<BookOutcome> {
    return this.scheduler.reschedule(appointmentId, startIso, durationMin);
  }

  cancel(appointmentId: string, reason: string | null, nowIso: string): Promise<void> {
    return this.scheduler.cancel(appointmentId, reason, nowIso);
  }
}
