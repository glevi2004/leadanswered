import { generateObject } from "ai";
import { z } from "zod";
import { normalizePhone, qualify } from "@leadanswered/core";
import { buildTools, type ToolState } from "../agent/tools.js";
import type { AgentDeps, ChatTurn } from "../agent/runner.js";

/**
 * The INTAKE engine (Workflow 1 — website/email lead). While `conversation.state === "intake"`, code
 * owns the sequence and emits the LOCKED copy; the model is used ONLY to READ each reply (the
 * extractor). It never writes the scripted questions. Deterministic decisions (qualify / availability /
 * booking / escalation) reuse the proven tool executes in `agent/tools.ts`. When the script ends —
 * booked, handed off, or declined — the conversation flips to `agent` / `done` and the open agent
 * takes over. See AGENT_WORKFLOWS_PLAN.md.
 */

export type IntakeDeps = AgentDeps;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const PLACEHOLDER_NAMES = new Set(["", "new lead", "caller", "there", "customer"]);

const firstName = (n: string | null | undefined) => (n ?? "").trim().split(/\s+/)[0] ?? "";
const hasRealName = (n: string | null | undefined) => !PLACEHOLDER_NAMES.has((n ?? "").trim().toLowerCase());
const bullets = (items: string[]) => items.map((i) => `• ${i}`).join("\n");

/** Call a tool execute (built via the `ai` `tool()` helper) directly from the engine. The engine
 *  controls the flow, so we bypass the SDK's tool-call plumbing and read the typed result. */
async function callTool<T = any>(t: any, input: any): Promise<T> {
  return (await t.execute(input, { toolCallId: "intake", messages: [] })) as T;
}

// ---------------------------------------------------------------------------
// Step 0 — the opening, fired at lead creation (deterministic; no model call).
// ---------------------------------------------------------------------------
export function intakeOpening(state: ToolState): string {
  const g = state.gathered;
  const named = hasRealName(state.lead.contactName);
  const greeting = named ? `Hi ${firstName(state.lead.contactName)}!` : "Hi there!";
  const reason = g.projectType ? `, about your ${g.projectType}` : "";
  const intro = `${greeting} It's ${state.organization.sarahName} with ${state.organization.companyName}. Thanks for reaching out${reason}. I'm here to help get it taken care of.`;
  const ask = named
    ? `What's the property address so I can get someone out to take a look? (street, city, and ZIP)`
    : `What's your name and the property address so I can get someone out to take a look? (street, city, and ZIP)`;
  return `${intro}\n\n${ask}`;
}

/** Missed-call opening (Workflow 2) — intent-agnostic; we know nothing but the phone number. */
export function missedCallOpening(state: ToolState): string {
  return `Hi there! It's ${state.organization.sarahName} with ${state.organization.companyName}. Sorry we missed your call! How can we help?`;
}

// ---------------------------------------------------------------------------
// The extractor — the model's ONLY intake job: read the reply, pull structured values.
// ---------------------------------------------------------------------------
const ExtractSchema = z.object({
  name: z.string().nullable().describe("the customer's own name, if they give it"),
  projectType: z.string().nullable().describe("the work they need, in their words (e.g. roof leak, replacement, gutters)"),
  intent: z.enum(["new_project", "existing_customer", "general_question", "other"]).nullable().describe("why they reached out — a brand-new job, an existing customer, a general question, or other"),
  fullAddress: z.string().nullable().describe("full street address if given"),
  town: z.string().nullable(),
  zip: z.string().nullable().describe("5-digit ZIP if given"),
  isDecisionMaker: z.boolean().nullable().describe("true if they can approve the work, false if acting on someone else's behalf / not the decision-maker, null if unclear"),
  ownerName: z.string().nullable().describe("if they are NOT the decision-maker: the decision-maker's name"),
  ownerPhone: z.string().nullable().describe("if they are NOT the decision-maker: the decision-maker's phone"),
  chosenDayOfWeek: z.number().int().min(0).max(6).nullable().describe("if they picked a day: Sun=0..Sat=6"),
  chosenDayLabel: z.string().nullable().describe("the day they picked, in words (e.g. 'Thursday')"),
  chosenTime: z.string().nullable().describe("the specific time they picked, in their words (e.g. '8 am', 'the 1pm')"),
  addressConfirmed: z.boolean().nullable().describe("only if we asked them to confirm their address: true = yes it's right, false = no"),
  offScript: z.enum(["none", "question", "withdrew"]).describe("'withdrew' = they no longer want this / went elsewhere; 'question' = they asked something instead of answering; else 'none'"),
  offScriptQuestion: z.string().nullable().describe("if offScript='question', the question they asked"),
});
export type IntakeExtract = z.infer<typeof ExtractSchema>;

