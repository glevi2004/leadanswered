import { tool } from "ai";
import { z } from "zod";
import {
  formatSlot,
  isDisqualified,
  isWithinStandingWindow,
  mergeGathered,
  nextWeekStart,
  qualify,
  resolveChosenSlot,
  windowStarts,
  type ContractorConfig,
  type GatheredInfo,
} from "@leadanswered/core";
import { fireNotification, type NotifyDeps } from "../notify.js";
import { enqueueEscalationSla } from "../queue.js";
import { InternalCalendarProvider } from "../calendar/provider.js";
import { handOffOwnerIfReady } from "./ownerHandoff.js";
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

const DAY_MS = 24 * 60 * 60 * 1000;

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

const standingWindows = (c: ContractorConfig) => c.standingAvailability?.windows ?? [];
const sameInstant = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;

/** Resolve the [from,to] search range from the model's request (week boundaries in the contractor tz). */
function resolveRange(
  input: { range?: string; fromIso?: string; toIso?: string; dayOfWeek?: number; partOfDay?: string },
  now: Date,
  tz: string,
): { fromIso: string; toIso: string } {
  if (input.range === "next_week") {
    const from = nextWeekStart(now, tz);
    return { fromIso: from.toISOString(), toIso: new Date(from.getTime() + 7 * DAY_MS).toISOString() };
  }
  if (input.range === "this_week") {
    return { fromIso: now.toISOString(), toIso: nextWeekStart(now, tz).toISOString() };
  }
  if (input.range === "specific" && input.fromIso) {
    const from = new Date(input.fromIso);
    const to = input.toIso ? new Date(input.toIso) : new Date(from.getTime() + 7 * DAY_MS);
    return { fromIso: from.toISOString(), toIso: to.toISOString() };
  }
  // Default (incl. a bare day/part-of-day request): scan the next two weeks.
  return { fromIso: now.toISOString(), toIso: new Date(now.getTime() + 14 * DAY_MS).toISOString() };
}

/**
 * The agent's toolkit (SCOPE §5.1). The model orchestrates + CHOOSES tools; every business decision is
 * deterministic CODE inside the tool body, and the RESULT is authoritative. Availability + booking go
 * through the CalendarProvider port (internal adapter now, Google later) — the DB EXCLUDE constraints
 * are the double-booking backstop; open windows already subtract booked time.
 */
