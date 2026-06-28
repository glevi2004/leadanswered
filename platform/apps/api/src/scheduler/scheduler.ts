import { APPOINTMENT_DURATION_MIN, subtractBusy, type SlotOption, type TimeRange } from "@leadanswered/core";
import type { BookOutcome, Store } from "../store/types.js";

/**
 * Booking authority. Our Postgres `Appointment` table (with the EXCLUDE + partial-unique
 * constraints) is ALWAYS the source of truth; `book` relies on those constraints — not JS —
 * to guarantee no double-booking. A calendar provider is a future ONE-WAY sync target
 * (push events out + merge free/busy in); the marked FUTURE seams are where it plugs in,
 * never inside the booking decision.
 */
export class Scheduler {
  constructor(private store: Store) {}

  /** Busy intervals for a window = our active appointments. FUTURE: merge external calendar free/busy. */
  async getBusyTimes(contractorId: string, window: TimeRange): Promise<TimeRange[]> {
    return this.store.getBusyTimes(contractorId, {
      startIso: window.startAt.toISOString(),
      endIso: window.endAt.toISOString(),
    });
  }

  /** Drop candidate slots that collide with busy time. UX guard; the DB constraint is the backstop. */
  async filterAvailable(
    contractorId: string,
    slots: SlotOption[],
    durationMin = APPOINTMENT_DURATION_MIN,
  ): Promise<SlotOption[]> {
    if (slots.length === 0) return slots;
    const starts = slots.map((s) => new Date(s.iso).getTime());
    const window: TimeRange = {
      startAt: new Date(Math.min(...starts)),
      endAt: new Date(Math.max(...starts) + durationMin * 60_000),
    };
    const busy = await this.getBusyTimes(contractorId, window);
    return subtractBusy(slots, busy, durationMin);
  }

  /** Reserve a slot. The DB EXCLUDE/unique constraints make a double-book impossible. */
  async book(input: {
    leadId: string;
    contractorId: string;
    startIso: string;
    timezone: string;
    durationMin?: number;
  }): Promise<BookOutcome> {
    const dur = input.durationMin ?? APPOINTMENT_DURATION_MIN;
    const endIso = new Date(new Date(input.startIso).getTime() + dur * 60_000).toISOString();
    return this.store.bookAppointment({
      leadId: input.leadId,
      contractorId: input.contractorId,
      startIso: input.startIso,
      endIso,
      timezone: input.timezone,
    });
    // FUTURE: on ok, enqueue a one-way push to the contractor's connected calendar (syncState=pending_push).
  }

  async reschedule(appointmentId: string, startIso: string, durationMin = APPOINTMENT_DURATION_MIN): Promise<BookOutcome> {
    const endIso = new Date(new Date(startIso).getTime() + durationMin * 60_000).toISOString();
    return this.store.rescheduleAppointment(appointmentId, startIso, endIso);
  }

  async cancel(appointmentId: string, reason: string | null, nowIso: string): Promise<void> {
    await this.store.updateAppointment(appointmentId, {
      status: "cancelled",
      cancelledAt: nowIso,
      cancelReason: reason,
    });
    // FUTURE: delete the mirrored external calendar event.
  }
}