async function extractIntake(deps: IntakeDeps, history: ChatTurn[]): Promise<IntakeExtract> {
  const recent = history
    .slice(-8)
    .map((t) => `${t.role === "user" ? "Customer" : "Sarah"}: ${typeof t.content === "string" ? t.content : "(photo)"}`)
    .join("\n");
  try {
    const { object } = await generateObject({
      model: deps.model,
      schema: ExtractSchema,
      prompt:
        "You are reading a home-services SMS intake and pulling structured values from what the CUSTOMER has said (consider the whole thread, not just the last line). Rules:\n" +
        "- fullAddress: the COMPLETE street address if it appears anywhere (e.g. '100 Main St, Newton MA 02458'). Whenever you set fullAddress, ALSO set town and the 5-digit zip parsed from it.\n" +
        "- isDecisionMaker: true if they can approve the work; false if acting on someone else's behalf / not the decision-maker.\n" +
        "- chosenDayOfWeek (Sun=0..Sat=6) + chosenDayLabel: set these whenever they name OR ask about a day, even phrased as a question ('what do you have Monday?' → Monday). chosenTime: the clock time they picked ('8 am').\n" +
        "- intent: why they reached out.\n" +
        "- offScript: 'withdrew' ONLY if they clearly drop out with no other request ('never mind', 'went with someone else'). If they ask a QUESTION (even after 'ok, no worries'), use 'question', NOT 'withdrew'. 'question' is for things the scheduling flow cannot answer — pricing, a referral/recommendation for another company, whether you offer a specific service, warranties, policy. Asking about AVAILABILITY or times is NOT off-script (extract the day/time instead). Otherwise 'none'.\n" +
        "Use null for anything not actually stated. Never invent values.\n\n" +
        `Conversation:\n${recent}\n\nExtract the fields.`,
      experimental_telemetry: { isEnabled: true, functionId: "intake-extract" },
    });
    return object;
  } catch (e) {
    console.error("[intake] extract failed:", e);
    return {
      name: null, projectType: null, intent: null, fullAddress: null, town: null, zip: null,
      isDecisionMaker: null, ownerName: null, ownerPhone: null, chosenDayOfWeek: null,
      chosenDayLabel: null, chosenTime: null, addressConfirmed: null, offScript: "none",
      offScriptQuestion: null,
    };
  }
}

