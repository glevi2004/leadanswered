import type { GatheredInfo, QualificationResult, Stage } from "./types.js";
import type { SlotOption } from "./availability.js";
import { isDisqualified } from "./qualification.js";

/** Fields the AI may extract on a single turn. */
export interface ExtractionFields {
  projectType?: string | null;
  serviceTown?: string | null;
  serviceZip?: string | null;
  fullAddress?: string | null;
  isDecisionMaker?: boolean | null;
  chosenSlot?: string | null;
}

/** Merge a turn's extraction into accumulated gathered info (a non-null value wins). */
export function mergeGathered(
  prev: GatheredInfo,
  ext: ExtractionFields,
): GatheredInfo {
  const pick = <T>(a: T | null | undefined, b: T | null | undefined): T | null =>
    a != null ? a : (b ?? null);
  return {
    projectType: pick(ext.projectType, prev.projectType),
    serviceTown: pick(ext.serviceTown, prev.serviceTown),
    serviceZip: pick(ext.serviceZip, prev.serviceZip),
    fullAddress: pick(ext.fullAddress, prev.fullAddress),
    isDecisionMaker:
      ext.isDecisionMaker != null
        ? ext.isDecisionMaker
        : (prev.isDecisionMaker ?? null),
    chosenSlot: pick(ext.chosenSlot, prev.chosenSlot),
  };
}

export type TurnAction = "continue" | "mark_qualified" | "book" | "disqualify";

export interface TurnDecision {
  action: TurnAction;
  nextStage: Stage;
  bookingSlotIso?: string;
}

/**
 * CODE decides the binding action for a turn (SCOPE §5.1). Pure — given the
 * post-extraction state, returns what the orchestrator must do.
 */
export function decideTurn(args: {
  gathered: GatheredInfo;
  qualification: QualificationResult;
  slots: SlotOption[];
  alreadyQualified: boolean;
}): TurnDecision {
  const { gathered, qualification: q, slots, alreadyQualified } = args;

  if (isDisqualified(q)) {
    return { action: "disqualify", nextStage: "done" };
  }

  if (!q.qualified) {
    return { action: "continue", nextStage: "qualifying" };
  }

  // Qualified — book only when we have a full street address AND the chosen slot
  // actually matches one we offered (never book on an unrecognized/garbage value).
  if (gathered.chosenSlot && gathered.fullAddress) {
    const match = slots.find((s) => slotMatches(s, gathered.chosenSlot!));
    if (match) {
      return { action: "book", nextStage: "done", bookingSlotIso: match.iso };
    }
    // chosen slot doesn't match an offered time — keep confirming, don't book.
    return { action: "continue", nextStage: "confirming" };
  }

  if (!alreadyQualified) {
    return { action: "mark_qualified", nextStage: "proposing_slots" };
  }

  return {
    action: "continue",
    nextStage: gathered.chosenSlot ? "confirming" : "proposing_slots",
  };
}

/** Does the customer's chosen-slot value refer to this offered slot? Matches by
 *  id (iso), human label, or parsed instant — the model may echo any of them. */
function slotMatches(slot: SlotOption, chosen: string): boolean {
  const c = chosen.trim();
  if (slot.iso === c || slot.label === c) return true;
  const a = Date.parse(slot.iso);
  const b = Date.parse(c);
  return !Number.isNaN(a) && !Number.isNaN(b) && a === b;
}
