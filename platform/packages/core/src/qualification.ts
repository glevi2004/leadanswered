import { distanceMiles, geocodeZip, normalizeZip, type Geocoder } from "./geo.js";
import type {
  ContractorConfig,
  GatheredInfo,
  QualificationResult,
} from "./types.js";

/**
 * Project-type synonym map. The AI extracts free-text; CODE normalizes it to a
 * canonical type and checks it against the contractor's offered list (SCOPE §5.1).
 */
const PROJECT_SYNONYMS: Record<string, string> = {
  "new roof": "roof_replacement",
  "roof replacement": "roof_replacement",
  "replace roof": "roof_replacement",
  "replacement": "roof_replacement",
  "reroof": "roof_replacement",
  "re-roof": "roof_replacement",
  "roof repair": "roof_repair",
  "repair": "roof_repair",
  "leak": "roof_repair",
  "roof leak": "roof_repair",
  "storm damage": "roof_repair",
  "hail damage": "roof_repair",
  "gutter": "gutters",
  "gutters": "gutters",
  "inspection": "inspection",
};

export function normalizeProjectType(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (PROJECT_SYNONYMS[s]) return PROJECT_SYNONYMS[s];
  for (const [k, v] of Object.entries(PROJECT_SYNONYMS)) {
    if (s.includes(k)) return v;
  }
  return s.replace(/\s+/g, "_");
}

/**
 * Deterministic service-area decision (SCOPE §5.1):
 *   exclude wins → include over radius → within radius of any base.
 * Returns null when there isn't enough info (no/unknown zip).
 */
export function isInServiceArea(
  zipRaw: string | null | undefined,
  area: ContractorConfig["serviceArea"],
  geocoder: Geocoder = geocodeZip,
): boolean | null {
  const zip = normalizeZip(zipRaw);
  if (!zip) return null;

  const exclude = area.excludeOverrides.map((z) => normalizeZip(z));
  const include = area.includeOverrides.map((z) => normalizeZip(z));

  if (exclude.includes(zip)) return false; // exclude always wins
  if (include.includes(zip)) return true; // include beats radius

  const point = geocoder(zip);
  if (!point) return null; // can't locate it yet

  for (const base of area.baseLocations) {
    const basePoint = geocoder(base.zip);
    if (basePoint && distanceMiles(basePoint, point) <= base.radiusMiles) {
      return true;
    }
  }
  return false;
}

/**
 * AI extracts, CODE decides. Given accumulated gathered info + contractor config,
 * returns the full qualification result. Pure and fully unit-testable.
 */
export function qualify(
  gathered: GatheredInfo,
  config: ContractorConfig,
  geocoder: Geocoder = geocodeZip,
): QualificationResult {
  const inArea = isInServiceArea(gathered.serviceZip, config.serviceArea, geocoder);

  const canonical = normalizeProjectType(gathered.projectType);
  const projectOffered =
    canonical == null ? null : config.projectTypes.includes(canonical);

  const requireDM = config.qualificationRules.requireDecisionMaker !== false;
  const isDecisionMaker =
    gathered.isDecisionMaker == null ? null : gathered.isDecisionMaker;

  const missing: QualificationResult["missing"] = [];
  if (inArea == null) missing.push("location");
  if (projectOffered == null) missing.push("project");
  if (requireDM && isDecisionMaker == null) missing.push("decision_maker");

  const qualified =
    inArea === true &&
    projectOffered === true &&
    (!requireDM || isDecisionMaker === true);

  return { inArea, projectOffered, isDecisionMaker, qualified, missing };
}

/** Definitively out of scope (out of area or wrong project) — gate against booking. */
export function isDisqualified(result: QualificationResult): boolean {
  return result.inArea === false || result.projectOffered === false;
}
