import type { OrganizationConfig, GatheredInfo, SmsSender } from "@leadanswered/core";
import type { ConversationRecord, LeadRecord, Store } from "../store/types.js";

export interface HandoffState {
  organization: OrganizationConfig;
  lead: LeadRecord;
  conversation: ConversationRecord;
  gathered: GatheredInfo;
}
export interface HandoffDeps {
  store: Store;
  sms: SmsSender;
}

/** Pull a plausible phone number out of free SMS text (8-15 digits, common separators). Null if none. */
export function extractPhone(text: string): string | null {
  const m = text.match(/\+?\d[\d\s().-]{6,}\d/);
  if (!m) return null;
  const cleaned = m[0].replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? cleaned : null;
}

/**
 * DETERMINISTIC not-the-decision-maker hand-off. When the lead is confirmed NOT the decision-maker and we
 * have the decision-maker's phone, CODE (not the model) pings every organization recipient with that contact,
 * exactly once. It's a guaranteed side-effect — the model has no say in whether it fires. Returns true
 * if it fired this call. Mutates + persists `state.gathered.ownerHandoffDone` for idempotency.
 */
export async function handOffOwnerIfReady(deps: HandoffDeps, state: HandoffState): Promise<boolean> {
  const g = state.gathered;
  const requireDM = state.organization.qualificationRules?.requireDecisionMaker !== false;
  if (!requireDM || g.isDecisionMaker !== false || !g.ownerPhone || g.ownerHandoffDone) return false;

  const leadName = state.lead.contactName || "A lead";
  const owner = `${g.ownerName ? g.ownerName + " " : ""}${g.ownerPhone}`;
  const body =
    `📇 ${leadName} (${state.lead.contactPhone}) reached out but isn't the decision-maker. ` +
    `Decision-maker contact: ${owner}. Reach out to them to book the free on-site estimate.`;

  const recipients = await deps.store.getRecipients(state.organization.id);
  for (const r of recipients) {
    if (r.phone) {
      try {
        await deps.sms.send(r.phone, body);
      } catch (e) {
        console.error("[handoff] notify failed:", e);
      }
    }
  }

  state.gathered = { ...g, ownerHandoffDone: true };
  await deps.store.updateConversation(state.conversation.id, { gathered: state.gathered });
  return true;
}
