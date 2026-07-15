import type {
  FunnelSnapshot,
  HeadlineStat,
  Insight,
  MetricSeries,
  RangePreset,
  ResponseTimeStat,
} from "./types";

/**
 * Analytics mock provider (11 §4). Deterministic — series come from fixed
 * patterns (no randomness, SSR-safe), scaled per range. The 30-day window is
 * the canon (funnel 1,284 → 34 → 27 → 19 → 11 → 7 → 5; review canon 20 → 53).
 */

const SCALE: Record<RangePreset, number> = { "7d": 0.25, "30d": 1, "90d": 3 };
const s = (n: number, range: RangePreset) => Math.max(1, Math.round(n * SCALE[range]));

/* ------------------------------- headline ------------------------------- */

export function getHeadlineMock(range: RangePreset): HeadlineStat[] {
  return [
    { key: "leads", label: "Leads", value: String(s(34, range)), delta: { pct: 21, direction: "up", goodIsUp: true } },
    { key: "booked", label: "Booked", value: String(s(19, range)), delta: { pct: 12, direction: "up", goodIsUp: true } },
    { key: "win_rate", label: "Win rate", value: "64%", sub: "of quotes sent", delta: { pct: 5, direction: "up", goodIsUp: true } },
    {
      key: "response_time",
      label: "Response time",
      value: "42s",
      sub: "median",
      target: { label: "under 60 seconds", met: true },
    },
    { key: "revenue", label: "Collected", value: `$${(s(28_650, range)).toLocaleString("en-US")}`, delta: { pct: 34, direction: "up", goodIsUp: true } },
    { key: "reviews", label: "New reviews", value: String(s(21, range)), sub: "4.9★ average" },
  ];
}

/* -------------------------------- funnel -------------------------------- */

export function getFunnelMock(range: RangePreset): FunnelSnapshot {
  const counts = [1_284, 34, 27, 19, 11, 7, 5].map((n) => s(n, range));
  const defs: Array<[FunnelSnapshot["stages"][number]["key"], string]> = [
    ["visits", "Visits"],
    ["inquiries", "Calls + leads"],
    ["qualified", "Qualified"],
    ["booked", "Booked"],
    ["quoted", "Quoted"],
    ["won", "Won"],
    ["paid", "Paid"],
  ];
  return {
    stages: defs.map(([key, label], i) => ({
      key,
      label,
      count: counts[i],
      conversionFromPrev: i === 0 ? undefined : counts[i] / counts[i - 1],
      available: true, // demo: every module is preview, nothing dims
    })),
    sources: [
      { source: "website", label: "Website", leads: s(19, range), booked: s(12, range), conversion: 0.63 },
      { source: "missed_call", label: "Missed call", leads: s(9, range), booked: s(5, range), conversion: 0.56 },
      { source: "sms", label: "Texted in", leads: s(6, range), booked: s(2, range), conversion: 0.33 },
      { source: "import", label: "Imported", leads: 214, note: "63 asked · 33 reviews · 4.9★ (reactivation — outside the funnel)" },
    ],
  };
}

/* ---------------------------- response time ----------------------------- */

export function getResponseTimeMock(range: RangePreset): ResponseTimeStat {
  return {
    medianSeconds: 42,
    p90Seconds: 71,
    targetSeconds: 60,
    withinTargetPct: 0.97,
    buckets: [
      { label: "<30s", count: s(18, range) },
      { label: "30–60s", count: s(12, range) },
      { label: "1–5m", count: s(3, range) },
      { label: ">5m", count: 1 },
    ],
    insight: {
      text: "97% of leads got a text back inside the 60-second promise — median 42 seconds.",
      sarahContext: "response time: median 42s, p90 71s, 97% within the 60s target",
    },
  };
}

/* -------------------------------- series -------------------------------- */

// Fixed daily/weekly shapes (cycled) — deterministic, no randomness.
const LEAD_WAVE = [1, 2, 0, 1, 3, 1, 2, 0, 2, 1, 1, 2, 3, 0, 1];
const BOOK_WAVE = [1, 1, 0, 0, 2, 1, 1, 0, 1, 0, 1, 1, 2, 0, 0];

function bucketPoints(wave: number[], buckets: number, granularity: "day" | "week"): { t: string; v: number }[] {
  const now = new Date();
  const step = granularity === "day" ? 1 : 7;
  return Array.from({ length: buckets }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (buckets - 1 - i) * step);
    const raw = wave[i % wave.length];
    return { t: d.toISOString().slice(0, 10), v: granularity === "week" ? raw * 5 + wave[(i + 3) % wave.length] : raw };
  });
}

function monthPoints(values: number[]): { t: string; v: number }[] {
  const now = new Date();
  return values.map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (values.length - 1 - i), 1);
    return { t: d.toISOString().slice(0, 10), v };
  });
}

export function getSeriesMock(range: RangePreset): MetricSeries[] {
  const daily = range !== "90d";
  const buckets = range === "7d" ? 7 : range === "30d" ? 30 : 13;
  const granularity = daily ? "day" : "week";

  const insights: Record<MetricSeries["key"], Insight> = {
    leads: {
      text: "June was your best month yet — 31 leads, 14 booked. July's tracking ahead of it.",
      sarahContext: "leads trend: June best month (31 leads, 14 booked), July ahead of pace",
    },
    bookings: {
      text: "Thursdays are your busiest estimate day — Sarah routes them shortest-drive.",
      sarahContext: "bookings trend: Thursday is the busiest estimate day",
    },
    reviews: {
      text: "You were at 20 Google reviews when the campaign started. You're at 53.",
      sarahContext: "reviews growth: 20 → 53 since the reactivation campaign, 4.9★ average",
    },
    revenue: {
      text: "June: $23,900 collected — Dana Miller's roof was the biggest job ($14,200).",
      sarahContext: "revenue by month: June $23,900 collected, biggest job Dana Miller $14,200",
    },
  };

  return [
    { key: "leads", label: "Leads over time", unit: "count", granularity, points: bucketPoints(LEAD_WAVE, buckets, granularity), insight: insights.leads },
    { key: "bookings", label: "Bookings over time", unit: "count", granularity, points: bucketPoints(BOOK_WAVE, buckets, granularity), insight: insights.bookings },
    { key: "reviews", label: "Reviews growth", unit: "count", granularity: "month", points: monthPoints([20, 20, 21, 24, 38, 53]), insight: insights.reviews },
    { key: "revenue", label: "Collected by month", unit: "cents", granularity: "month", points: monthPoints([8_400_00, 12_100_00, 9_800_00, 16_300_00, 23_900_00, 28_650_00]), insight: insights.revenue },
  ];
}
