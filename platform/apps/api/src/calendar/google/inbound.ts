import type { SmsSender } from "@leadanswered/core";
import type { Store } from "../../store/types.js";
import { applyOwnerChange } from "../../appointmentChange.js";
import { GoogleAuthError, GoogleSyncGone, type RemoteEvent } from "./client.js";
import { googleClientFor } from "./service.js";

/**
 * Inbound two-way sync (GOOGLE_CALENDAR.md §9): pull the organization's changed events (incremental via
 * syncToken) and reconcile the ones that map to OUR appointments — a move/cancel in Google flows into
 * `applyOwnerChange` (source "google", pushToGoogle FALSE — it's already in Google). Foreign events
 * are just busy blocks (honored at read time), so they're ignored here.
 */

export interface InboundDeps {
  store: Store;
  sms: SmsSender;
  now?: () => Date;
}

export async function runInboundSync(deps: InboundDeps, organizationId: string): Promise<void> {
  const conn = await deps.store.getCalendarConnection(organizationId, "google");
  if (!conn || conn.status !== "connected" || !conn.externalCalendarId) return;
  const client = googleClientFor(deps.store, conn);
  if (!client) return;
  const nowIso = (deps.now ?? (() => new Date()))().toISOString();

  try {
    let result;
    try {
      result = await client.listChanged(
        conn.externalCalendarId,
        conn.syncToken ? { syncToken: conn.syncToken } : { timeMin: nowIso },
      );
    } catch (e) {
      if (e instanceof GoogleSyncGone) {
        // Token expired → reseed from now (we only care about our upcoming events).
        result = await client.listChanged(conn.externalCalendarId, { timeMin: nowIso });
      } else throw e;
    }
    for (const ev of result.events) await reconcile(deps, organizationId, ev);
    if (result.nextSyncToken) {
      await deps.store.upsertCalendarConnection(organizationId, "google", { syncToken: result.nextSyncToken });
    }
  } catch (e) {
    if (e instanceof GoogleAuthError) {
      await deps.store.upsertCalendarConnection(organizationId, "google", { status: "needs_reconnect" }).catch(() => {});
    } else {
      console.error("[calendar] inbound sync failed:", e);
    }
  }
}

async function reconcile(deps: InboundDeps, organizationId: string, ev: RemoteEvent): Promise<void> {
  const appt = await deps.store.findAppointmentByExternalEventId(organizationId, ev.id);
  if (!appt) return; // foreign event → a busy block, handled at read time; not ours
  // LOOP PREVENTION: our own push echoes back with the etag we stored — skip it.
  if (appt.externalEtag && ev.etag && appt.externalEtag === ev.etag) return;
  if (appt.status !== "confirmed" && appt.status !== "proposed") return; // already terminal locally

  if (ev.status === "cancelled") {
    await applyOwnerChange(
      deps,
      appt.id,
      { type: "cancel", reason: "cancelled in Google Calendar" },
      { source: "google", pushToGoogle: false },
    );
  } else if (ev.startIso) {
    const newIso = new Date(ev.startIso).toISOString();
    if (newIso !== appt.startIso) {
      await applyOwnerChange(deps, appt.id, { type: "reschedule", newStartIso: newIso }, { source: "google", pushToGoogle: false });
    }
  }
  // Record the new etag so a later sync of the same version is a no-op.
  if (ev.etag) await deps.store.updateAppointmentSync(appt.id, { externalEtag: ev.etag });
}