// ---------------------------------------------------------------------------
// The turn — handle one inbound while in intake. Returns the message to send.
// Mutates `state` (via tool executes) and may flip conversation.state to agent/done.
// ---------------------------------------------------------------------------
export async function runIntakeTurn(deps: IntakeDeps, state: ToolState, history: ChatTurn[]): Promise<string> {
  const tools = buildTools({ store: deps.store, sms: deps.sms, email: deps.email, now: deps.now }, state);
  const ex = await extractIntake(deps, history);

  // 4) Withdrawal → warm close, end intake.
  if (ex.offScript === "withdrew") {
    await deps.store.updateConversation(state.conversation.id, { state: "done" });
    return "No worries at all, thanks for letting me know! We're here if anything changes.";
  }

  // 1/2) Record everything the reply carried (this also fires qualification notifications as facts land).
  await callTool(tools.qualify_lead, {
    name: ex.name ?? undefined,
    projectType: ex.projectType ?? undefined,
    zip: ex.zip ?? undefined,
    town: ex.town ?? undefined,
    fullAddress: ex.fullAddress ?? undefined,
    isDecisionMaker: ex.isDecisionMaker ?? undefined,
    ownerName: ex.ownerName ?? undefined,
    ownerPhone: ex.ownerPhone ?? undefined,
  });
  // Backfill the ZIP from a full address when the extractor didn't isolate it — the service-area check
  // and booking both need it, and models often give the street but drop the ZIP field.
  if (state.gathered.fullAddress && !state.gathered.serviceZip) {
    const zip = state.gathered.fullAddress.match(/\b(\d{5})\b/)?.[1];
    if (zip) {
      state.gathered = { ...state.gathered, serviceZip: zip };
      await deps.store.updateConversation(state.conversation.id, { gathered: state.gathered });
      await deps.store.updateLeadFields(state.lead.id, { serviceZip: zip });
    }
  }
  const g = state.gathered; // snapshot after the backfill
  const name = firstName(state.lead.contactName);

  // 3) Off-script question → escalate, ack, then re-ask the pending step.
  if (ex.offScript === "question" && ex.offScriptQuestion) {
    await callTool(tools.escalate_to_organization, { question: ex.offScriptQuestion });
    return `Good question — I've flagged that for the team and they'll be right back to you! ${pendingAsk(state)}`;
  }

  // --- Missed-call FRONT (Workflow 2): classify the reply to "how can we help?" ---
  if (state.lead.source === "missed_call" && !g.fullAddress && !g.serviceZip && !g.serviceTown) {
    if (ex.intent && ex.intent !== "new_project") {
      // Not a new job (existing customer / question / wrong number) → escalate, hand to the agent.
      await callTool(tools.escalate_to_organization, {
        question: `Missed-call reply from ${state.lead.contactName}: "${lastUserText(history)}". Not a new job — needs a look.`,
      });
      await deps.store.updateConversation(state.conversation.id, { state: "agent" });
      return "Got it! I'll let the team know and get right back to you!";
    }
    return "Happy to help get that taken care of! What's your name and property address? (street, city, and ZIP)";
  }

  // --- Need the FULL street address first (booking + the service-area check both require it) ---
  if (!g.fullAddress) {
    return "Happy to help! What's the full property address so I can get someone out to take a look? (street, city, and ZIP)";
  }

  // --- Branch B: out of service area (confirm before declining, to catch typos) ---
  const q = qualify(g, state.organization);
  if (q.inArea === false) {
    if (!g.outOfAreaConfirmAsked) {
      state.gathered = { ...g, outOfAreaConfirmAsked: true };
      await deps.store.updateConversation(state.conversation.id, { gathered: state.gathered });
      const shown = g.fullAddress ?? [g.serviceTown, g.serviceZip].filter(Boolean).join(", ");
      return `I just checked your address, and it looks like you're outside our service area. Just to confirm again, your address is ${shown} right?`;
    }
    // Already asked to confirm; a corrected in-area address would have made q.inArea true above.
    await callTool(tools.escalate_to_organization, {
      question: `Out-of-area lead ${state.lead.contactName} at ${g.fullAddress ?? g.serviceZip} — passing along just in case.`,
    });
    await deps.store.updateConversation(state.conversation.id, { state: "done" });
    return `Thanks ${name}, I checked again and it really is outside our service area, but I've passed it along to the team just in case. Sorry about that, and I hope you get it taken care of soon!`;
  }

  // --- Need the customer's NAME — re-ask; never proceed as a placeholder ("Caller"/"New lead") ---
  if (!hasRealName(state.lead.contactName)) {
    return "Thanks! And what's your name? (just so I know who I'm setting this up for)";
  }

  // --- Step 1 / Branch A: decision-maker ---
  const requireDM = state.organization.qualificationRules?.requireDecisionMaker !== false;
  if (requireDM && g.isDecisionMaker == null) {
    return `Got it, thanks ${name}! And are you the decision-maker (the person who'd approve the work)?`;
  }
  if (requireDM && g.isDecisionMaker === false) {
    if (!g.ownerName || !g.ownerPhone) {
      return "No problem! Could you share the decision-maker's name and best phone number? I'll reach out to them directly to get it set up.";
    }
    // A3 — reach out to the decision-maker as a new lead, then close this referrer thread.
    await reachOutToOwner(deps, state);
    await deps.store.updateConversation(state.conversation.id, { state: "done" });
    return `Perfect, thank you! I'll reach out to ${g.ownerName} directly to get things going. Appreciate you passing it along!`;
  }

  // --- Steps 2-4: windows → times → booking (qualified customer) ---
  // Step 4 — book, if they picked a concrete offered time.
  if (ex.chosenTime && g.offeredSlots && Object.keys(g.offeredSlots).length > 0) {
    const res = await callTool<{ ok: boolean; label?: string; times?: { label: string }[] }>(tools.book_appointment, {
      chosenTime: ex.chosenTime,
      fullAddress: g.fullAddress ?? "",
    });
    if (res.ok && res.label) {
      // calendar.book flips conversation.state to "agent" — intake is done.
      return `You're all set for ${res.label}, ${name}! We'll see you then. Anything else I can help with?`;
    }
    if (res.times && res.times.length > 0) {
      return `Ah, that time just got taken! Here's what's still open:\n${bullets(res.times.map((t) => t.label))}\nWhich works best?`;
    }
    // fall through to re-offer below
  }

  // Step 3 — concrete times, if they picked a day.
  if (ex.chosenDayOfWeek != null) {
    const av = await callTool<{ times?: { id: string; label: string }[] }>(tools.check_availability, {
      dayOfWeek: ex.chosenDayOfWeek,
    });
    if (av.times && av.times.length > 0) {
      // If they named a specific time in the same breath ("Monday at 8am"), book it directly now that
      // the day's slots are offered.
      if (ex.chosenTime) {
        const res = await callTool<{ ok: boolean; label?: string }>(tools.book_appointment, {
          chosenTime: ex.chosenTime,
          fullAddress: g.fullAddress ?? "",
        });
        if (res.ok && res.label) {
          return `You're all set for ${res.label}, ${name}! We'll see you then. Anything else I can help with?`;
        }
      }
      const day = ex.chosenDayLabel || DAY_NAMES[ex.chosenDayOfWeek];
      return `Perfect, ${name}! On ${day} I've got:\n${bullets(av.times.map((t) => t.label))}\nWhich works best?`;
    }
    // no times that day → fall through to windows
  }

  // Step 2 — general windows.
  const ov = await callTool<{ windows?: string[] }>(tools.check_availability, {});
  if (ov.windows && ov.windows.length > 0) {
    return `Perfect! Here's when we could get someone out:\n${bullets(ov.windows.slice(0, 4))}\nAny of those work for you?`;
  }

  // No availability at all → escalate rather than invent a time.
  await callTool(tools.escalate_to_organization, {
    question: `No open availability to offer ${state.lead.contactName}. How should I proceed?`,
  });
  return "Let me check with the team on the schedule and I'll be right back to you!";
}

