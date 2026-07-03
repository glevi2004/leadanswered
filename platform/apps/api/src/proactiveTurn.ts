import { generateText, type LanguageModel, type ModelMessage } from "ai";
import { sanitizeReply } from "@leadanswered/core";
import { fireNotification, type NotifyDeps } from "./notify.js";
import type { LeadContext } from "./store/types.js";

export interface ProactiveDeps extends NotifyDeps {
  model: LanguageModel;
  now: Date;
}

/** System-initiated check-ins that MAY stay silent — unlike an opening turn, which always speaks. */
export type ProactiveSituation = "quiet_followup" | "escalation_followup";

/** The model replies with this exact token when no follow-up is worth sending. */
const SILENT = "SILENT";

function toMessages(ctx: LeadContext): ModelMessage[] {
  return ctx.messages
    .filter((m) => m.body && m.body.trim() !== "")
    .map((m): ModelMessage => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.body }));
}

function quietFollowupSystem(ctx: LeadContext): string {
  const c = ctx.contractor;
  return [
    `You are ${c.sarahName}, the friendly assistant for ${c.companyName}. You represent ${c.companyName} warmly and professionally, and you text like a real person.`,
    c.personaNotes ? `Persona notes: ${c.personaNotes}` : "",
    "",
    "SITUATION: this customer went quiet after your last message and hasn't replied. Decide whether ONE brief, warm follow-up would genuinely help right now.",
    "- Base it on THIS conversation and what they actually wanted. Do NOT assume they wanted a free estimate unless the thread is clearly about booking one.",
    "- Keep it to one or two short, human sentences. No em-dashes. Never quote a price and never invent details.",
    `- If a follow-up would just be noise (nothing genuinely useful to add), reply with exactly the single word ${SILENT} and nothing else.`,
    "Otherwise reply with ONLY the SMS text to send (no labels, no quotes).",
  ]
    .filter(Boolean)
    .join("\n");
}

function escalationFollowupSystem(ctx: LeadContext): string {
  const c = ctx.contractor;
  return [
    `You are ${c.sarahName}, the friendly assistant for ${c.companyName}. You represent ${c.companyName} warmly and professionally, and you text like a real person.`,
    c.personaNotes ? `Persona notes: ${c.personaNotes}` : "",
    "",
    "SITUATION: you looped the team in on this customer's question and are still getting them an answer. Send ONE brief, warm, POSITIVE reassurance that you're on it (for example: still working on getting you an answer, hang tight!).",
    "- One short, human sentence. No em-dashes. Always sound upbeat and in control.",
    `- If a reassurance would just be noise, reply with exactly the single word ${SILENT} and nothing else.`,
    "Otherwise reply with ONLY the SMS text to send.",
  ]
    .filter(Boolean)
    .join("\n");
}

function systemFor(situation: ProactiveSituation, ctx: LeadContext): string {
  return situation === "escalation_followup" ? escalationFollowupSystem(ctx) : quietFollowupSystem(ctx);
}

/**
 * Run one system-initiated check-in that may stay silent (SCOPE §5). It LOOKS at the
 * conversation and decides whether a contextual follow-up is worth sending — replacing the old
 * static template string. Lifecycle-gated per situation. Traced as `proactive-<situation>`.
 */
export async function runProactiveTurn(
  deps: ProactiveDeps,
  leadId: string,
  situation: ProactiveSituation,
): Promise<"sent" | "skipped"> {
  const ctx = await deps.store.getContextByLeadId(leadId);
  if (!ctx) return skip(situation, leadId, "no_context");

  // --- Lifecycle gates ---
  if (situation === "quiet_followup") {
    if (ctx.lead.status === "booked" || ctx.lead.status === "disqualified")
      return skip(situation, leadId, "terminal_status");
    const last = ctx.messages.at(-1);
    if (!last || last.direction !== "outbound") return skip(situation, leadId, "lead_replied");
    // Waiting on the contractor (open escalation) → they're not "quiet", don't nudge them.
    if (await deps.store.findOpenEscalationByLead(leadId)) return skip(situation, leadId, "open_escalation");
    // One nudge per interaction (cleared at an interaction boundary).
    if ((ctx.conversation.gathered ?? {}).nudgedAt) return skip(situation, leadId, "already_nudged");
  }

  // --- Dynamic decision (contextual message, or silence) ---
  let reply: string;
  try {
    const result = await generateText({
      model: deps.model,
      system: systemFor(situation, ctx),
      messages: toMessages(ctx),
      experimental_telemetry: {
        isEnabled: true,
        functionId: `proactive-${situation}`,
        metadata: {
          sessionId: ctx.conversation.id,
          userId: ctx.contractor.id,
          leadId,
          contractorId: ctx.contractor.id,
          tags: ["proactive", situation],
        },
      },
    });
    reply = result.text.trim();
  } catch (e) {
    console.error(`[proactive:${situation}] decision failed for ${leadId}:`, e);
    return skip(situation, leadId, "decision_error");
  }

  if (!reply || reply.toUpperCase() === SILENT) return skip(situation, leadId, "stayed_silent");

  const body = sanitizeReply(reply);
  await deps.store.appendMessage(ctx.conversation.id, { direction: "outbound", body });
  try {
    await deps.sms.send(ctx.lead.contactPhone, body);
  } catch (e) {
    console.error(`[proactive:${situation}] send failed for ${ctx.lead.contactPhone}:`, e);
  }

  if (situation === "quiet_followup") {
    const gathered = { ...(ctx.conversation.gathered ?? {}), nudgedAt: deps.now.toISOString() };
    await deps.store.updateConversation(ctx.conversation.id, { gathered });
    // Now that we've genuinely followed up on a quiet lead: label it + alert subscribed recipients.
    await deps.store.updateLeadFields(ctx.lead.id, { status: "no_response" });
    await fireNotification(deps, ctx, "lead_unresponsive", gathered, null);
  }
  logProactiveDecision(situation, leadId, "sent", "ok");
  return "sent";
}

function skip(situation: ProactiveSituation, leadId: string, reason: string): "skipped" {
  logProactiveDecision(situation, leadId, "skipped", reason);
  return "skipped";
}

/** Structured decision record for EVERY proactive attempt (sent + every skip/silence) — so
 *  "why did / didn't Sarah send that?" is always answerable in the logs (SCOPE §7.5 / P3). */
function logProactiveDecision(
  situation: ProactiveSituation,
  leadId: string,
  decision: "sent" | "skipped",
  reason: string,
): void {
  console.log(`[proactive] ${JSON.stringify({ situation, leadId, decision, reason })}`);
}
