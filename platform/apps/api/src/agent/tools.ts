import { tool } from "ai";
import { z } from "zod";
import {
  formatSlot,
  isDisqualified,
  mergeGathered,
  proposeSlots,
  qualify,
  slotMatches,
  type ContractorConfig,
  type GatheredInfo,
} from "@leadanswered/core";
import { fireNotification, type NotifyDeps } from "../notify.js";
import type {
  ConversationRecord,
  LeadFieldPatch,
  LeadRecord,
  Store,
} from "../store/types.js";

export interface ToolDeps extends NotifyDeps {
  store: Store;
  now: Date;
}

/** Per-turn mutable state the tools read + write (shared across tool calls in one turn). */
export interface ToolState {
  contractor: ContractorConfig;
  lead: LeadRecord;
  conversation: ConversationRecord;
  gathered: GatheredInfo;
}

function buildLeadPatch(g: GatheredInfo): LeadFieldPatch {
  const patch: LeadFieldPatch = {};
  if (g.projectType != null) patch.projectHint = g.projectType;
  if (g.serviceTown != null) patch.serviceTown = g.serviceTown;
  if (g.serviceZip != null) patch.serviceZip = g.serviceZip;
  if (g.fullAddress != null) patch.fullAddress = g.fullAddress;
  return patch;
}

async function persistGathered(deps: ToolDeps, state: ToolState): Promise<void> {
  await deps.store.updateConversation(state.conversation.id, { gathered: state.gathered });
  const patch = buildLeadPatch(state.gathered);
  if (Object.keys(patch).length > 0) await deps.store.updateLeadFields(state.lead.id, patch);
}

/**
 * The agent's toolkit (SCOPE §5.1). The model orchestrates the conversation and
 * CHOOSES tools; every business decision is made by deterministic CODE inside the
 * tool body, and the tool RESULT is authoritative. The model may never assert a
 * fact (in/out of area, an available time, "you're booked") a tool didn't return.
 *
 * Determinism guards live here: `qualify_lead` decides coverage/qualification,
 * `get_availability` returns only real slots, `book_appointment` re-validates the
 * slot + qualification + address server-side before any DB write.
 */
