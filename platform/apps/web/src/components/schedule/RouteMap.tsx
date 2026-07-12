"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";

/**
 * The day-route map (07-schedule §8 Q4, resolved: Leaflet + OSM v1 — zero
 * keys). Numbered pins in route order + base marker; DASHED straight
 * connectors on purpose — real road polylines arrive with travel routing.
 * Rendered client-only (dynamic import, ssr:false).
 */

export interface MapStop {
  id: string;
  lat: number;
  lng: number;
  label: string; // "1", "2", … or "⌂"
  title: string;
}

const pin = (label: string, base: boolean) =>
  divIcon({
    className: "", // no default leaflet styles
    html: `<div style="
      width:24px;height:24px;border-radius:9999px;
      display:flex;align-items:center;justify-content:center;
      font:600 11px/1 -apple-system,system-ui,sans-serif;
      background:${base ? "#fff" : "#1c1d22"};color:${base ? "#1c1d22" : "#fff"};
      border:2px solid ${base ? "#1c1d22" : "#fff"};
      box-shadow:0 1px 4px rgba(16,24,40,.4);
    ">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export default function RouteMap({ stops }: { stops: MapStop[] }) {
  if (stops.length === 0) return null;
  const bounds = stops.map((s) => [s.lat, s.lng] as [number, number]);
  const line = stops.map((s) => [s.lat, s.lng] as [number, number]);
  // close the loop back to base when the first stop is the base
  if (stops[0]?.label === "⌂" && stops.length > 2) line.push([stops[0].lat, stops[0].lng]);

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [24, 24] }}
      scrollWheelZoom={false}
      attributionControl={false}
      className="z-0 h-44 w-full rounded-lg"
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Polyline positions={line} pathOptions={{ color: "#1c1d22", weight: 2, dashArray: "6 6", opacity: 0.7 }} />
      {stops.map((s) => (
        <Marker key={s.id} position={[s.lat, s.lng]} icon={pin(s.label, s.label === "⌂")} title={s.title} />
      ))}
    </MapContainer>
  );
}