export function buildTools(deps: ToolDeps, state: ToolState) {
  const calendar = new InternalCalendarProvider(deps.store, state.contractor, deps.now);
  const tz = calendar.tz(); // the contractor's IANA timezone — all offered/booked times are in it

  /** A few genuinely-free start times (one per day, spread) to re-offer after a booking conflict. */
  async function freshTimes(): Promise<{ id: string; label: string }[]> {
    const windows = await calendar.getAvailability({
      fromIso: deps.now.toISOString(),
      toIso: new Date(deps.now.getTime() + 14 * DAY_MS).toISOString(),
    });
    const picks = windows.slice(0, 3).map((w) => windowStarts(w, tz)[0]).filter(Boolean);
    const map: Record<string, string> = {};
    const out = picks.map((s, i) => {
      const id = String(i + 1);
      map[id] = s.iso;
      return { id, label: s.label };
    });
    state.gathered = { ...state.gathered, offeredSlots: map };
    await persistGathered(deps, state);
    return out;
  }

  return {
    qualify_lead: tool({
      description:
        "Record what you've learned about the lead and check if they qualify. Call this whenever you learn their project, town/ZIP/address, or whether they own the home. Returns what is still missing and whether they qualify. You decide what to SAY; this decides the facts.",
      inputSchema: z.object({
        name: z.string().optional().describe("The customer's name, once they give it (writes to the lead so the dashboard shows it, not 'Caller')"),
        projectType: z.string().optional().describe("The work they need, in their words (e.g. roof leak, replacement, gutters)"),
        zip: z.string().optional().describe("5-digit ZIP of the property"),
        town: z.string().optional().describe("Town/city of the property"),
        fullAddress: z.string().optional().describe("Full street address if given"),
        isDecisionMaker: z
          .boolean()
          .optional()
          .describe("True ONLY if they OWN the home or are the authorized decision-maker for the work; a tenant/renter is false"),
        ownerName: z.string().optional().describe("If they're NOT the homeowner: the homeowner's name, if given"),
        ownerPhone: z.string().optional().describe("If they're NOT the homeowner: the homeowner's phone number, if given"),
      }),
      execute: async (input) => {
        state.gathered = mergeGathered(state.gathered, {
          projectType: input.projectType ?? null,
          serviceZip: input.zip ?? null,
          serviceTown: input.town ?? null,
          fullAddress: input.fullAddress ?? null,
          isDecisionMaker: input.isDecisionMaker ?? null,
          ownerName: input.ownerName ?? null,
          ownerPhone: input.ownerPhone ?? null,
        });
        await persistGathered(deps, state);

        // Capture the customer's name onto the lead so the dashboard + notifications show it (not
        // "Caller"/"New lead"). Set on `state.lead` BEFORE any notification fires below.
        if (input.name && input.name.trim()) {
          state.lead.contactName = input.name.trim();
          await deps.store.updateLeadFields(state.lead.id, { contactName: state.lead.contactName });
        }

        const q = qualify(state.gathered, state.contractor);

        // Conditional transitions: the notification fires only if THIS call actually moved the lead's
        // status (so concurrent turns / retries can't double-notify).
        if (isDisqualified(q)) {
          const moved = await deps.store.transitionLeadStatus(
            state.lead.id,
            ["new", "contacted", "qualifying"],
            "disqualified",
          );
          if (moved) {
            state.lead.status = "disqualified";
            await fireNotification(deps, state, "disqualified_lead", state.gathered, null);
          }
        } else if (q.qualified) {
          const moved = await deps.store.transitionLeadStatus(state.lead.id, ["new", "contacted"], "qualifying");
          if (moved) {
            state.lead.status = "qualifying";
            await fireNotification(deps, state, "new_qualified_lead", state.gathered, null);
          }
        }

        // Not the homeowner → DETERMINISTIC hand-off. Once we have the owner's phone, code (not the
        // model) pings the contractor. Until then, tell the model to ask for the owner's name + phone.
        let ownerHandoff: "need_owner_contact" | "done" | undefined;
        const requireDM = state.contractor.qualificationRules?.requireDecisionMaker !== false;
        if (requireDM && q.isDecisionMaker === false) {
          await handOffOwnerIfReady({ store: deps.store, sms: deps.sms }, state);
          ownerHandoff = state.gathered.ownerHandoffDone ? "done" : "need_owner_contact";
        }

        return {
          qualified: q.qualified,
          inArea: q.inArea,
          projectOffered: q.projectOffered,
          isDecisionMaker: q.isDecisionMaker,
          missing: q.missing,
          locationStatus: q.locationStatus,
          zipUnverified: q.zipUnverified,
          ...(ownerHandoff ? { ownerHandoff } : {}),
        };
      },
    }),

    check_availability: tool({
      description:
        "Read the calendar's OPEN availability. For a general question ('what's next week?') it returns open WINDOWS (a day + a time range) — describe those in plain language, don't list individual times. Pass dayOfWeek and/or partOfDay to focus on a specific day/time — it then returns concrete start TIMES (each with a short id) you can offer and book. Never offer anything it didn't return.",
      inputSchema: z.object({
        range: z.enum(["this_week", "next_week", "specific"]).optional(),
        dayOfWeek: z.number().int().min(0).max(6).optional().describe("Focus on one weekday: Sun=0, Mon=1, … Sat=6"),
        partOfDay: z.enum(["morning", "afternoon", "evening"]).optional(),
        fromIso: z.string().optional().describe("For range:'specific' — ISO start"),
        toIso: z.string().optional().describe("For range:'specific' — ISO end"),
      }),
      execute: async (input) => {
        const { fromIso, toIso } = resolveRange(input, deps.now, tz);
        const windows = await calendar.getAvailability({
          fromIso,
          toIso,
          dayOfWeek: input.dayOfWeek,
          partOfDay: input.partOfDay,
        });
        if (windows.length === 0) return { windows: [], times: [] };

        const focused = input.dayOfWeek != null || input.partOfDay != null;
        if (focused) {
          const starts = windows.flatMap((w) => windowStarts(w, tz)).slice(0, 6);
          const map: Record<string, string> = {};
          const times = starts.map((s, i) => {
            const id = String(i + 1);
            map[id] = s.iso;
            return { id, label: s.label };
          });
          state.gathered = { ...state.gathered, offeredSlots: map };
          await persistGathered(deps, state);
          return { times }; // concrete bookable times for a specific day/part
        }
        // Overview: describe these open windows (day + range); ask which day/time they'd like.
        return { windows: windows.slice(0, 8).map((w) => w.label) };
      },
    }),

    book_appointment: tool({
      description:
        "Book the free on-site estimate at a time the lead picked. Pass `chosenTime` = the time the customer chose — their own words ('8 am', 'Tuesday at 9'), the option label, or the short id from check_availability — plus their full street address. Code resolves it to the exact slot; trust its result before telling the customer anything is booked.",
      inputSchema: z.object({
        chosenTime: z.string().describe("The time the customer chose, in their words or the offered label/id (e.g. '8 am', '1')"),
        fullAddress: z.string().describe("Full street address for the visit"),
      }),
      execute: async (input) => {
        const chosenIso = resolveChosenSlot(state.gathered.offeredSlots, input.chosenTime, tz);
        state.gathered = mergeGathered(state.gathered, {
          fullAddress: input.fullAddress ?? null,
          chosenSlot: chosenIso,
        });
        await persistGathered(deps, state);

        const q = qualify(state.gathered, state.contractor);
        if (!q.qualified) return { ok: false as const, reason: "not_qualified", missing: q.missing };
        if (!input.fullAddress || input.fullAddress.trim() === "")
          return { ok: false as const, reason: "need_address" };
        if (!chosenIso || !isWithinStandingWindow(standingWindows(state.contractor), chosenIso, tz))
          return { ok: false as const, reason: "slot_unavailable", times: await freshTimes() };

        const res = await calendar.book({ leadId: state.lead.id, startIso: chosenIso });
        if (!res.ok) {
          if (res.reason === "lead_has_active") {
            const existing = await deps.store.getActiveAppointmentByLead(state.lead.id);
            if (existing && sameInstant(chosenIso, existing.startIso))
              return { ok: true as const, slotIso: chosenIso, label: formatSlot(chosenIso, tz), already: true };
            return {
              ok: false as const,
              reason: "already_booked",
              currentLabel: existing ? formatSlot(existing.startIso, tz) : null,
            };
          }
          return { ok: false as const, reason: "slot_unavailable", times: await freshTimes() };
        }

        state.lead.status = "booked";
        await fireNotification(deps, state, "booking_confirmed", state.gathered, chosenIso);
        return { ok: true as const, slotIso: chosenIso, label: formatSlot(chosenIso, tz) };
      },
    }),

    reschedule_appointment: tool({
      description:
        "Move the lead's existing booking to a new time they picked (from check_availability). Only for leads who already have a booking.",
      inputSchema: z.object({
        chosenTime: z.string().describe("The new time the customer chose, in their words or the offered label/id (e.g. '8 am', '1')"),
      }),
      execute: async (input) => {
        const appt = await deps.store.getActiveAppointmentByLead(state.lead.id);
        if (!appt) return { ok: false as const, reason: "no_appointment" };
        const newIso = resolveChosenSlot(state.gathered.offeredSlots, input.chosenTime, tz);
        if (!newIso || !isWithinStandingWindow(standingWindows(state.contractor), newIso, tz))
          return { ok: false as const, reason: "slot_unavailable", times: await freshTimes() };

        const res = await calendar.reschedule(appt.id, newIso);
        if (!res.ok)
          return { ok: false as const, reason: "slot_unavailable", times: await freshTimes() };

        state.gathered = mergeGathered(state.gathered, { chosenSlot: newIso });
        await persistGathered(deps, state);
        await fireNotification(deps, state, "booking_rescheduled", state.gathered, newIso);
        return { ok: true as const, slotIso: newIso, label: formatSlot(newIso, tz) };
      },
    }),

    cancel_appointment: tool({
      description: "Cancel the lead's existing booking. Only for leads who already have a booking.",
      inputSchema: z.object({
        reason: z.string().optional().describe("Why they're cancelling, if they said"),
      }),
      execute: async (input) => {
        const appt = await deps.store.getActiveAppointmentByLead(state.lead.id);
        if (!appt) return { ok: false as const, reason: "no_appointment" };

        await calendar.cancel(appt.id, input.reason ?? null, deps.now.toISOString());
        // Re-open the lead so they can rebook in the same thread if they want.
        state.lead.status = "contacted";
        await deps.store.updateLeadFields(state.lead.id, { status: "contacted" });
        await deps.store.updateConversation(state.conversation.id, { state: "agent" });
        await fireNotification(deps, state, "booking_cancelled", state.gathered, appt.startIso);
        return { ok: true as const };
      },
    }),

    escalate_to_contractor: tool({
      description:
        "Use this when you genuinely cannot resolve something yourself — a tool keeps failing, the customer asks something only the contractor can answer, they ask for a referral/recommendation you can't give, or an unusual situation. It notifies the contractor with the question; they text back an answer that gets relayed to the customer. After calling this, tell the customer you've flagged it for the team and someone will be right back to them. Never promise a human follow-up without calling this first.",
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
        // Chase the contractor if they don't answer, and eventually expire it (SCOPE §9.7).
        await enqueueEscalationSla(esc.id, 1);
        return { ok: true as const, escalationId: esc.id };
      },
    }),

    set_intent: tool({
      description:
        "Record WHY the customer reached out, once it's clear — a brand-new project, an existing customer, a general question, or something else. Call it when their intent becomes clear so we follow up appropriately. This does not change what you say; you still decide the reply.",
      inputSchema: z.object({
        intent: z.enum(["new_project", "existing_customer", "general_question", "other"]),
      }),
      execute: async (input) => {
        state.gathered = { ...state.gathered, intent: input.intent };
        await persistGathered(deps, state);
        return { ok: true as const, intent: input.intent };
      },
    }),
  };
}
