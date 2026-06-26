// Build the bundled offline geocoding dataset from the GeoNames US postal-code dump.
//
// Source: http://download.geonames.org/export/zip/US.zip  (license: CC BY 4.0 — see src/data/ATTRIBUTION.txt)
// Tab-delimited US.txt columns (0-indexed):
//   0 country  1 postalCode  2 placeName  3 admin1Name  4 admin1Code(ST)
//   5 admin2Name 6 admin2Code 7 admin3Name 8 admin3Code  9 lat  10 lng  11 accuracy
//
// Emits two compact JSON maps into src/data/:
//   zip-centroids.json   { "02134": [lat, lng], ... }
//   city-centroids.json  { "newton": { "MA": [lat, lng] }, ... }   (city = lowercased place name)
//
// Regenerate:  node scripts/build-geo.mjs path/to/US.txt
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const inPath = process.argv[2] ?? resolve(here, "US.txt");
const dataDir = resolve(here, "../src/data");

const round = (n) => Math.round(Number(n) * 1e4) / 1e4; // ~11m precision, keeps the files small

const zip = {}; // postalCode -> [lat, lng]
const cityAcc = {}; // city -> ST -> { lat, lng, n }  (accumulator for averaging)

const lines = readFileSync(inPath, "utf8").split("\n");
for (const line of lines) {
  if (!line) continue;
  const c = line.split("\t");
  const postal = c[1];
  const place = (c[2] ?? "").trim().toLowerCase();
  const st = (c[4] ?? "").trim().toUpperCase();
  const lat = Number(c[9]);
  const lng = Number(c[10]);
  if (!postal || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

  zip[postal] = [round(lat), round(lng)];

  if (place && st) {
    const byState = (cityAcc[place] ??= {});
    const a = (byState[st] ??= { lat: 0, lng: 0, n: 0 });
    a.lat += lat;
    a.lng += lng;
    a.n += 1;
  }
}

// Average each city's ZIP centroids into a single representative point per state.
const city = {};
for (const [place, byState] of Object.entries(cityAcc)) {
  city[place] = {};
  for (const [st, a] of Object.entries(byState)) {
    city[place][st] = [round(a.lat / a.n), round(a.lng / a.n)];
  }
}

writeFileSync(resolve(dataDir, "zip-centroids.json"), JSON.stringify(zip));
writeFileSync(resolve(dataDir, "city-centroids.json"), JSON.stringify(city));

const fmt = (p) => (readFileSync(p).length / 1024 / 1024).toFixed(2) + " MB";
console.log(`zips:   ${Object.keys(zip).length}  -> zip-centroids.json (${fmt(resolve(dataDir, "zip-centroids.json"))})`);
console.log(`cities: ${Object.keys(city).length}  -> city-centroids.json (${fmt(resolve(dataDir, "city-centroids.json"))})`);
