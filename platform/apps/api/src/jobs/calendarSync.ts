import { safeZone } from "@leadanswered/core";
import type { Store } from "../store/types.js";
import { GoogleAuthError } from "../calendar/google/client.js";
import { googleClientFor } from "../calendar/google/service.js";

/**
 * Outbound calendar push (GOOGLE_CALENDAR.md §10): mirror a booking change to the contractor's Google
 * Calendar. Idempotent on `externalEventId` (a create that already has an event patches it; a delete of
 * a missing event is a no-op). Records `externalEtag` for inbound loop prevention. Throws on failure so
 * BullMQ retries; after retries the appointment is marked `push_failed` (the booking stays valid).
 */
export async function runCalendarPush(
  deps: { store: Store; now?: () => Date },
  appointmentId: string,
  op: "create" | "update" | "delete",
): Promise<void> {
  const nowIso = (deps.now ?? (() => new Date()))().toISOString();
  const appt = await deps.store.getAppointmentById(appointmentId);
  if (!appt) return;
  const conn = await deps.store.getCalendarConnection(appt.contractorId, "google");
  if (!conn || conn.status !== "connected" || !conn.externalCalendarId) return;
  const client = googleClientFor(deps.store, conn);
  if (!client) return;
  const calId = conn.externalCalendarId;

  try {
    if (op === "delete") {
      if (appt.externalEventId) await client.deleteEvent(calId, appt.externalEventId);
      await deps.store.updateAppointmentSync(appointmentId, {
        syncState: "synced",
        externalEventId: null,
        externalEtag: null,
        syncedAt: nowIso,
      });
      return;
    }

    const ctx = await deps.store.getContextByLeadId(appt.leadId);
    const tz = safeZone(ctx?.contractor.standingAvailability?.timezone);
    const lead = ctx?.lead;
    const event = {
      summary: `Estimate — ${lead?.contactName ?? "Lead"}`,
      description: lead ? `Customer: ${lead.contactName} (${lead.contactPhone})` : undefined,
      location: ctx?.conversation.gathered?.fullAddress ?? undefined,
      startIso: appt.startIso,
      endIso: appt.endIso,
      timeZone: tz,
    };

    // Idempotent: if we already have an event id, PATCH (covers create-retries + updates); else INSERT.
    const remote = appt.externalEventId
      ? await client.patchEvent(calId, appt.externalEventId, event)
      : await client.insertEvent(calId, event);

    await deps.store.updateAppointmentSync(appointmentId, {
      externalProvider: "google",
      externalCalendarId: calId,
      externalEventId: remote.id,
      externalEtag: remote.etag,
      syncState: "synced",
      syncedAt: nowIso,
    });
  } catch (e) {
    if (e instanceof GoogleAuthError) {
      await deps.store.upsertCalendarConnection(appt.contractorId, "google", { status: "needs_reconnect" }).catch(() => {});
    }
    await deps.store.updateAppointmentSync(appointmentId, { syncState: "push_failed" }).catch(() => {});
    throw e; // let BullMQ retry
  }
}
