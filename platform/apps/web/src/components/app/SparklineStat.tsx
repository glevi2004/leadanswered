"use client";

import * as React from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

/**
 * Stat card with a shaded area trend (03-website §6; shared with 11-analytics).
 * dataviz conventions: single series → no legend (the label names it), 2px line,
 * soft gradient fill, recessive axes, crosshair tooltip; values wear text tokens.
 */
export function SparklineStat({
  label,
  value,
  hint,
  series,
  seriesLabel,
  cumulative,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  series: number[];
  /** Tooltip name for a point, e.g. "Visits". Defaults to `label`. */
  seriesLabel?: string;
  /** Chart the running total instead of daily values (sparse counts → a climb). */
  cumulative?: boolean;
  className?: string;
}) {
  const gradientId = React.useId();
  const config = { value: { label: seriesLabel ?? label, color: "var(--chart-2)" } } satisfies ChartConfig;

  // Points are the last N days ending today; label each with its calendar day.
  const data = React.useMemo(() => {
    let running = 0;
    return series.map((v, i) => {
      running += v;
      const d = new Date();
      d.setDate(d.getDate() - (series.length - 1 - i));
      return { day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: cumulative ? running : v };
    });
  }, [series, cumulative]);

  return (
    <div
      className={cn(
        "card-lift flex h-full flex-col rounded-2xl border bg-card p-5 pb-2 text-card-foreground shadow-xs",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      <ChartContainer config={config} className="mt-3 aspect-auto h-24 w-full">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={cumulative ? [0, "dataMax + 1"] : ["dataMin - 4", "dataMax + 4"]} />
          <ChartTooltip cursor={{ stroke: "var(--border)" }} content={<ChartTooltipContent indicator="line" />} />
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
