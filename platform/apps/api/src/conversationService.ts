import type { EmailSender, SmsSender } from "@leadanswered/core";
import type { LanguageModel } from "ai";
import { generateAgentReply, type ChatTurn } from "./agent/runner.js";
import type { ToolState } from "./agent/tools.js";
import { extractPhone, handOffOwnerIfReady } from "./agent/ownerHandoff.js";
import { enqueueNudge } from "./queue.js";
import type { LeadContext, Store } from "./store/types.js";

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
 * The "Sarah" conversation engine (SCOPE §5), a tool-using agent. Concurrency-safe:
 * a contractor escalation reply is relayed at-most-once (conditional resolve); a lead's
 * turns are serialized per conversation and the inbound message is inserted FIRST as the
 * idempotency lock, so a retried/duplicate webhook can never double-run the agent or
 * double-reply. Every qualify/book decision is made by deterministic tools (SCOPE §5.1).
 */
export async function handleInbound(deps: ConversationDeps, input: InboundInput): Promise<InboundResult> {
  const { store } = deps;
  const now = (deps.now ?? (() => new Date()))();

  // 1) Is this a CONTRACTOR replying to an open escalation? Relay at-most-once.
  const relayed = await maybeRelayContractorReply(deps, input);
  if (relayed) return relayed;

  // 2) Find (or, in dev, cold-start) the lead conversation.
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
  const conversationId = ctx.conversation.id;
  const leadId = ctx.lead.id;

  // 3) Serialize all turns for this conversation, then dedup + run the agent.
  return store.withConversationLock(conversationId, async () => {
    // Insert the inbound FIRST — its unique providerSid is the idempotency lock. A
    // duplicate webhook stops here, before the agent runs or any SMS is sent.
    const { inserted } = await store.appendInboundIdempotent(conversationId, {
      body: input.body,
      providerSid: input.providerSid ?? null,
    });
    if (!inserted) {
      console.log(`[sms] duplicate webhook ${input.providerSid} — ignored (idempotent)`);
      return { status: "skipped" };
    }

    // Re-read inside the lock for a consistent snapshot (now includes the inbound we inserted).
    const fresh = (await store.getContextByLeadId(leadId)) ?? ctx!;
    const state: ToolState = {
      contractor: fresh.contractor,
      lead: fresh.lead,
      conversation: fresh.conversation,
      gathered: fresh.conversation.gathered ?? {},
    };
    const history: ChatTurn[] = fresh.messages
      .filter((m) => m.body && m.body.trim() !== "") // never replay empty text (Anthropic 400s on it)
      .map((m): ChatTurn => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.body }));

    let reply: string;
    try {
      reply = await generateAgentReply({ ...deps, now }, state, history);
    } catch (err) {
      console.error(`[sms] agent error for ${input.fromNumber} — no reply sent:`, err);
      return { status: "error" };
    }

    await store.appendMessage(conversationId, { direction: "outbound", body: reply });
    try {
      await deps.sms.send(fresh.lead.contactPhone, reply);
    } catch (err) {
      console.error(`[sms] failed to send reply to ${fresh.lead.contactPhone}:`, err);
    }

    // DETERMINISTIC backstop: a not-the-homeowner lead who texts a phone number → capture it + hand
    // off to the contractor, whether or not the model passed it to qualify_lead. Code, not model.
    if (
      state.gathered.isDecisionMaker === false &&
      !state.gathered.ownerHandoffDone &&
      !state.gathered.ownerPhone
    ) {
      const phone = extractPhone(input.body);
      if (phone) {
        state.gathered = { ...state.gathered, ownerPhone: phone };
        await store.updateConversation(conversationId, { gathered: state.gathered });
        await handOffOwnerIfReady({ store, sms: deps.sms }, state);
      }
    }

    // Schedule a gentle follow-up if they're still mid-conversation (no-op without REDIS_URL).
    if (state.lead.status !== "booked" && state.lead.status !== "disqualified") {
      try {
        await enqueueNudge(leadId);
      } catch (err) {
        console.error("[nudge] enqueue failed:", err);
      }
    }

    return { status: "ok", reply };
  });
}

/**
 * If `input` is a contractor replying to an open escalation, relay their answer to the
 * homeowner — exactly once. We resolve the escalation with a conditional update FIRST and
 * only relay if it actually flipped open→resolved, so a retried/concurrent reply no-ops.
 */
async function maybeRelayContractorReply(
  deps: ConversationDeps,
  input: InboundInput,
): Promise<InboundResult | null> {
  const { store, sms } = deps;
  const contractor = await store.getContractorByTwilioNumber(input.toNumber);
  if (!contractor) return null;

  const recipients = await store.getRecipients(contractor.id);
  const fromIsContractor = recipients.some((r) => r.phone && r.phone === input.fromNumber);
  if (!fromIsContractor) return null;

  const esc = await store.findOpenEscalationByContractorReply(contractor.id);
  if (!esc) return null;

  // Win the resolve before relaying — the conditional update is the at-most-once guard.
  const resolved = await store.resolveEscalationIfOpen(esc.id, input.body);
  if (!resolved) return { status: "skipped" };

  const leadCtx: LeadContext | null = await store.getContextByLeadId(esc.leadId);
  if (leadCtx) {
    const relay = `Hi ${leadCtx.lead.contactName}! Quick update from ${contractor.companyName}: ${input.body}`;
    await store.appendMessage(leadCtx.conversation.id, { direction: "outbound", body: relay });
    try {
      await sms.send(leadCtx.lead.contactPhone, relay);
    } catch (err) {
      console.error(`[relay] failed to reach ${leadCtx.lead.contactPhone}:`, err);
    }
  }
  console.log(`[escalation] relayed contractor answer for escalation ${esc.id}`);
  return { status: "ok", reply: input.body };
}
