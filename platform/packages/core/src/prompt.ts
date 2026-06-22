import type {
  ContractorConfig,
  GatheredInfo,
  QualificationResult,
  Stage,
} from "./types.js";
import type { SlotOption } from "./availability.js";

export interface PromptContext {
  contractor: ContractorConfig;
  leadName: string;
  gathered: GatheredInfo;
  qualification: QualificationResult;
  slots: SlotOption[];
  stage: Stage;
}

/** Hard rules injected verbatim into every system prompt (SCOPE §5, §7). */
export const HARD_RULES = [
  "NEVER quote or estimate a price, hourly rate, or ballpark cost. If asked about price, acknowledge the question, explain that an accurate number needs a quick on-site look, and pivot to booking the free on-site estimate.",
  "Ask ONE question at a time. Keep every message short, warm, and human, like a real person texting. No corporate stiffness, no bullet lists.",
  "Write the way people actually text. Never use em-dashes or long dashes (—); use plain punctuation like periods and commas. Avoid anything that reads as AI-generated.",
  "Never invent availability, prices, or details you were not given.",
  "Before confirming any appointment, you must have their full street address — not just town/ZIP.",
];

/**
 * Assemble the per-contractor system prompt for one turn. The directive is
 * computed by CODE from the qualification result, so the AI phrases the
 * response but never makes the qualify/disqualify/book decision (SCOPE §5.1).
 */
export function assembleSystemPrompt(ctx: PromptContext): string {
  const { contractor, leadName, gathered, slots } = ctx;

  const known = [
    `Customer name: ${leadName || "unknown"}`,
    `Project: ${gathered.projectType ?? "unknown"}`,
    `Town/ZIP: ${gathered.serviceTown ?? "?"} / ${gathered.serviceZip ?? "?"}`,
    `Full street address: ${gathered.fullAddress ?? "not yet collected"}`,
    `Is decision-maker / owner: ${fmtBool(gathered.isDecisionMaker)}`,
    `Slot they have chosen: ${gathered.chosenSlot ?? "none yet"}`,
  ];

  const slotLines = slots.length
    ? slots.map((s) => `- ${s.label}  (id: ${s.iso})`).join("\n")
    : "(none available right now)";

  return [
    `You are ${contractor.sarahName}, the friendly assistant for ${contractor.companyName}.`,
    `You are texting a customer who just reached out through ${contractor.companyName}'s website. You are warm, efficient, and human. You speak on the company's behalf and are never deceptive.`,
    contractor.personaNotes ? `Persona notes: ${contractor.personaNotes}` : "",
    "",
    "WHAT WE KNOW SO FAR:",
    known.map((k) => `- ${k}`).join("\n"),
    "",
    "WHAT TO DO ON THIS MESSAGE:",
    buildDirective(ctx),
    "",
    "APPOINTMENT TIMES YOU MAY OFFER (only when the directive says to; read them naturally, never read the id aloud, but set chosen_slot to the id when the customer picks one):",
    slotLines,
    "",
    "HARD RULES (never break):",
    HARD_RULES.map((r) => `- ${r}`).join("\n"),
    "",
    `Services we offer: ${contractor.projectTypes.join(", ")}.`,
    "Respond with ONLY the text message to send — no labels, no reasoning, no meta-commentary.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function buildDirective(ctx: PromptContext): string {
  const { qualification: q, gathered, slots, contractor } = ctx;

  if (q.inArea === false) {
    return "This customer is OUTSIDE our service area. Warmly let them know we don't cover their area, wish them well, and do NOT book anything.";
  }
  if (q.projectOffered === false) {
    return "This customer's project is not something we offer. Politely let them know it's not a service we provide and do NOT book anything.";
  }
  if (!q.qualified) {
    const asks: string[] = [];
    if (q.missing.includes("project")) asks.push("what they need done (the type of work)");
    if (q.missing.includes("location")) asks.push("their property's town or ZIP code");
    if (q.missing.includes("decision_maker")) asks.push("whether it's their own home / they're the decision-maker");
    return `We still need: ${asks.join("; ")}. Acknowledge their message, then ask for the single most important missing item, naturally. Do NOT propose appointment times yet.`;
  }
  if (gathered.chosenSlot && gathered.fullAddress) {
    return `They are qualified, have picked a time, and gave their address. Warmly confirm the appointment and tell them ${contractor.companyName} will see them then.`;
  }
  if (gathered.chosenSlot && !gathered.fullAddress) {
    return "They are qualified and picked a time. Ask for their full street address so the team knows exactly where to go for the on-site estimate, then confirm.";
  }
  if (slots.length === 0) {
    return "They are qualified, but there are no open times right now. Let them know the team will reach out shortly to schedule.";
  }
  return "They are qualified! Let them know you can get them on the calendar for a FREE on-site estimate, offer 2-3 of the appointment times listed above, and ask which works best.";
}

function fmtBool(b: boolean | null | undefined): string {
  if (b === true) return "yes";
  if (b === false) return "no";
  return "unknown";
}
