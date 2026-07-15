/** Analytics-owned types (11-analytics §4). Read-only module — no mutations. */

export type RangePreset = "7d" | "30d" | "90d";

export interface HeadlineStat {
  key: "leads" | "booked" | "win_rate" | "response_time" | "revenue" | "reviews";
  label: string; // "Leads", "Booked", "Win rate", …
  value: string; // pre-formatted: "34" · "64%" · "42s" · "$28,650"
  sub?: string; // "4.9★ average" · "collected"
  delta?: { pct: number; direction: "up" | "down" | "flat"; goodIsUp: boolean };
  target?: { label: string; met: boolean }; // response_time only
}

export interface FunnelStage {
  key: "visits" | "inquiries" | "qualified" | "booked" | "quoted" | "won" | "paid";
  label: string;
  count: number;
  conversionFromPrev?: number; // 0–1; absent on the first stage
  available: boolean; // false → event source not live yet (render dimmed)
}

export interface SourceRow {
  source: "website" | "missed_call" | "sms" | "import";
  label: string;
  leads: number;
  booked?: number;
  conversion?: number; // 0–1
  note?: string; // import: "63 asked · 33 reviews · 4.9★"
}

export interface FunnelSnapshot {
  stages: FunnelStage[];
  sources: SourceRow[];
}

export interface Insight {
  text: string; // Sarah's one-liner — never chart-speak
  sarahContext: string; // compact payload for "Ask Sarah about this"
}

export interface MetricSeries {
  key: "leads" | "bookings" | "reviews" | "revenue";
  label: string;
  unit: "count" | "cents";
  granularity: "day" | "week" | "month";
  points: { t: string; v: number }[]; // t = ISO bucket start, org tz
  insight?: Insight;
}

export interface ResponseTimeStat {
  medianSeconds: number;
  p90Seconds: number;
  targetSeconds: number; // 60 — the promise
  withinTargetPct: number; // 0–1
  buckets: { label: "<30s" | "30–60s" | "1–5m" | ">5m"; count: number }[];
  insight?: Insight;
}
