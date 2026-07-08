import { formatSlot, safeZone, type SmsSender } from "@leadanswered/core";
import { Scheduler } from "./scheduler/scheduler.js";
import { enqueueCalendarPush } from "./queue.js";
import { stageLeadNotice } from "./agent/contractorAgent.js";
import { useGoogleCalendar } from "./env.js";
import type { Store } from "./store/types.js";

/**
 * The ONE handler for a contractor-initiated appointment change (GOOGLE_CALENDAR.md §2). Dashboard,
 * Google, or (later) an SMS to Sarah are just triggers into this:
 *   1. update OUR DB (the Scheduler + EXCLUDE constraint stay authoritative),
 *   2. mirror to Google UNLESS the change originated there (loop prevention),
 *   3. stage a "let the lead know" draft + ASK the contractor to confirm (the hard gate) — the lead is
 *      texted only on the owner's explicit "yes" (handled by the contractor agent).
 */

export interface AppointmentChangeDeps {
  store: Store;
  sms: SmsSender;
  now?: () => Date;
}

export type AppointmentChange =
  | { type: "cancel"; reason?: string }
  | { type: "reschedule"; newStartIso: string };

export interface ChangeOpts {
  source: "dashboard" | "google" | "sms";
  /** Push the change to Google. FALSE when the change originated in Google (it's already there). */
  pushToGoogle: boolean;
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n.trim();

export async function applyContractorChange(
  deps: AppointmentChangeDeps,
  appointmentId: string,
  change: AppointmentChange,
  opts: ChangeOpts,
): Promise<{ ok: boolean; reason?: string }> {
  const nowIso = (deps.now ?? (() => new Date()))().toISOString();
  const appt = await deps.store.getAppointmentById(appointmentId);
  if (!appt) return { ok: false, reason: "not_found" };
  const ctx = await deps.store.getContextByLeadId(appt.leadId);
  if (!ctx) return { ok: false, reason: "lead_not_found" };
  const scheduler = new Scheduler(deps.store);
  const tz = safeZone(ctx.contractor.standingAvailability?.timezone);
  const name = firstName(ctx.lead.contactName);

  let noticeMsg: string;
  let verb: string;
  if (change.type === "cancel") {
    await scheduler.cancel(appointmentId, change.reason ?? null, nowIso);
    await deps.store.updateLeadFields(ctx.lead.id, { status: "contacted" }); // re-open for a re-book
    await deps.store.updateConversation(ctx.conversation.id, { state: "agent" });
    noticeMsg = `Hi ${name}, I'm sorry but we had to cancel your upcoming estimate. Would you like to find another time?`;
    verb = "cancelled";
  } else {
    const res = await scheduler.reschedule(appointmentId, change.newStartIso);
    if (!res.ok) return { ok: false, reason: res.reason };
    noticeMsg = `Hi ${name}, your estimate has been moved to ${formatSlot(change.newStartIso, tz)}. Does that still work for you?`;
    verb = `moved to ${formatSlot(change.newStartIso, tz)}`;
  }

  // Mirror to Google unless the change ORIGINATED there (loop prevention — §2 step 2 / §9).
  if (opts.pushToGoogle && useGoogleCalendar()) {
    await enqueueCalendarPush(appointmentId, change.type === "cancel" ? "delete" : "update").catch(() => {});
  }

  // HARD GATE — ask the contractor before texting the lead; never auto-texts (§2 step 4).
  stageLeadNotice(ctx.contractor.id, { leadId: ctx.lead.id, leadName: ctx.lead.contactName, message: noticeMsg });
  const where = opts.source === "google" ? " in your calendar" : "";
  const ask =
    `Heads up: ${ctx.lead.contactName}'s estimate was ${verb}${where}. Want me to let them know? ` +
    `Reply "yes" and I'll text them:\n\n"${noticeMsg}"`;
  const recipients = await deps.store.getRecipients(ctx.contractor.id);
  for (const r of recipients) {
    if (r.phone) await deps.sms.send(r.phone, ask).catch((e) => console.error("[calendar-change] ask failed:", e));
  }
  return { ok: true };
}
