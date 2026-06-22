import type { LatLng } from "./types.js";

/**
 * Minimal offline ZIP-centroid dataset for Phase 1 (demo + tests). A full US
 * ZIP-centroid table or a geocoding API swaps in later behind the same
 * `geocodeZip` interface (SCOPE §5.1) — the qualification logic never changes.
 */
const ZIP_CENTROIDS: Record<string, LatLng & { town: string }> = {
  "02458": { lat: 42.351, lng: -71.205, town: "Newton" }, // base
  "02459": { lat: 42.315, lng: -71.192, town: "Newton Center" },
  "02460": { lat: 42.351, lng: -71.207, town: "Newtonville" },
  "02461": { lat: 42.318, lng: -71.206, town: "Newton Highlands" },
  "02465": { lat: 42.35, lng: -71.23, town: "West Newton" },
  "02467": { lat: 42.321, lng: -71.166, town: "Chestnut Hill" },
  "02445": { lat: 42.323, lng: -71.128, town: "Brookline" },
  "02472": { lat: 42.371, lng: -71.183, town: "Watertown" },
  "02492": { lat: 42.28, lng: -71.235, town: "Needham" },
  "02101": { lat: 42.361, lng: -71.057, town: "Boston" }, // inside radius, excluded
  "01601": { lat: 42.262, lng: -71.802, town: "Worcester" }, // outside radius, include-override
  "02601": { lat: 41.653, lng: -70.288, town: "Hyannis" }, // out of area (Cape Cod)
  "01060": { lat: 42.319, lng: -72.631, town: "Northampton" }, // out of area (western MA)
};

export type Geocoder = (zip: string) => LatLng | null;

export function normalizeZip(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const m = String(zip).trim().match(/(\d{5})/);
  return m ? m[1] : null;
}

/** Default geocoder: offline ZIP-centroid lookup. */
export const geocodeZip: Geocoder = (zip) => {
  const norm = normalizeZip(zip);
  if (!norm) return null;
  const c = ZIP_CENTROIDS[norm];
  return c ? { lat: c.lat, lng: c.lng } : null;
};

/** Haversine distance in miles. */
export function distanceMiles(a: LatLng, b: LatLng): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
