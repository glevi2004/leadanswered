import type { SmsSender } from "@leadanswered/core";
import type { LanguageModel } from "ai";
import { generateAgentReply, type ChatTurn } from "./agent/runner.js";
import type { ToolState } from "./agent/tools.js";
import type { Store } from "./store/types.js";

export interface LeadDeps {
  store: Store;
  model: LanguageModel;
  sms: SmsSender;
  now?: () => Date;
}

export interface CreateLeadArgs {
  contractorId: string;
  contactName: string;
  contactPhone: string;
  projectHint?: string | null;
  /** Where the lead came from (e.g. "manual", "email"); defaults to "manual". */
  source?: string;
  /** Idempotency key for email intake (Postmark MessageID). */
  sourceMessageId?: string | null;
}

/**
 * Lead intake (SCOPE §6): create the lead + conversation and fire Sarah's opening
 * SMS immediately (sub-60-second promise, SCOPE §7). The opening is a single agent
 * turn — Sarah greets and asks for what she needs next.
 */
export async function createLeadAndGreet(
  deps: LeadDeps,
  input: CreateLeadArgs,
): Promise<{ leadId: string; opening: string }> {
  const { store, sms } = deps;
  const now = (deps.now ?? (() => new Date()))();

  const ctx = await store.createLeadWithConversation({
    contractorId: input.contractorId,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    projectHint: input.projectHint ?? null,
    source: input.source ?? "manual",
    sourceMessageId: input.sourceMessageId ?? null,
  });

  const state: ToolState = {
    contractor: ctx.contractor,
    lead: ctx.lead,
    conversation: ctx.conversation,
    gathered: ctx.conversation.gathered ?? {},
  };
  const history: ChatTurn[] = [{ role: "user", content: openingTrigger(input.source, input.projectHint) }];

  const opening = await generateAgentReply({ ...deps, sms, now }, state, history);

  await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: opening });
  await sms.send(ctx.lead.contactPhone, opening);
  await store.updateLeadFields(ctx.lead.id, { status: "contacted" });
  await store.updateConversation(ctx.conversation.id, { state: "qualifying" });

  return { leadId: ctx.lead.id, opening };
}

function openingTrigger(source?: string, projectHint?: string | null): string {
  // Missed-call text-back (SCOPE §9.7): the homeowner phoned the contractor, it went
  // unanswered, and the call was forwarded to us — so lead with an apology, not "you
  // filled out our form". The contractor/persona details come from the system prompt.
  if (source === "missed_call") {
    return (
      `[We just missed a call from this person and don't know why they called. Send a warm opening text:` +
      ` briefly apologize for missing their call, introduce yourself, and ask how you can help.` +
      ` Do NOT assume they want an estimate and do NOT ask for their address yet.]`
    );
  }
  return (
    `[A new lead just came in through the website` +
    (projectHint ? ` about "${projectHint}"` : "") +
    `. Send your warm opening text: introduce yourself, thank them for reaching out, and ask for the property's full address — the street, city, and ZIP code, in one message — so you can check coverage and get the team out.]`
  );
}
