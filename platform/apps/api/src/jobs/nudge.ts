import { fireNotification, type NotifyDeps } from "../notify.js";

export interface NudgeDeps extends NotifyDeps {
  now: Date;
}

const NUDGE_TEXT =
  "Hey, just checking in! Still interested in getting that free on-site estimate booked? Happy to find a time that works for you.";

/**
 * Send ONE gentle follow-up to a lead who's gone quiet (SCOPE §5). Runs in the
 * worker after a delay. Skips if the lead already replied (last message is
 * inbound), already booked/disqualified, or was already nudged — so it never
 * spams. Fires `lead_unresponsive` for contractors who want stalled-lead alerts.
 */
export async function runNudgeJob(
  deps: NudgeDeps,
  leadId: string,
): Promise<"nudged" | "skipped"> {
  const ctx = await deps.store.getContextByLeadId(leadId);
  if (!ctx) return "skipped";
  if (["booked", "disqualified", "no_response"].includes(ctx.lead.status)) return "skipped";

  const last = ctx.messages.at(-1);
  if (!last || last.direction !== "outbound") return "skipped"; // lead replied → not quiet

  await deps.store.appendMessage(ctx.conversation.id, { direction: "outbound", body: NUDGE_TEXT });
  try {
    await deps.sms.send(ctx.lead.contactPhone, NUDGE_TEXT);
  } catch (e) {
    console.error("[nudge] send failed:", e);
  }
  await deps.store.updateLeadFields(ctx.lead.id, { status: "no_response" });
  await fireNotification(deps, ctx, "lead_unresponsive", ctx.conversation.gathered ?? {}, null);
  return "nudged";
}
