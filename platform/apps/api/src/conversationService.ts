import {
  assembleSystemPrompt,
  decideTurn,
  extractionToFields,
  formatSlot,
  mergeGathered,
  proposeSlots,
  qualify,
  sendNotifications,
  type EmailSender,
  type GatheredInfo,
  type NotificationEventType,
  type NotificationPayload,
  type Recipient,
  type SmsSender,
  type TurnDecision,
} from "@leadanswered/core";
import type { ChatTurn, SarahAi } from "./claude.js";
import type { LeadContext, LeadFieldPatch, Store } from "./store/types.js";

export interface ConversationDeps {
  store: Store;
  ai: SarahAi;
  sms: SmsSender;
  email?: EmailSender;
  now?: () => Date;
  /** If true, an inbound from an unknown number starts a new conversation (dev/test). */
  allowColdInbound?: boolean;
}

export interface InboundInput {
  toNumber: string;
  fromNumber: string;
  body: string;
  providerSid?: string | null;
}

export interface InboundResult {
  status: "ok" | "skipped" | "error";
  reply?: string;
  action?: TurnDecision["action"];
}

/**
 * The "Sarah" conversation engine (SCOPE §5). Per inbound SMS: load context →
 * assemble the per-contractor prompt → AI extracts + replies → CODE decides the
 * binding action (qualify/disqualify/book) → persist + send + notify.
 */
export async function handleInbound(
  deps: ConversationDeps,
  input: InboundInput,
): Promise<InboundResult> {
  const { store, ai, sms } = deps;
  const now = (deps.now ?? (() => new Date()))();

  // Idempotency — a Twilio webhook delivered twice produces exactly one reply (SCOPE §7).
  if (input.providerSid && (await store.messageExistsByProviderSid(input.providerSid))) {
    console.log(`[sms] duplicate webhook ${input.providerSid} — ignored (idempotent)`);
    return { status: "skipped" };
  }

  let ctx = await store.findActiveContextByPhones(input.toNumber, input.fromNumber);
  if (!ctx && deps.allowColdInbound) {
    // No active lead — auto-start one for this texter (dev/test affordance).
    const contractor = await store.getContractorByTwilioNumber(input.toNumber);
    if (contractor) {
      ctx = await store.createLeadWithConversation({
        contractorId: contractor.id,
        contactName: "New lead",
        contactPhone: input.fromNumber,
        source: "inbound_sms",
      });
      console.log(`[sms] cold inbound — started a new conversation for ${input.fromNumber}`);
    }
  }
  if (!ctx) {
    console.log(`[sms] no active conversation for ${input.fromNumber} → ${input.toNumber}`);
    return { status: "skipped" };
  }

  await store.appendMessage(ctx.conversation.id, {
    direction: "inbound",
    body: input.body,
    providerSid: input.providerSid ?? null,
  });

  const preGathered = ctx.conversation.gathered ?? {};
  const preQual = qualify(preGathered, ctx.contractor);
  const slots = proposeSlots(ctx.contractor.standingAvailability, 3, now);
  const systemPrompt = assembleSystemPrompt({
    contractor: ctx.contractor,
    leadName: ctx.lead.contactName,
    gathered: preGathered,
    qualification: preQual,
    slots,
    stage: ctx.conversation.state,
  });

  const history: ChatTurn[] = [
    ...ctx.messages.map(
      (m): ChatTurn => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.body,
      }),
    ),
    { role: "user", content: input.body },
  ];

  let out;
  try {
    out = await ai.generate(systemPrompt, history);
  } catch (err) {
    // Fail safe: log, don't crash the webhook, don't double-send (SCOPE §7).
    console.error(`[sms] AI error for ${input.fromNumber} — no reply sent:`, err);
    return { status: "error" };
  }

  const merged = mergeGathered(preGathered, extractionToFields(out.extracted));
  await store.updateConversation(ctx.conversation.id, { gathered: merged });
  const leadPatch = buildLeadPatch(merged);
  if (Object.keys(leadPatch).length > 0) {
    await store.updateLeadFields(ctx.lead.id, leadPatch);
  }

  const postQual = qualify(merged, ctx.contractor);
  const alreadyQualified = ["proposing_slots", "confirming", "done"].includes(
    ctx.conversation.state,
  );
  const decision = decideTurn({
    gathered: merged,
    qualification: postQual,
    slots,
    alreadyQualified,
  });

  await store.appendMessage(ctx.conversation.id, {
    direction: "outbound",
    body: out.reply,
  });
  try {
    await sms.send(ctx.lead.contactPhone, out.reply);
  } catch (err) {
    console.error(`[sms] failed to send reply to ${ctx.lead.contactPhone}:`, err);
  }

  await applyDecision(deps, ctx, merged, decision);
  await store.updateConversation(ctx.conversation.id, { state: decision.nextStage });

  return { status: "ok", reply: out.reply, action: decision.action };
}

