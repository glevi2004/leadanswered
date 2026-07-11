import { tool } from "ai";
import { z } from "zod";
import type { Store } from "../store/types.js";

/** Holder the prepare tool writes into, so the agent turn can pick up the staged draft after it runs. */
export interface OrganizationDraft {
  pending?: { leadId: string; leadName: string; message: string };
}

/**
 * The OWNER agent's toolkit (Workflow 3). The owner directs the assistant like an employee. The
 * send is a HARD GATE: `prepare_message_to_lead` only STAGES a draft; nothing reaches a customer until
 * the owner confirms and code sends it (see ownerAgent.ts). The model cannot message a customer
 * on its own.
 */
export function buildOwnerTools(store: Store, organizationId: string, draft: OrganizationDraft) {
  return {
    find_leads: tool({
      description:
        "Look up this organization's leads/customers by name. Returns matches with their project + area so you can pick the right one, or ask the owner which they mean when more than one matches.",
      inputSchema: z.object({ name: z.string().describe("the customer's name to search for") }),
      execute: async ({ name }) => {
        const matches = await store.findLeadsByName(organizationId, name);
        return {
          matches: matches.map((l) => ({
            leadId: l.id,
            name: l.contactName,
            project: l.projectHint ?? null,
            area: l.serviceTown ?? l.serviceZip ?? null,
          })),
        };
      },
    }),

    prepare_message_to_lead: tool({
      description:
        "Stage a text to send to ONE of the organization's leads. This does NOT send it — it prepares the message so you can read it back to the owner and get a yes first. Call this only once you know exactly which lead and what to say, with the note written in your own warm words.",
      inputSchema: z.object({
        leadId: z.string().describe("the leadId from find_leads"),
        message: z.string().describe("the message to the customer, in Sarah's own warm words (don't add facts the owner didn't give)"),
      }),
      execute: async ({ leadId, message }) => {
        const ctx = await store.getContextByLeadId(leadId);
        if (!ctx) return { ok: false as const, reason: "lead_not_found" };
        draft.pending = { leadId, leadName: ctx.lead.contactName, message };
        return { ok: true as const, leadName: ctx.lead.contactName, message };
      },
    }),
  };
}
