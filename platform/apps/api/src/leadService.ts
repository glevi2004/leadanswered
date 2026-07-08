import type { SmsSender } from "@leadanswered/core";
import type { LanguageModel } from "ai";
import { generateAgentReply, type ChatTurn } from "./agent/runner.js";
import type { ToolState } from "./agent/tools.js";
import type { LeadContext, Store } from "./store/types.js";

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
  /** Where the lead came from (e.g. "manual", "email", "missed_call"); defaults to "manual". */
  source?: string;
  /** Idempotency key for the intake EVENT (Postmark MessageID / voice CallSid). */
  sourceMessageId?: string | null;
}

/**
 * Lead intake (SCOPE §6, §9, §9.7). **One lead per `(contractor, contactPhone)`:** if this person
 * already has a lead, re-engage their EXISTING conversation instead of creating a duplicate — a
 * second lead would fragment their history and split the single SMS thread they see (replies would
 * route to the empty new lead and Sarah would lose context). Otherwise create the lead + conversation.
 * Either way, fire Sarah's opening SMS (one agent turn) immediately (sub-60s promise, SCOPE §7).
 */
export async function createLeadAndGreet(
  deps: LeadDeps,
  input: CreateLeadArgs,
): Promise<{ leadId: string; opening: string }> {
  const { store } = deps;
  const now = (deps.now ?? (() => new Date()))();

  const existing = await store.findLeadContextByContractorPhone(input.contractorId, input.contactPhone);
  if (existing) return reengageLead(deps, existing, input, now);

  const ctx = await store.createLeadWithConversation({
    contractorId: input.contractorId,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    projectHint: input.projectHint ?? null,
    source: input.source ?? "manual",
    sourceMessageId: input.sourceMessageId ?? null,
  });

  const opening = await runOpeningTurn(deps, ctx, openingTrigger(input.source, input.projectHint, false), now);
  await store.updateLeadFields(ctx.lead.id, { status: "contacted" });
  await store.updateConversation(ctx.conversation.id, { state: "intake" });
  return { leadId: ctx.lead.id, opening };
}

/** A repeat contact from a known phone: greet them back in the SAME conversation — no new lead. */
async function reengageLead(
  deps: LeadDeps,
  ctx: LeadContext,
  input: CreateLeadArgs,
  now: Date,
): Promise<{ leadId: string; opening: string }> {
  const { store } = deps;

  // Carry a newly-supplied project hint into the existing working memory (don't overwrite what we know),
  // and re-arm the single quiet-lead nudge — a re-contact after a gap is a NEW interaction.
  const gathered = { ...(ctx.conversation.gathered ?? {}) };
  if (input.projectHint && !gathered.projectType) gathered.projectType = input.projectHint;
  gathered.nudgedAt = null;
  await store.updateConversation(ctx.conversation.id, { gathered });

  // Frame the turn by the CURRENT contact channel; the returning-caller trigger keeps it warm + open.
  const turnCtx: LeadContext = {
    ...ctx,
    lead: { ...ctx.lead, source: input.source ?? ctx.lead.source },
    conversation: { ...ctx.conversation, gathered },
  };
  const opening = await runOpeningTurn(deps, turnCtx, openingTrigger(input.source, input.projectHint, true), now);

  // Re-open a settled lead so the flow can continue; leave booked/disqualified for the agent's framing.
  if (ctx.lead.status === "no_response") {
    await store.updateLeadFields(ctx.lead.id, { status: "contacted" });
  }
  if (ctx.lead.status !== "booked" && ctx.lead.status !== "disqualified") {
    await store.updateConversation(ctx.conversation.id, { state: "intake" });
  }
  return { leadId: ctx.lead.id, opening };
}

/** Run one opening agent turn on a conversation (new or existing): generate → persist → send. */
async function runOpeningTurn(
  deps: LeadDeps,
  ctx: LeadContext,
  trigger: string,
  now: Date,
): Promise<string> {
  const state: ToolState = {
    contractor: ctx.contractor,
    lead: ctx.lead,
    conversation: ctx.conversation,
    gathered: ctx.conversation.gathered ?? {},
  };
  const history: ChatTurn[] = [{ role: "user", content: trigger }];
  const opening = await generateAgentReply({ ...deps, now }, state, history);
  await deps.store.appendMessage(ctx.conversation.id, { direction: "outbound", body: opening });
  await deps.sms.send(ctx.lead.contactPhone, opening);
  return opening;
}

function openingTrigger(source?: string, projectHint?: string | null, returning = false): string {
  // A repeat contact from someone we've talked to before (SCOPE §4 dedupe) — continue the relationship,
  // don't restart it. Unknown intent, so stay open.
  if (returning) {
    return (
      `[This person has reached out to us before and just contacted us again` +
      (source === "missed_call" ? ` (they called and we missed it)` : ``) +
      `. You're continuing an existing relationship, so greet them back warmly, do NOT introduce yourself from` +
      ` scratch, and ask how you can help today. Do NOT assume they want a new estimate or ask for their address` +
      ` unless they bring it up.]`
    );
  }
  // Missed-call text-back (SCOPE §9.7): the homeowner phoned and we missed it — unknown intent, so open-ended.
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
