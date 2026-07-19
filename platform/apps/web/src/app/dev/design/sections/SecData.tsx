"use client";

import { Frame, Cap, StatusChip, KindChip, GalleryHeading } from "../_ui";
import { StatBlock } from "@/components/ds/StatBlock";
import { PixelMeter } from "@/components/ds/PixelMeter";
import { SparklineStat } from "@/components/app/SparklineStat";
import { DeptIcon } from "@/components/ds/PixelIcon";
import { LibraryFolderCard } from "@/components/ds/LibraryFolderCard";
import { FileThumb } from "@/components/ds/FileThumb";

/** Placeholder preview for the Library thumbs (board demo only). */
const LIB_THUMB =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='64'><rect width='80' height='64' fill='#2b3a55'/><rect x='8' y='8' width='64' height='34' fill='#e9e9ea'/><rect x='8' y='48' width='40' height='6' fill='#6b7bb0'/></svg>",
  );

/* Needs-you row — the Lu-interaction line (ref-78 Tasks). Recessed until it needs you. */
function NeedsRow({ dept, title, tone, label, age }: { dept: "legal" | "engineering" | "marketing"; title: string; tone: "amber" | "violet" | "blue"; label: string; age: string }) {
  return (
    <div className="neu-card-in flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 transition hover-lift">
      <span className="neu-chip grid size-8 shrink-0 place-items-center rounded-lg">
        <DeptIcon dept={dept} size={18} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{title}</span>
      <StatusChip tone={tone}>{label}</StatusChip>
      <span className="w-8 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums">{age}</span>
      <button aria-label="Open" className="gloss press grid size-7 shrink-0 place-items-center rounded-lg text-foreground/70">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3.5 10.5 8 6 12.5" /></svg>
      </button>
    </div>
  );
}

export default function SecData() {
  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="StatCard → StatBlock · SparklineStat (recharts) · DataTable · NeedsYou">App components — data &amp; metrics</GalleryHeading>

      <Frame title="Metrics — StatCard → StatBlock" tag="pixel ramp + mono numeral + delta">
        <div className="grid gap-6 sm:grid-cols-3">
          <StatBlock label="New customers" value="128" delta={12} meterValue={48} />
          <StatBlock label="Quotes sent" value="64" delta={-4} meterValue={38} tone="violet" />
          <StatBlock label="Revenue" value="$18.2k" delta={22} meterValue={72} tone="green" />
        </div>
        <Cap>SparklineStat — the real recharts area trend (reused verbatim from the app)</Cap>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <SparklineStat label="Open rate" value="58%" hint="last 14 days" series={[41, 44, 40, 48, 46, 52, 49, 55, 51, 58, 54, 60, 57, 58]} seriesLabel="Open rate" />
          <SparklineStat label="Replies" value="24" hint="running total" cumulative series={[2, 1, 3, 0, 2, 1, 2, 3, 1, 2, 0, 3, 2, 2]} seriesLabel="Replies" />
          <SparklineStat label="Bookings" value="41" hint="last 14 days" series={[1, 2, 2, 3, 2, 4, 3, 3, 5, 4, 3, 5, 4, 6]} seriesLabel="Bookings" />
        </div>
      </Frame>

      <Frame title="Data table — editorial" tag="tight corners · hairline rows · kind chips · mono numerals">
        <div className="neu-card overflow-hidden rounded-lg bg-card">
          <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.6fr] items-center gap-2 border-b border-border/60 px-4 py-2.5 t-caption">
            <span>Customer</span><span>Kind</span><span>Status</span><span className="text-right">Value</span>
          </div>
          {[
            ["Lucas Anderson", "quote", "blue", "in flight", "$2,400"],
            ["Emily Rodriguez", "invoice", "emerald", "paid", "$1,180"],
            ["Noah Garcia", "message", "amber", "no response", "$0"],
            ["Ava Martinez", "review", "violet", "working", "$960"],
          ].map(([n, k, tone, s, v]) => (
            <div key={n as string} className="grid grid-cols-[1.4fr_1fr_0.8fr_0.6fr] items-center gap-2 border-b border-border/50 px-4 py-2.5 text-[13px] last:border-0 hover:bg-muted/40">
              <span className="font-medium text-foreground">{n as string}</span>
              <span><KindChip kind={k as string} /></span>
              <span><StatusChip tone={tone as "blue" | "emerald" | "amber" | "violet"}>{s as string}</StatusChip></span>
              <span className="text-right font-mono tabular-nums text-foreground">{v as string}</span>
            </div>
          ))}
        </div>
      </Frame>

      <Frame title="Needs you — Lu interaction rows" tag="recessed rows · dept pixel icon · status chip · gloss open (ref-78)">
        <div className="flex flex-col gap-2.5">
          <NeedsRow dept="legal" title="Incorporate with Registered Agent" tone="amber" label="Needs clarification" age="8h" />
          <NeedsRow dept="engineering" title="Build marketing website" tone="violet" label="Requires approval" age="11h" />
          <NeedsRow dept="marketing" title="Define positioning statement" tone="blue" label="In review" age="13h" />
        </div>
        <Cap>meter mini — inline progress in a row</Cap>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground">Onboarding</span>
          <PixelMeter value={35} className="flex-1" segments={40} />
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">35%</span>
        </div>
      </Frame>

      <Frame title="Library — folder card + file thumb" tag="grid view · full-width square card · neu-card p-2.5 · aspect-square 2×2 thumbs · t-title/t-label">
        <Cap>Full-width square folder card (as it sits in the dock) — a 2×2 grid of square previews</Cap>
        <div className="mt-2 max-w-sm space-y-3">
          <LibraryFolderCard
            label="General"
            files={[
              { id: "a", name: "business_context.md", kind: "doc" },
              { id: "b", name: "generated-artifact.png", kind: "image", previewUrl: LIB_THUMB },
            ]}
          />
          <LibraryFolderCard
            label="Engineering"
            files={[
              { id: "c", name: "landing-hero.png", kind: "image", previewUrl: LIB_THUMB },
              { id: "d", name: "landing-cta.png", kind: "image", previewUrl: LIB_THUMB },
              { id: "e", name: "landing-mid.png", kind: "image", previewUrl: LIB_THUMB },
            ]}
          />
        </div>
        <Cap>FileThumb — image vs doc (square)</Cap>
        <div className="mt-3 grid grid-cols-4 gap-2">
          <FileThumb name="hero.png" kind="image" previewUrl={LIB_THUMB} className="aspect-square" />
          <FileThumb name="doc.md" kind="doc" className="aspect-square" />
          <FileThumb name="chart.png" kind="image" previewUrl={LIB_THUMB} className="aspect-square" />
          <FileThumb name="spec.md" kind="doc" className="aspect-square" />
        </div>
      </Frame>
    </div>
  );
}
