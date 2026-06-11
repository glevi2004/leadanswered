import {
  assembleSystemPrompt,
  proposeSlots,
  qualify,
  type SmsSender,
} from "@leadanswered/core";
import type { Store } from "./store/types.js";
import type { SarahAi } from "./claude.js";

export interface LeadDeps {
  store: Store;
  ai: SarahAi;
  sms: SmsSender;
  now?: () => Date;
}

export interface CreateLeadArgs {
  contractorId: string;
  contactName: string;
  contactPhone: string;
  projectHint?: string | null;
}

/**
 * Lead intake (SCOPE §6 Phase 1): create the lead + conversation and fire Sarah's
 * opening SMS immediately (sub-60-second promise, SCOPE §7).
 */
export async function createLeadAndGreet(
  deps: LeadDeps,
  input: CreateLeadArgs,
): Promise<{ leadId: string; opening: string }> {
  const { store, ai, sms } = deps;
  const now = (deps.now ?? (() => new Date()))();

  const ctx = await store.createLeadWithConversation({
    contractorId: input.contractorId,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    projectHint: input.projectHint ?? null,
    source: "manual",
  });

  const gathered = ctx.conversation.gathered;
  const qualification = qualify(gathered, ctx.contractor);
  const slots = proposeSlots(ctx.contractor.standingAvailability, 3, now);
  const systemPrompt = assembleSystemPrompt({
    contractor: ctx.contractor,
    leadName: ctx.lead.contactName,
    gathered,
    qualification,
    slots,
    stage: "greeting",
  });

  const out = await ai.generate(systemPrompt, [
    { role: "user", content: openingTrigger(input.projectHint) },
  ]);

  await store.appendMessage(ctx.conversation.id, {
    direction: "outbound",
    body: out.reply,
  });
  await sms.send(ctx.lead.contactPhone, out.reply);
  await store.updateLeadFields(ctx.lead.id, { status: "contacted" });
  await store.updateConversation(ctx.conversation.id, { state: "qualifying" });

  return { leadId: ctx.lead.id, opening: out.reply };
}

function openingTrigger(projectHint?: string | null): string {
  return (
    `[A new lead just came in through the website` +
    (projectHint ? ` about "${projectHint}"` : "") +
    `. Send your warm opening text: introduce yourself, thank them for reaching out, and start gathering what you need.]`
  );
}
