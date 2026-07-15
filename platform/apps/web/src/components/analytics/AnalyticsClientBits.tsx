"use client";

import * as React from "react";
import Link from "next/link";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import type { Insight, MetricSeries, RangePreset } from "@/lib/data/analytics/types";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useSarah } from "@/components/sarah/sarah-context";
import { SarahIcon } from "@/components/icons/sarah";
import { cn } from "@/lib/utils";

/** The client leaves of the read-only Analytics page (11 §6). */

/* ------------------------------ range picker ------------------------------ */

const PRESETS: Array<{ key: RangePreset; label: string }> = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

export function RangePicker({ active }: { active: RangePreset }) {
  return (
    <div className="flex items-center rounded-lg border p-0.5">
      {PRESETS.map((p) => (
        <Link
          key={p.key}
          href={`/analytics?range=${p.key}`}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs",
            active === p.key ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------ insight line ------------------------------ */

export function InsightLine({ insight, entity }: { insight: Insight; entity: string }) {
  const { openWidget } = useSarah();
  return (
    <p className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
      <SarahIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
      <span>
        {insight.text}{" "}
        <button
          type="button"
          onClick={() => openWidget({ entity })}
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Ask Sarah about this →
        </button>
      </span>
    </p>
  );
}

/* ------------------------------- trend chart ------------------------------ */

/** Single series → no legend (the title names it); 2px line, soft area fill,
 *  recessive axes, crosshair tooltip — dataviz conventions. */
export function TrendChart({ series }: { series: MetricSeries }) {
  const gradientId = React.useId();
  const config = { v: { label: series.label, color: "var(--chart-2)" } } satisfies ChartConfig;

  const fmtBucket = (t: string) => {
    const d = new Date(`${t}T12:00:00`);
    return series.granularity === "month"
      ? d.toLocaleDateString("en-US", { month: "short" })
      : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const data = series.points.map((p) => ({
    t: fmtBucket(p.t),
    v: series.unit === "cents" ? Math.round(p.v / 100) : p.v,
  }));
  const tickCount = Math.min(4, data.length);
  const tickIdx = new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (data.length - 1)) / Math.max(1, tickCount - 1))));

  return (
    <ChartContainer config={config} className="aspect-auto h-40 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 16 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={{ fontSize: 10 }}
          tickFormatter={(value: string, index: number) => (tickIdx.has(index) ? value : "")}
        />
        <YAxis hide domain={[0, "dataMax + 2"]} />
        <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent indicator="line" />} />
        <Area dataKey="v" type="monotone" stroke="var(--chart-2)" strokeWidth={2} fill={`url(#${gradientId})`} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}