export function buildTools(deps: ToolDeps, state: ToolState) {
  return {
    qualify_lead: tool({
      description:
        "Record what you've learned about the lead and check if they qualify. Call this whenever you learn their project, town/ZIP/address, or whether it's their own home. Returns what is still missing and whether they qualify. You decide what to SAY; this decides the facts.",
      inputSchema: z.object({
        projectType: z.string().optional().describe("The work they need, in their words (e.g. roof leak, replacement, gutters)"),
        zip: z.string().optional().describe("5-digit ZIP of the property"),
        town: z.string().optional().describe("Town/city of the property"),
        fullAddress: z.string().optional().describe("Full street address if given"),
        isDecisionMaker: z.boolean().optional().describe("True if it's their own home or they're the decision-maker"),
      }),
      execute: async (input) => {
        state.gathered = mergeGathered(state.gathered, {
          projectType: input.projectType ?? null,
          serviceZip: input.zip ?? null,
          serviceTown: input.town ?? null,
          fullAddress: input.fullAddress ?? null,
          isDecisionMaker: input.isDecisionMaker ?? null,
        });
        await persistGathered(deps, state);

        const q = qualify(state.gathered, state.contractor);

        if (isDisqualified(q)) {
          if (state.lead.status !== "disqualified") {
            state.lead.status = "disqualified";
            await deps.store.updateLeadFields(state.lead.id, { status: "disqualified" });
            await deps.store.updateConversation(state.conversation.id, { state: "done" });
            await fireNotification(deps, state, "disqualified_lead", state.gathered, null);
          }
        } else if (q.qualified && (state.lead.status === "new" || state.lead.status === "contacted")) {
          state.lead.status = "qualifying";
          await deps.store.updateLeadFields(state.lead.id, { status: "qualifying" });
          await fireNotification(deps, state, "new_qualified_lead", state.gathered, null);
        }

        return {
          qualified: q.qualified,
          inArea: q.inArea,
          projectOffered: q.projectOffered,
          isDecisionMaker: q.isDecisionMaker,
          missing: q.missing,
          locationStatus: q.locationStatus,
          zipUnverified: q.zipUnverified,
        };
      },
    }),

    get_availability: tool({
      description:
        "Get real open appointment times to offer the lead. Use window:'next_week' (or afterIso) if they ask about later. Only the times returned here may be offered.",
      inputSchema: z.object({
        window: z.enum(["this_week", "next_week", "any"]).optional(),
        count: z.number().int().optional().describe("How many times to return (1-6, default 3)"),
        afterIso: z.string().optional().describe("Only return times after this ISO datetime"),
      }),
      execute: async (input) => {
        const count = Math.min(Math.max(input.count ?? 3, 1), 6);
        let fromDate: Date | undefined;
        if (input.afterIso) {
          const d = new Date(input.afterIso);
          if (!Number.isNaN(d.getTime())) fromDate = d;
        } else if (input.window === "next_week") {
          fromDate = new Date(deps.now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        const slots = proposeSlots(state.contractor.standingAvailability, count, deps.now, { fromDate });
        // Return SHORT ids (not raw ISOs) so the model books reliably; remember the map.
        const map: Record<string, string> = {};
        const out = slots.map((s, i) => {
          const id = String(i + 1);
          map[id] = s.iso;
          return { id, label: s.label };
        });
        state.gathered = { ...state.gathered, offeredSlots: map };
        await persistGathered(deps, state);
        return { slots: out };
      },
    }),

    book_appointment: tool({
      description:
        "Book the free on-site estimate at a time the lead picked. Pass the short id of the chosen time (e.g. '1') from get_availability's result, plus their full street address. It re-checks everything; trust its result before telling the customer anything is booked.",
      inputSchema: z.object({
        slotIso: z.string().describe("The short id of the chosen time from get_availability (e.g. '1')"),
        fullAddress: z.string().describe("Full street address for the visit"),
      }),
      execute: async (input) => {
        // Resolve the short id to the real ISO (fall back to treating it as an ISO).
        const chosenIso = state.gathered.offeredSlots?.[input.slotIso] ?? input.slotIso;
        state.gathered = mergeGathered(state.gathered, {
          fullAddress: input.fullAddress ?? null,
          chosenSlot: chosenIso,
        });
        await persistGathered(deps, state);

        const q = qualify(state.gathered, state.contractor);
        if (!q.qualified) return { ok: false as const, reason: "not_qualified", missing: q.missing };
        if (!input.fullAddress || input.fullAddress.trim() === "")
          return { ok: false as const, reason: "need_address" };

        // Re-validate the slot against real availability (the migrated decideTurn gate).
        const valid = proposeSlots(state.contractor.standingAvailability, 50, deps.now, { horizonDays: 28 });
        const match = valid.find((s) => slotMatches(s, chosenIso));
        if (!match)
          return {
            ok: false as const,
            reason: "slot_unavailable",
            slots: proposeSlots(state.contractor.standingAvailability, 3, deps.now).map((s) => ({ iso: s.iso, label: s.label })),
          };

        // Idempotency: already booked at this slot → return it, don't double-insert.
        if (state.lead.status === "booked" && state.gathered.chosenSlot === match.iso) {
          return { ok: true as const, slotIso: match.iso, label: match.label, already: true };
        }

        await deps.store.createAppointment({
          leadId: state.lead.id,
          contractorId: state.contractor.id,
          slotIso: match.iso,
        });
        state.lead.status = "booked";
        await deps.store.updateLeadFields(state.lead.id, { status: "booked" });
        // "booked" (not "done") keeps the conversation reachable so the lead can
        // text back later to reschedule or cancel (SCOPE §2, post-booking).
        await deps.store.updateConversation(state.conversation.id, { state: "booked" });
        await fireNotification(deps, state, "booking_confirmed", state.gathered, match.iso);

        return { ok: true as const, slotIso: match.iso, label: match.label };
      },
    }),

    reschedule_appointment: tool({
      description:
        "Move the lead's existing booking to a new time they picked (from get_availability). Only for leads who already have a booking.",
      inputSchema: z.object({
        newSlotIso: z.string().describe("The short id of the new chosen time from get_availability (e.g. '1')"),
      }),
      execute: async (input) => {
        const appt = await deps.store.getActiveAppointmentByLead(state.lead.id);
        if (!appt) return { ok: false as const, reason: "no_appointment" };
        const newIso = state.gathered.offeredSlots?.[input.newSlotIso] ?? input.newSlotIso;
        const match = findValidSlot(deps, state, newIso);
        if (!match)
          return { ok: false as const, reason: "slot_unavailable", slots: currentSlots(deps, state) };

        await deps.store.updateAppointment(appt.id, {
          slotIso: match.iso,
          status: "confirmed",
          rescheduledFromIso: appt.slotIso,
        });
        state.gathered = mergeGathered(state.gathered, { chosenSlot: match.iso });
        await persistGathered(deps, state);
        await fireNotification(deps, state, "booking_rescheduled", state.gathered, match.iso);
        return { ok: true as const, slotIso: match.iso, label: match.label };
      },
    }),

    cancel_appointment: tool({
      description:
        "Cancel the lead's existing booking. Only for leads who already have a booking.",
      inputSchema: z.object({
        reason: z.string().optional().describe("Why they're cancelling, if they said"),
      }),
      execute: async (input) => {
        const appt = await deps.store.getActiveAppointmentByLead(state.lead.id);
        if (!appt) return { ok: false as const, reason: "no_appointment" };

        await deps.store.updateAppointment(appt.id, {
          status: "cancelled",
          cancelledAt: deps.now.toISOString(),
          cancelReason: input.reason ?? null,
        });
        // Re-open the lead so they can rebook in the same thread if they want.
        state.lead.status = "contacted";
        await deps.store.updateLeadFields(state.lead.id, { status: "contacted" });
        await deps.store.updateConversation(state.conversation.id, { state: "qualifying" });
        await fireNotification(deps, state, "booking_cancelled", state.gathered, appt.slotIso);
        return { ok: true as const };
      },
    }),

    escalate_to_contractor: tool({
      description:
        "Use this when you genuinely cannot resolve something yourself — a tool keeps failing, the customer asks something only the contractor can answer, or an unusual situation. It notifies the contractor with the question; they will text back an answer that gets relayed to the customer. After calling this, tell the customer you've flagged it for the team and someone will be right back to them. Never promise a human follow-up without calling this first.",
      inputSchema: z.object({
        question: z.string().describe("The question or issue, phrased for the contractor, including the relevant context"),
      }),
      execute: async (input) => {
        const esc = await deps.store.createEscalation({
          leadId: state.lead.id,
          contractorId: state.contractor.id,
          conversationId: state.conversation.id,
          question: input.question,
        });
        // Notify the contractor's people directly (a control message, not an event subscription).
        const recipients = await deps.store.getRecipients(state.contractor.id);
        const body = `❓ ${state.lead.contactName} (${state.lead.contactPhone}) asks: ${input.question}\nReply to this text to answer them.`;
        for (const r of recipients) {
          if (r.phone) {
            try {
              await deps.sms.send(r.phone, body);
            } catch (e) {
              console.error("[escalate] notify failed:", e);
            }
          }
        }
        return { ok: true as const, escalationId: esc.id };
      },
    }),
  };
}

function findValidSlot(deps: ToolDeps, state: ToolState, slotIso: string) {
  const valid = proposeSlots(state.contractor.standingAvailability, 50, deps.now, { horizonDays: 28 });
  return valid.find((s) => slotMatches(s, slotIso)) ?? null;
}

function currentSlots(deps: ToolDeps, state: ToolState) {
  return proposeSlots(state.contractor.standingAvailability, 3, deps.now).map((s) => ({ iso: s.iso, label: s.label }));
}
