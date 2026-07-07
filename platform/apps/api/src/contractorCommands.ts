import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import type { SmsSender } from "@leadanswered/core";
import type { LeadRecord, Store } from "./store/types.js";
import type { InboundResult } from "./conversationService.js";

/**
 * Contractor → assistant commands. When a contractor texts the assistant number and
 * there's no open escalation, they can direct it like an employee: "text Levi that we can
 * start Monday". The MODEL only parses intent; everything else is deterministic — a
 * disambiguation step when the name is ambiguous, and an explicit yes/no confirmation
 * before ANY message reaches a customer.
 *
 * Pending state is in-memory (single api replica, short-lived: command → confirm within
 * minutes). It resets on redeploy, which just means re-issuing the command.
 */

interface PendingCommand {
  stage: "awaiting_choice" | "awaiting_confirm";
  message: string;
  candidateLeadIds?: string[];
  targetLeadId?: string;
  expiresAt: number;
}

const TTL_MS = 15 * 60 * 1000;
const pending = new Map<string, PendingCommand>();

function getPending(contractorId: string): PendingCommand | null {
  const p = pending.get(contractorId);
  if (!p) return null;
  if (Date.now() > p.expiresAt) {
    pending.delete(contractorId);
    return null;
  }
  return p;
}
function setPending(contractorId: string, cmd: Omit<PendingCommand, "expiresAt">): void {
  pending.set(contractorId, { ...cmd, expiresAt: Date.now() + TTL_MS });
}
function clearPending(contractorId: string): void {
  pending.delete(contractorId);
}
/** Test-only: reset the in-memory pending-command state. */
export function __resetContractorCommands(): void {
  pending.clear();
}

export interface CommandDeps {
  store: Store;
  sms: SmsSender;
  model: LanguageModel;
}

/** Handle a contractor's text when there's no open escalation (a "contact a lead" command). */
export async function handleContractorCommand(
  deps: CommandDeps,
  contractor: { id: string; companyName: string },
  input: { fromNumber: string; body: string },
): Promise<InboundResult> {
  const { store, sms, model } = deps;
  const text = input.body.trim();
  const reply = (msg: string) =>
    sms.send(input.fromNumber, msg).catch((e) => console.error("[command] reply to contractor failed:", e));
  const p = getPending(contractor.id);

  // --- Stage: awaiting an explicit yes/no before sending ---
  if (p?.stage === "awaiting_confirm" && p.targetLeadId) {
    if (isYes(text)) {
      const ctx = await store.getContextByLeadId(p.targetLeadId);
      clearPending(contractor.id);
      if (!ctx) {
        await reply("Hmm, I can't find that lead anymore — try again?");
        return { status: "ok" };
      }
      const outbound = leadMessage(ctx.lead.contactName, p.message);
      await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: outbound });
      try {
        await sms.send(ctx.lead.contactPhone, outbound);
      } catch (e) {
        console.error("[command] send to lead failed:", e);
      }
      await reply(`Sent to ${ctx.lead.contactName} ✅`);
      return { status: "ok" };
    }
    if (isNo(text)) {
      clearPending(contractor.id);
      await reply("No problem, I won't send it.");
      return { status: "ok" };
    }
    await reply("Want me to send it? Reply yes or no.");
    return { status: "ok" };
  }

  // --- Stage: awaiting which lead (disambiguation) ---
  if (p?.stage === "awaiting_choice" && p.candidateLeadIds?.length) {
    const chosenId = pickByNumber(text, p.candidateLeadIds);
    if (!chosenId) {
      const leads = (await Promise.all(p.candidateLeadIds.map((id) => store.getContextByLeadId(id))))
        .map((c) => c?.lead)
        .filter((l): l is LeadRecord => Boolean(l));
      await reply("Which one? Reply with the number:\n" + numberedList(leads));
      return { status: "ok" };
    }
    const ctx = await store.getContextByLeadId(chosenId);
    if (!ctx) {
      clearPending(contractor.id);
      await reply("Hmm, that lead's gone — try again?");
      return { status: "ok" };
    }
    setPending(contractor.id, { stage: "awaiting_confirm", targetLeadId: chosenId, message: p.message });
    await reply(confirmPrompt(ctx.lead, p.message));
    return { status: "ok" };
  }

  // --- Stage: a fresh command ---
  const parsed = await parseCommand(model, text);
  if (parsed.action !== "contact_lead" || !parsed.leadName || !parsed.message) {
    await reply('I can pass a note to one of your leads — just tell me who and what, e.g. "text Levi that we can start Monday."');
    return { status: "ok" };
  }
  const matches = await store.findLeadsByName(contractor.id, parsed.leadName);
  if (matches.length === 0) {
    await reply(`I couldn't find a lead named "${parsed.leadName}." Want to double-check the name?`);
    return { status: "ok" };
  }
  if (matches.length > 1) {
    setPending(contractor.id, {
      stage: "awaiting_choice",
      candidateLeadIds: matches.map((m) => m.id),
      message: parsed.message,
    });
    await reply(`I found a few named "${parsed.leadName}" — which one?\n` + numberedList(matches));
    return { status: "ok" };
  }
  const lead = matches[0]!;
  setPending(contractor.id, { stage: "awaiting_confirm", targetLeadId: lead.id, message: parsed.message });
  await reply(confirmPrompt(lead, parsed.message));
  return { status: "ok" };
}

