import type { EmailSender, SmsSender } from "@leadanswered/core";
import type { LanguageModel } from "ai";
import { generateAgentReply, type ChatTurn } from "./agent/runner.js";
import type { ToolState } from "./agent/tools.js";
import { enqueueNudge } from "./queue.js";
import type { Store } from "./store/types.js";

export interface ConversationDeps {
  store: Store;
  model: LanguageModel;
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
}

/**
 * The "Sarah" conversation engine (SCOPE §5), now a tool-using agent. Per inbound
 * SMS: idempotency-guard → load context → run the agent (the model reasons and
 * calls deterministic tools, which make every qualify/book decision) → persist +
 * send the reply. The directive ladder + two-pass extraction are gone; the tools
 * own the decisions (SCOPE §5.1).
 */
export async function handleInbound(
  deps: ConversationDeps,
  input: InboundInput,
): Promise<InboundResult> {
  const { store, sms } = deps;
  const now = (deps.now ?? (() => new Date()))();

  // Idempotency — a Twilio webhook delivered twice produces exactly one reply (SCOPE §7).
  if (input.providerSid && (await store.messageExistsByProviderSid(input.providerSid))) {
    console.log(`[sms] duplicate webhook ${input.providerSid} — ignored (idempotent)`);
    return { status: "skipped" };
  }

  // Is this a CONTRACTOR replying to an open escalation? Relay their answer to the
  // homeowner and resolve it (the async loop closes here). Gated on an open
  // escalation, so a normal contractor text is ignored and resolving it is the
  // idempotency guard against a retried relay.
  const relayed = await maybeRelayContractorReply(deps, input, now);
  if (relayed) return relayed;

  let ctx = await store.findActiveContextByPhones(input.toNumber, input.fromNumber);
  if (!ctx && deps.allowColdInbound) {
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

  // Persist the inbound BEFORE the agent runs — so a Twilio retry re-enters and is
  // skipped by the idempotency guard above, never double-processing (SCOPE §7).
  await store.appendMessage(ctx.conversation.id, {
    direction: "inbound",
    body: input.body,
    providerSid: input.providerSid ?? null,
  });

  const state: ToolState = {
    contractor: ctx.contractor,
    lead: ctx.lead,
    conversation: ctx.conversation,
    gathered: ctx.conversation.gathered ?? {},
  };
  const history: ChatTurn[] = [
    ...ctx.messages
      .filter((m) => m.body && m.body.trim() !== "") // never replay empty text (Anthropic 400s on it)
      .map((m): ChatTurn => ({
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.body,
      })),
    { role: "user", content: input.body },
  ];

  let reply: string;
  try {
    reply = await generateAgentReply({ ...deps, sms, now }, state, history);
  } catch (err) {
    // Fail safe: log, don't crash the webhook, don't double-send (SCOPE §7).
    console.error(`[sms] agent error for ${input.fromNumber} — no reply sent:`, err);
    return { status: "error" };
  }

  await store.appendMessage(ctx.conversation.id, { direction: "outbound", body: reply });
  try {
    await sms.send(ctx.lead.contactPhone, reply);
  } catch (err) {
    console.error(`[sms] failed to send reply to ${ctx.lead.contactPhone}:`, err);
  }

  // If the lead is still mid-conversation, schedule a gentle follow-up in case they
  // go quiet (no-op without REDIS_URL). Re-enqueuing resets the timer each turn.
  if (state.lead.status !== "booked" && state.lead.status !== "disqualified") {
    try {
      await enqueueNudge(ctx.lead.id);
    } catch (err) {
      console.error("[nudge] enqueue failed:", err);
    }
  }

  return { status: "ok", reply };
}

/**
 * If `input` is a contractor replying to an open escalation, relay their answer to
 * the homeowner and resolve the escalation. Returns the result if handled, else null.
 */
async function maybeRelayContractorReply(
  deps: ConversationDeps,
  input: InboundInput,
  _now: Date,
): Promise<InboundResult | null> {
  const { store, sms } = deps;
  const contractor = await store.getContractorByTwilioNumber(input.toNumber);
  if (!contractor) return null;

  const recipients = await store.getRecipients(contractor.id);
  const fromIsContractor = recipients.some((r) => r.phone && r.phone === input.fromNumber);
  if (!fromIsContractor) return null;

  const esc = await store.findOpenEscalationByContractorReply(contractor.id);
  if (!esc) return null;

  const leadCtx = await store.getContextByLeadId(esc.leadId);
  if (leadCtx) {
    const relay = `Hi ${leadCtx.lead.contactName}! Quick update from ${contractor.companyName}: ${input.body}`;
    await store.appendMessage(leadCtx.conversation.id, { direction: "outbound", body: relay });
    try {
      await sms.send(leadCtx.lead.contactPhone, relay);
    } catch (err) {
      console.error(`[relay] failed to reach ${leadCtx.lead.contactPhone}:`, err);
    }
  }
  await store.resolveEscalation(esc.id, input.body);
  console.log(`[escalation] relayed contractor answer for escalation ${esc.id}`);
  return { status: "ok", reply: input.body };
}