function lastUserText(history: ChatTurn[]): string {
  for (let i = history.length - 1; i >= 0; i--) {
    const t = history[i];
    if (t && t.role === "user") return typeof t.content === "string" ? t.content : "(photo)";
  }
  return "";
}

/** Re-ask the current pending step after handling an off-script interruption. */
function pendingAsk(state: ToolState): string {
  const g = state.gathered;
  if (!g.fullAddress && !g.serviceZip && !g.serviceTown) {
    return "What's the property address? (street, city, and ZIP)";
  }
  if (g.isDecisionMaker == null) {
    return "And are you the decision-maker (the person who'd approve the work)?";
  }
  return "Which day works best to get someone out?";
}

/** Branch A3 — create a NEW lead for the decision-maker (already knows project + address) and text them. */
async function reachOutToOwner(deps: IntakeDeps, state: ToolState): Promise<void> {
  const g = state.gathered;
  const ownerPhone = normalizePhone(g.ownerPhone ?? "") ?? g.ownerPhone ?? "";
  if (!ownerPhone) return;
  const referrer = state.lead.contactName;
  const ctx = await deps.store.createLeadWithConversation({
    organizationId: state.organization.id,
    contactName: g.ownerName ?? "Contact",
    contactPhone: ownerPhone,
    projectHint: g.projectType ?? undefined,
    source: "referral",
  });
  // Seed the owner's working memory so their intake skips straight to windows on "yes".
  const seeded = {
    ...(ctx.conversation.gathered ?? {}),
    projectType: g.projectType ?? null,
    fullAddress: g.fullAddress ?? null,
    serviceTown: g.serviceTown ?? null,
    serviceZip: g.serviceZip ?? null,
    isDecisionMaker: true,
  };
  await deps.store.updateConversation(ctx.conversation.id, { gathered: seeded });
  await deps.store.updateLeadFields(ctx.lead.id, {
    projectHint: g.projectType ?? undefined,
    fullAddress: g.fullAddress ?? undefined,
    serviceTown: g.serviceTown ?? undefined,
    serviceZip: g.serviceZip ?? undefined,
  });
  const project = g.projectType ?? "your project";
  const at = g.fullAddress ? ` at ${g.fullAddress}` : "";
  const outreach =
    `Hi ${firstName(g.ownerName)}! It's ${state.organization.sarahName} with ${state.organization.companyName}. ${referrer} reached out about ${project}${at} and passed along your number so I could get in touch. I'm here to help get it taken care of.\n\n` +
    `Would you like me to get someone out to take a look?`;
  await deps.store.appendMessage(ctx.conversation.id, { direction: "outbound", body: outreach });
  try {
    await deps.sms.send(ownerPhone, outreach);
  } catch (e) {
    console.error("[intake] owner outreach send failed:", e);
  }
}