// ---- intent parsing (the only model-driven part) ----
const CommandSchema = z.object({
  action: z.enum(["contact_lead", "other"]),
  leadName: z.string().nullable(),
  message: z.string().nullable(),
});

async function parseCommand(model: LanguageModel, text: string): Promise<z.infer<typeof CommandSchema>> {
  try {
    const { object } = await generateObject({
      model,
      schema: CommandSchema,
      prompt:
        "A home-service contractor sent this text to their assistant. Decide if they want you to pass a message to one of their leads/customers.\n" +
        '- If yes: action="contact_lead", leadName = the customer\'s name, message = the note to send that customer in plain words (lightly cleaned up; do NOT add information they did not give).\n' +
        '- Anything else (a question, chit-chat, unclear): action="other".\n\n' +
        `Text: "${text}"`,
    });
    return object;
  } catch (e) {
    console.error("[command] parse failed:", e);
    return { action: "other", leadName: null, message: null };
  }
}

// ---- pure helpers ----
function leadDesc(l: LeadRecord): string {
  const bits = [l.projectHint, l.serviceTown ?? l.fullAddress].filter(Boolean);
  return bits.length ? ` (${bits.join(", ")})` : "";
}
function numberedList(leads: LeadRecord[]): string {
  return leads.map((l, i) => `${i + 1}. ${l.contactName}${leadDesc(l)}`).join("\n");
}
function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim();
}
function leadMessage(name: string, message: string): string {
  const m = message.trim();
  return `Hi ${firstName(name)}! ${m.charAt(0).toUpperCase()}${m.slice(1)}`;
}
function confirmPrompt(lead: LeadRecord, message: string): string {
  return `I'll text ${lead.contactName}${leadDesc(lead)}:\n\n"${leadMessage(lead.contactName, message)}"\n\nSend it? (yes/no)`;
}
function pickByNumber(text: string, ids: string[]): string | null {
  const m = text.match(/\b(\d{1,2})\b/);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= ids.length ? ids[n - 1]! : null;
}
const YES = /\b(yes|yep|yeah|yup|sure|ok|okay|send|confirm|do it|go|y)\b/i;
const NO = /\b(no|nope|nah|don'?t|cancel|stop|wait|n)\b/i;
function isYes(t: string): boolean {
  return YES.test(t) && !NO.test(t);
}
function isNo(t: string): boolean {
  return NO.test(t) && !YES.test(t);
}
