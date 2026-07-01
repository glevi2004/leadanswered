import type { GatheredInfo } from "./types.js";
import type { SlotOption } from "./availability.js";

/** Fields the AI may extract on a single turn. */
export interface ExtractionFields {
  projectType?: string | null;
  serviceTown?: string | null;
  serviceZip?: string | null;
  fullAddress?: string | null;
  isDecisionMaker?: boolean | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
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
    ownerName: pick(ext.ownerName, prev.ownerName),
    ownerPhone: pick(ext.ownerPhone, prev.ownerPhone),
    ownerHandoffDone: prev.ownerHandoffDone ?? null, // code-set flag, carried through
    chosenSlot: pick(ext.chosenSlot, prev.chosenSlot),
    offeredSlots: prev.offeredSlots ?? null, // carried through; written by get_availability
  };
}

/** Does the customer's chosen-slot value refer to this offered slot? Matches by
 *  id (iso), human label, or parsed instant — the model may echo any of them. */
export function slotMatches(slot: SlotOption, chosen: string): boolean {
  const c = chosen.trim();
  if (slot.iso === c || slot.label === c) return true;
  const a = Date.parse(slot.iso);
  const b = Date.parse(c);
  return !Number.isNaN(a) && !Number.isNaN(b) && a === b;
}
