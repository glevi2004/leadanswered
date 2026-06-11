import type { LatLng } from "./types.js";

/**
 * Minimal offline ZIP-centroid dataset for Phase 1 (demo + tests). A full US
 * ZIP-centroid table or a geocoding API swaps in later behind the same
 * `geocodeZip` interface (SCOPE §5.1) — the qualification logic never changes.
 */
const ZIP_CENTROIDS: Record<string, LatLng & { town: string }> = {
  "75024": { lat: 33.078, lng: -96.747, town: "Plano" },
  "75093": { lat: 33.035, lng: -96.806, town: "Plano" },
  "75070": { lat: 33.197, lng: -96.69, town: "McKinney" },
  "75201": { lat: 32.787, lng: -96.799, town: "Dallas" },
  "76102": { lat: 32.753, lng: -97.332, town: "Fort Worth" },
  "73301": { lat: 30.27, lng: -97.74, town: "Austin" },
  "77002": { lat: 29.758, lng: -95.366, town: "Houston" },
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
