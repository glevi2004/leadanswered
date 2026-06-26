import { readFileSync } from "node:fs";
import type { LatLng } from "./types.js";

/**
 * Offline US geocoding backed by the bundled GeoNames postal-code dataset
 * (CC BY 4.0 — see data/ATTRIBUTION.txt). Bundling it keeps qualification
 * deterministic, fully unit-testable, and free of any network/API key (SCOPE §5.1).
 * The Geocoder/Geo interfaces keep a rooftop provider (e.g. the free US Census
 * geocoder) swappable later without touching the qualification logic.
 */
type LatLngTuple = [number, number];

const ZIP_CENTROIDS = loadJson<Record<string, LatLngTuple>>("./data/zip-centroids.json");
const CITY_CENTROIDS = loadJson<Record<string, Record<string, LatLngTuple>>>(
  "./data/city-centroids.json",
);

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(new URL(rel, import.meta.url), "utf8")) as T;
}

export function normalizeZip(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const m = String(zip).trim().match(/(\d{5})/);
  return m ? m[1] : null;
}

/** A zip → point geocoder. Injectable so the decision logic stays deterministic in tests. */
export type Geocoder = (zip: string) => LatLng | null;

/** Default zip geocoder: offline GeoNames centroid lookup. */
export const geocodeZip: Geocoder = (zip) => {
  const norm = normalizeZip(zip);
  if (!norm) return null;
  const c = ZIP_CENTROIDS[norm];
  return c ? { lat: c[0], lng: c[1] } : null;
};

export interface CityGeocode {
  status: "resolved" | "ambiguous" | "not_found";
  point?: LatLng;
  /** When ambiguous, the state codes the city name maps to (e.g. ["MA","IL"]). */
  states?: string[];
}

/** A city(+state) → point geocoder. State disambiguates same-named cities. */
export type CityGeocoder = (city: string, state?: string | null) => CityGeocode;

/** Default city geocoder: centroid of all of a city's ZIP centroids, per state. */
export const geocodeCity: CityGeocoder = (city, state) => {
  const key = (city ?? "").trim().toLowerCase();
  if (!key) return { status: "not_found" };
  const byState = CITY_CENTROIDS[key];
  if (!byState) return { status: "not_found" };

  if (state) {
    const c = byState[String(state).trim().toUpperCase()];
    return c ? { status: "resolved", point: { lat: c[0], lng: c[1] } } : { status: "not_found" };
  }

  const states = Object.keys(byState);
  if (states.length === 1) {
    const c = byState[states[0]];
    return { status: "resolved", point: { lat: c[0], lng: c[1] } };
  }
  return { status: "ambiguous", states };
};

/** The geocoders the qualification logic depends on (injectable as one unit for tests). */
export interface Geo {
  zip: Geocoder;
  city: CityGeocoder;
}

export const defaultGeo: Geo = { zip: geocodeZip, city: geocodeCity };

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
