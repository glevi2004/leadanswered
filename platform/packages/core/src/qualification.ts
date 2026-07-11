import {
  defaultGeo,
  distanceMiles,
  geocodeZip,
  normalizeZip,
  type Geo,
  type Geocoder,
} from "./geo.js";
import type {
  OrganizationConfig,
  GatheredInfo,
  LatLng,
  LocationStatus,
  MissingField,
  QualificationResult,
  ServiceArea,
} from "./types.js";

/**
 * Project-type synonym map. The AI extracts free-text; CODE normalizes it to a
 * canonical type and checks it against the organization's offered list (SCOPE §5.1).
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
 * Zip-only service-area decision (SCOPE §5.1):
 *   exclude wins → include over radius → within radius of any base.
 * Returns null when there isn't enough info (no/unknown zip). For the full
 * resolution that adds the city fallback, use `evaluateServiceArea`.
 */
export function isInServiceArea(
  zipRaw: string | null | undefined,
  area: ServiceArea,
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

  return withinAnyBase(point, area, geocoder);
}

function withinAnyBase(point: LatLng, area: ServiceArea, geocodeZipFn: Geocoder): boolean {
  for (const base of area.baseLocations) {
    const basePoint = geocodeZipFn(base.zip);
    if (basePoint && distanceMiles(basePoint, point) <= base.radiusMiles) {
      return true;
    }
  }
  return false;
}

/**
 * Full service-area resolution with the city fallback (SCOPE §5.1). Overrides win
 * by zip (even un-geocodable ones); otherwise we resolve a point from the zip, then
 * fall back to the town/city, then run the radius check. The returned `status` lets
 * the conversation ask for a street address + city when a zip can't be located,
 * instead of looping on "what's your zip?".
 */
export function evaluateServiceArea(
  gathered: GatheredInfo,
  area: ServiceArea,
  geo: Geo = defaultGeo,
): { inArea: boolean | null; status: LocationStatus; zipUnverified: boolean } {
  const zip = normalizeZip(gathered.serviceZip);
  const town = gathered.serviceTown?.trim() || null;

  if (zip) {
    const exclude = area.excludeOverrides.map((z) => normalizeZip(z));
    const include = area.includeOverrides.map((z) => normalizeZip(z));
    // An override decides the zip explicitly, so it's "verified" either way.
    if (exclude.includes(zip)) return { inArea: false, status: "resolved", zipUnverified: false };
    if (include.includes(zip)) return { inArea: true, status: "resolved", zipUnverified: false };
  }

  // Resolve the lead to a point: prefer the zip, fall back to the town/city.
  const zipPoint = zip ? geo.zip(zip) : null;
  // A zip was given but we couldn't place it → likely a typo; flag it to confirm.
  const zipUnverified = !!zip && !zipPoint;
  let point: LatLng | null = zipPoint;
  if (!point && town) point = resolveCityPoint(town, area, geo);

  if (!point) {
    // Nothing usable yet. Distinguish "haven't asked" from "gave something we
    // can't place" so Sarah can ask for an address rather than re-ask for a zip.
    if (!zip && !town) return { inArea: null, status: "need_location", zipUnverified };
    return { inArea: null, status: "need_address", zipUnverified };
  }

  return {
    inArea: withinAnyBase(point, area, geo.zip),
    status: "resolved",
    zipUnverified,
  };
}

/**
 * Pick a city's centroid. For a same-named city in multiple states (e.g.
 * "Springfield"), choose the candidate nearest one of the organization's bases —
 * a service business's lead is local, so nearest-to-base is the right disambiguation and
 * needs no extra state field on the organization.
 */
function resolveCityPoint(town: string, area: ServiceArea, geo: Geo): LatLng | null {
  const r = geo.city(town);
  if (r.status === "resolved") return r.point ?? null;
  if (r.status === "ambiguous" && r.states) {
    let best: LatLng | null = null;
    let bestD = Infinity;
    for (const st of r.states) {
      const cr = geo.city(town, st);
      if (cr.status !== "resolved" || !cr.point) continue;
      for (const base of area.baseLocations) {
        const bp = geo.zip(base.zip);
        if (!bp) continue;
        const d = distanceMiles(bp, cr.point);
        if (d < bestD) {
          bestD = d;
          best = cr.point;
        }
      }
    }
    return best;
  }
  return null; // not_found
}

/**
 * AI extracts, CODE decides. Given accumulated gathered info + organization config,
 * returns the full qualification result. Pure and fully unit-testable.
 */
export function qualify(
  gathered: GatheredInfo,
  config: OrganizationConfig,
  geo: Geo = defaultGeo,
): QualificationResult {
  const sa = evaluateServiceArea(gathered, config.serviceArea, geo);
  const inArea = sa.inArea;

  const canonical = normalizeProjectType(gathered.projectType);
  // Reduce the organization's offered services through the SAME normalizer so a friendly label
  // ("Roof repair") lines up with the customer's normalized project ("leak" → roof_repair).
  // In-memory, for this yes/no check only — it never changes what's stored or displayed. Legacy
  // slug values reduce to themselves, so this is backward-compatible.
  const offered = new Set(
    config.projectTypes.map((t) => normalizeProjectType(t)).filter((t): t is string => !!t),
  );
  const projectOffered = canonical == null ? null : offered.has(canonical);

  const requireDM = config.qualificationRules.requireDecisionMaker !== false;
  const isDecisionMaker =
    gathered.isDecisionMaker == null ? null : gathered.isDecisionMaker;

  const missing: MissingField[] = [];
  if (inArea == null) missing.push("location");
  if (projectOffered == null) missing.push("project");
  if (requireDM && isDecisionMaker == null) missing.push("decision_maker");

  const qualified =
    inArea === true &&
    projectOffered === true &&
    (!requireDM || isDecisionMaker === true);

  return {
    inArea,
    projectOffered,
    isDecisionMaker,
    qualified,
    missing,
    locationStatus: sa.status,
    zipUnverified: sa.zipUnverified,
  };
}

/** Definitively out of scope (out of area or wrong project) — gate against booking. */
export function isDisqualified(result: QualificationResult): boolean {
  return result.inArea === false || result.projectOffered === false;
}