function buildLeadPatch(g: GatheredInfo): LeadFieldPatch {
  const patch: LeadFieldPatch = {};
  if (g.projectType != null) patch.projectHint = g.projectType;
  if (g.serviceTown != null) patch.serviceTown = g.serviceTown;
  if (g.serviceZip != null) patch.serviceZip = g.serviceZip;
  if (g.fullAddress != null) patch.fullAddress = g.fullAddress;
  return patch;
}

async function applyDecision(
  deps: ConversationDeps,
  ctx: LeadContext,
  merged: GatheredInfo,
  decision: TurnDecision,
): Promise<void> {
  const { store } = deps;
  switch (decision.action) {
    case "disqualify":
      await store.updateLeadFields(ctx.lead.id, { status: "disqualified" });
      await fireNotification(deps, ctx, "disqualified_lead", merged, null);
      break;
    case "mark_qualified":
      await store.updateLeadFields(ctx.lead.id, { status: "qualifying" });
      await fireNotification(deps, ctx, "new_qualified_lead", merged, null);
      break;
    case "book":
      if (decision.bookingSlotIso) {
        await store.createAppointment({
          leadId: ctx.lead.id,
          contractorId: ctx.contractor.id,
          slotIso: decision.bookingSlotIso,
        });
        await store.updateLeadFields(ctx.lead.id, { status: "booked" });
        await fireNotification(deps, ctx, "booking_confirmed", merged, decision.bookingSlotIso);
      }
      break;
    case "continue":
      break;
  }
}

async function fireNotification(
  deps: ConversationDeps,
  ctx: LeadContext,
  event: NotificationEventType,
  merged: GatheredInfo,
  slotIso: string | null,
): Promise<void> {
  const recipients: Recipient[] = (await deps.store.getRecipients(ctx.contractor.id)).map(
    (r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      email: r.email,
      subscriptions: r.subscriptions,
    }),
  );
  const payload = buildPayload(event, ctx, merged, slotIso);
  await sendNotifications(event, recipients, payload, {
    sms: deps.sms,
    email: deps.email,
  });
}

function buildPayload(
  event: NotificationEventType,
  ctx: LeadContext,
  merged: GatheredInfo,
  slotIso: string | null,
): NotificationPayload {
  const lead = ctx.lead;
  const when = slotIso ? formatSlot(slotIso) : "";
  if (event === "booking_confirmed") {
    const emailBody = [
      `New booked appointment for ${ctx.contractor.companyName}:`,
      `Name: ${lead.contactName}`,
      `Phone: ${lead.contactPhone}`,
      `Project: ${merged.projectType ?? "n/a"}`,
      `Address: ${merged.fullAddress ?? "n/a"}`,
      `When: ${when}`,
    ].join("\n");
    return {
      subject: `New booking — ${lead.contactName}`,
      smsBody: `📅 New booking: ${lead.contactName}, ${merged.projectType ?? ""} @ ${when}. ${merged.fullAddress ?? ""} (${lead.contactPhone})`,
      emailBody,
    };
  }
  if (event === "new_qualified_lead") {
    return {
      subject: `New qualified lead — ${lead.contactName}`,
      smsBody: `✅ Qualified lead: ${lead.contactName}, ${merged.projectType ?? ""}, ${merged.serviceZip ?? ""} (${lead.contactPhone})`,
      emailBody: `Qualified lead: ${lead.contactName} / ${lead.contactPhone} / ${merged.projectType ?? ""} / ${merged.serviceZip ?? ""}`,
    };
  }
  return {
    subject: `Lead turned away — ${lead.contactName}`,
    smsBody: `🚫 Sarah turned away ${lead.contactName} (${merged.serviceZip ?? "?"}, ${merged.projectType ?? "?"})`,
    emailBody: `Disqualified: ${lead.contactName} / ${merged.serviceZip ?? ""} / ${merged.projectType ?? ""}`,
  };
}
