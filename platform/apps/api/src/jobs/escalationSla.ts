import { isWithinBusinessHours } from "@leadanswered/core";
import { runProactiveTurn, type ProactiveDeps } from "../proactiveTurn.js";
import { enqueueEscalationSla } from "../queue.js";
import type { RecipientRecord } from "../store/types.js";

export type EscalationSlaDeps = ProactiveDeps;

/**
 * Escalation SLA (SCOPE §9.7). A loop-in the organization hasn't answered gets chased:
 * stage 1 re-pings the owner (louder) + a positive customer reassurance (business hours only),
 * then schedules stage 2; stage 2 expires it with an urgent OWNER-ONLY alert — we never tell the
 * customer we couldn't reach the team. No-op once the escalation is resolved/expired.
 */
export async function runEscalationSlaJob(
  deps: EscalationSlaDeps,
  escalationId: string,
  stage: 1 | 2,
): Promise<"acted" | "skipped"> {
  const esc = await deps.store.getEscalation(escalationId);
  if (!esc || esc.status !== "open") return "skipped"; // answered/expired already

  const ctx = await deps.store.getContextByLeadId(esc.leadId);
  if (!ctx) return "skipped";
  const recipients = await deps.store.getRecipients(esc.organizationId);
  const who = `${ctx.lead.contactName} (${ctx.lead.contactPhone})`;

  if (stage === 1) {
    await pingOwners(deps, recipients, `⏰ Reminder: ${who} is still waiting on: ${esc.question}\nReply to this text to answer them.`);
    // Positive, business-hours-only reassurance to the customer (never mentions a delay).
    if (isWithinBusinessHours(ctx.organization.standingAvailability, deps.now)) {
      await runProactiveTurn(deps, esc.leadId, "escalation_followup");
    }
    await enqueueEscalationSla(escalationId, 2);
    return "acted";
  }

  // stage 2 — expire (owner-only; no customer message).
  const expired = await deps.store.expireEscalation(escalationId);
  if (!expired) return "skipped"; // resolved in the meantime
  await pingOwners(deps, recipients, `⚠️ Still unanswered: ${who} asked "${esc.question}". Please follow up with them directly.`);
  return "acted";
}

async function pingOwners(deps: EscalationSlaDeps, recipients: RecipientRecord[], body: string): Promise<void> {
  for (const r of recipients) {
    if (!r.phone) continue;
    try {
      await deps.sms.send(r.phone, body);
    } catch (e) {
      console.error("[escalation-sla] owner ping failed:", e);
    }
  }
}
