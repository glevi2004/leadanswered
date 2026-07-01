# Scheduler

`Scheduler` is the **booking authority**. Our Postgres `Appointment` table is **always** the
source of truth; `book()` relies on DB constraints (a `btree_gist` EXCLUDE preventing
overlapping active appointments per contractor, plus partial unique indexes) — not JS checks —
to make double-booking impossible even under concurrency. Availability = the contractor's standing
weekly **windows** — **local wall-clock** times in their IANA timezone, converted to UTC instants
(DST-correct, via luxon in `packages/core/timezone.ts`) by `computeOpenWindows` — minus `getBusyTimes`
(our active appointments). Appointment `startAt/endAt` are stored as **UTC instants**; the
`Appointment.timezone` column records the zone booked in.

## Calendar integration (DEFERRED — seam only today)

We will let contractors connect Google Calendar (and others), but a provider is **never** the
source of truth and **never** in the booking transaction — it's a decoupled, **one-way** sync
target. When that feature ships it slots in here without touching the booking core:

- **`getBusyTimes`** — also merge the provider's free/busy (so we avoid the contractor's personal
  events), via a `CalendarSync.getBusyTimes(contractorId, window)`.
- **`book`** — after the local insert commits, enqueue a best-effort push that creates the event
  in the connected calendar and writes `externalEventId` + `syncState=synced` (retried on failure;
  a failed push never blocks or races a booking).
- **`cancel`/`reschedule`** — mirror to delete/update the external event.

The plumbing is already in place: the `CalendarConnection` model (per contractor) and the unused
`Appointment.externalProvider/externalEventId/externalCalendarId/syncState/syncedAt` columns.
No OAuth or provider code exists yet — only this seam.
