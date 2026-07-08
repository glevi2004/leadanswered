import { generateText, stepCountIs } from "ai";
import { sanitizeReply, type ContractorConfig } from "@leadanswered/core";
import type { AgentDeps } from "./runner.js";
import { buildContractorTools, type ContractorDraft } from "./contractorTools.js";
import type { InboundResult } from "../conversationService.js";
import type { LeadContext } from "../store/types.js";

/**
 * The CONTRACTOR agent (Workflow 3) — always agent, no script. The owner texts the assistant like an
 * employee: pass a note to a lead, look someone up, answer a flagged question. The send is a HARD GATE:
 * the agent only STAGES a draft (prepare_message_to_lead); code sends it only after the owner's explicit
 * yes. Pending state is in-memory (single api replica, short-lived command→confirm).
 */

interface Pending { leadId: string; leadName: string; message: string; expiresAt: number }
const TTL_MS = 15 * 60 * 1000;
const pending = new Map<string, Pending>();

function getPending(id: string): Pending | null {
  const p = pending.get(id);
  if (!p) return null;
  if (Date.now() > p.expiresAt) { pending.delete(id); return null; }
  return p;
}
/** Test-only: reset the in-memory pending-draft state. */
export function __resetContractorAgent(): void { pending.clear(); }

const firstName = (n: string) => n.trim().split(/\s+/)[0] || n.trim();
const YES = /\b(yes|yep|yeah|yup|sure|ok|okay|send|confirm|do it|go|y)\b/i;
const NO = /\b(no|nope|nah|don'?t|cancel|stop|wait|n)\b/i;
const isYes = (t: string) => YES.test(t) && !NO.test(t);
const isNo = (t: string) => NO.test(t) && !YES.test(t);

function systemPrompt(c: ContractorConfig): string {
  return [
    `You are ${c.sarahName}, the text assistant for ${c.companyName}. You are now talking to the CONTRACTOR (the owner — your boss), NOT a customer.`,
    `They may ask you to pass a note to one of their leads/customers, look someone up, or answer something.`,
    `To pass a note: call find_leads to find who they mean. If more than one matches, ASK which one — list them by name, project, and area. Never guess.`,
    `Once you know the exact lead and the message, call prepare_message_to_lead with the note in your own warm, natural words (do not add facts they didn't give). Then READ THE MESSAGE BACK to the contractor and ask "Send it?" — do NOT claim it's sent. Code sends it only after they confirm with a yes.`,
    `If you can't find the lead, say so and ask them to double-check the name. Keep replies short and plain. Never use em-dashes.`,
  ].join("\n");
}

/** A contractor's text when there's NO open escalation → treat as a command (pass a note / look up). */
export async function handleContractorTurn(
  deps: AgentDeps,
  contractor: ContractorConfig,
  input: { fromNumber: string; body: string },
): Promise<InboundResult> {
  const text = input.body.trim();
  const reply = (m: string) => deps.sms.send(input.fromNumber, m).catch((e) => console.error("[contractor] reply failed:", e));

  // Awaiting a yes/no on a staged draft — this confirmation is CODE-gated, not left to the model.
  const p = getPending(contractor.id);
  if (p) {
    if (isYes(text)) {
      pending.delete(contractor.id);
      const ctx = await deps.store.getContextByLeadId(p.leadId);
      if (!ctx) { await reply("Hmm, I can't find that lead anymore — try again?"); return { status: "ok" }; }
      await deps.store.appendMessage(ctx.conversation.id, { direction: "outbound", body: p.message });
      try { await deps.sms.send(ctx.lead.contactPhone, p.message); } catch (e) { console.error("[contractor] send to lead failed:", e); }
      await reply(`Done! Sent to ${firstName(ctx.lead.contactName)} ✅`);
      return { status: "ok" };
    }
    if (isNo(text)) { pending.delete(contractor.id); await reply("No problem, I won't send it."); return { status: "ok" }; }
    pending.delete(contractor.id); // neither yes nor no → treat as a fresh command below
  }

  // Fresh command → run the agent to parse / disambiguate / draft (it only STAGES; it can't send).
  const draft: ContractorDraft = {};
  const tools = buildContractorTools(deps.store, contractor.id, draft);
  let text_out: string;
  try {
    const result = await generateText({
      model: deps.model,
      system: systemPrompt(contractor),
      messages: [{ role: "user", content: text }],
      tools,
      stopWhen: stepCountIs(4),
      experimental_telemetry: { isEnabled: true, functionId: "contractor-agent" },
    });
    text_out = result.text.trim();
  } catch (e) {
    console.error("[contractor] agent error:", e);
    return { status: "error" };
  }

  if (draft.pending) setPending(contractor.id, draft.pending);
  await reply(sanitizeReply(text_out || 'I can pass a note to one of your leads — just tell me who and what, e.g. "text Levi we can start Monday."'));
  return { status: "ok" };
}

function setPending(id: string, d: { leadId: string; leadName: string; message: string }): void {
  pending.set(id, { ...d, expiresAt: Date.now() + TTL_MS });
}

/** Compose the escalation-answer relay to the customer IN SARAH'S OWN WORDS (not a rigid template). */
export async function composeEscalationRelay(
  deps: AgentDeps,
  contractor: ContractorConfig,
  leadCtx: LeadContext,
  answer: string,
): Promise<string> {
  try {
    const result = await generateText({
      model: deps.model,
      system:
        `You are ${contractor.sarahName} from ${contractor.companyName}, texting the customer ${leadCtx.lead.contactName}. ` +
        `The team just got back to you with the answer to their question. Relay it to the customer warmly and briefly, in your own words. ` +
        `Don't invent anything beyond the answer. Never use em-dashes.`,
      messages: [{ role: "user", content: `The team's answer: "${answer}"` }],
      experimental_telemetry: { isEnabled: true, functionId: "escalation-relay" },
    });
    const text = result.text.trim();
    if (text) return sanitizeReply(text);
  } catch (e) {
    console.error("[contractor] relay compose failed:", e);
  }
  // Fallback if the model gives nothing — still warm, no rigid company preamble.
  return sanitizeReply(`Hi ${firstName(leadCtx.lead.contactName)}! Quick update from the team: ${answer}`);
}
