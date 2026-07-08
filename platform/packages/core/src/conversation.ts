import type { GatheredInfo } from "./types.js";
import { formatSlot, type SlotOption } from "./availability.js";
import { zonedParts } from "./timezone.js";

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
    // Code-set flags carried through so a later mergeGathered() can't silently drop them.
    intent: prev.intent ?? null,
    nudgedAt: prev.nudgedAt ?? null,
    outOfAreaConfirmAsked: prev.outOfAreaConfirmAsked ?? null,
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

/** Parse a clock time ("8", "8am", "8:30 pm", "08:00") into candidate minutes-from-midnight (local).
 *  Without am/pm an ambiguous hour yields BOTH readings (8 → 8:00 and 20:00) so the offered set can
 *  disambiguate. Returns [] if no time is present. */
function parseClockCandidates(text: string): number[] {
  const m = text.trim().match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!m) return [];
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (h > 23 || min > 59) return [];
  const ap = m[3]?.toLowerCase().replace(/\./g, "");
  if (ap === "am") return [((h % 12) * 60 + min)];
  if (ap === "pm") return [(((h % 12) + 12) * 60 + min)];
  const out = new Set<number>([h * 60 + min]);
  if (h < 12) out.add((h + 12) * 60 + min); // "8" could be 8am or 8pm
  return [...out];
}

/**
 * DETERMINISTIC slot resolution (SCOPE §5.1). Map the customer's stated choice — a short id, the label,
 * an ISO instant, or a natural time like "8 am" — back to the exact offered ISO, IN CODE. This replaces
 * trusting the model to echo the right short id (which mis-mapped "8 am" → the 6 AM slot). Returns the
 * matched ISO, or null to re-offer. `timezone` is the contractor's tz for clock-time matching.
 */
export function resolveChosenSlot(
  offeredSlots: Record<string, string> | null | undefined,
  chosen: string | null | undefined,
  timezone: string,
): string | null {
  if (!chosen) return null;
  const c = chosen.trim();
  if (!c) return null;
  const slots = offeredSlots ?? {};
  // 1. exact short id ("3")
  if (Object.prototype.hasOwnProperty.call(slots, c)) return slots[c];
  // 2. a full ISO instant echoed directly (still re-validated by the caller's window/busy checks)
  if (c.includes("T")) {
    const t = Date.parse(c);
    if (!Number.isNaN(t)) return new Date(t).toISOString();
  }
  const entries = Object.entries(slots);
  // 2. label / iso / same-instant
  for (const [, iso] of entries) {
    if (slotMatches({ iso, label: formatSlot(iso, timezone) }, c)) return iso;
  }
  // 3. natural clock time → the offered slot whose LOCAL time matches
  const targets = parseClockCandidates(c);
  if (targets.length) {
    for (const [, iso] of entries) {
      const p = zonedParts(iso, timezone);
      if (targets.includes(p.hh * 60 + p.mm)) return iso;
    }
  }
  return null;
}
