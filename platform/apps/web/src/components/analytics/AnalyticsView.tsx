import { getFunnelMock, getHeadlineMock, getResponseTimeMock, getSeriesMock } from "@/lib/data/analytics";
import type { FunnelSnapshot, RangePreset, ResponseTimeStat } from "@/lib/data/analytics/types";
import { StatCard } from "@/components/app/StatCard";
import { InsightLine, RangePicker, TrendChart } from "./AnalyticsClientBits";
import { PageHeader } from "@/components/app/PageHeader";
import { cn } from "@/lib/utils";

/**
 * 11-analytics: the ROI page, read-only, server-composed. Reading order = the
 * pitch: what happened → how work flows → the 60-second promise → trends.
 */

function Delta({ delta }: { delta: NonNullable<ReturnType<typeof getHeadlineMock>[number]["delta"]> }) {
  const good = delta.direction === "up" ? delta.goodIsUp : !delta.goodIsUp;
  return (
    <span
      className={cn(
        "text-xs font-medium",
        delta.direction === "flat" ? "text-muted-foreground" : good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      )}
    >
      {delta.direction === "up" ? "▲" : delta.direction === "down" ? "▼" : "—"} {delta.pct}
      {String(delta.pct).endsWith("pt") ? "" : "%"}
    </span>
  );
}

function FunnelBars({ funnel }: { funnel: FunnelSnapshot }) {
  const max = Math.max(...funnel.stages.map((s) => s.count));
  const width = (count: number) => Math.max(5, (Math.log(count + 1) / Math.log(max + 1)) * 100);
  return (
    <div className="flex flex-col gap-2">
      {funnel.stages.map((stage) => (
        <div key={stage.key} className={cn("flex items-center gap-3", !stage.available && "opacity-50")}>
          <span className="w-28 shrink-0 text-sm text-muted-foreground">{stage.label}</span>
          <div className="min-w-0 flex-1">
            <div className="h-4 rounded bg-foreground/80" style={{ width: `${width(stage.count)}%` }} />
          </div>
          <span className="w-24 shrink-0 text-right text-sm tabular-nums">
            {stage.count.toLocaleString("en-US")}
            {stage.conversionFromPrev !== undefined && (
              <span className="ml-1.5 text-xs text-muted-foreground">({Math.round(stage.conversionFromPrev * 100)}%)</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function SourceTable({ funnel }: { funnel: FunnelSnapshot }) {
  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-b pb-1.5 text-xs font-medium text-muted-foreground">
        <span>Source</span>
        <span className="text-right">Leads</span>
        <span className="text-right">Booked</span>
        <span className="text-right">Conv.</span>
      </div>
      {funnel.sources.map((row) => (
        <div key={row.source} className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-4 border-b border-border/60 py-2 text-sm">
          <span>
            {row.label}
            {row.note && <span className="block text-xs text-muted-foreground">{row.note}</span>}
          </span>
          <span className="text-right tabular-nums">{row.leads}</span>
          <span className="text-right tabular-nums">{row.booked ?? "—"}</span>
          <span className="text-right tabular-nums">{row.conversion !== undefined ? `${Math.round(row.conversion * 100)}%` : "—"}</span>
        </div>
      ))}
    </div>
  );
}

function ResponseTimeStrip({ stat }: { stat: ResponseTimeStat }) {
  const total = stat.buckets.reduce((s, b) => s + b.count, 0);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="text-2xl font-semibold tracking-tight">Median {stat.medianSeconds}s</span>
        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
          ✓ under {stat.targetSeconds} seconds
        </span>
        <span className="text-sm text-muted-foreground">{Math.round(stat.withinTargetPct * 100)}% within target</span>
      </div>
      <div className="mt-3 flex h-5 overflow-hidden rounded-md">
        {stat.buckets.map((b, i) => (
          <div
            key={b.label}
            title={`${b.label}: ${b.count}`}
            className={cn("flex items-center justify-center", i === 0 ? "bg-foreground/85" : i === 1 ? "bg-foreground/55" : i === 2 ? "bg-foreground/30" : "bg-foreground/15")}
            style={{ width: `${Math.max(2, (b.count / total) * 100)}%` }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-4 text-xs text-muted-foreground">
        {stat.buckets.map((b) => (
          <span key={b.label}>
            {b.label} <span className="tabular-nums">{b.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsView({ range }: { range: RangePreset }) {
  const headline = getHeadlineMock(range);
  const funnel = getFunnelMock(range);
  const response = getResponseTimeMock(range);
  const series = getSeriesMock(range);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Analytics"
        description="Every visit, call, and lead in one place — Sarah's report card."
        actions={<RangePicker active={range} />}
      />

      {/* headline stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {headline.map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={stat.value}
            hint={
              <>
                {stat.sub}
                {stat.sub && stat.delta ? " · " : ""}
                {stat.delta && <Delta delta={stat.delta} />}
              </>
            }
            badge={
              stat.target && (
                <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                  ✓ {stat.target.label}
                </span>
              )
            }
          />
        ))}
      </div>

      {/* the funnel + by source */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold">Your funnel</h2>
          <div className="mt-4">
            <FunnelBars funnel={funnel} />
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold">By source</h2>
          <div className="mt-3">
            <SourceTable funnel={funnel} />
          </div>
        </div>
      </div>

      {/* the 60-second promise */}
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Response time — the 60-second promise</h2>
        <div className="mt-3">
          <ResponseTimeStrip stat={response} />
        </div>
        {response.insight && <InsightLine insight={response.insight} entity="response_time" />}
      </div>

      {/* trends */}
      <div className="grid gap-4 md:grid-cols-2">
        {series.map((s) => (
          <div key={s.key} className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold">{s.label}</h2>
            <div className="mt-3">
              <TrendChart series={s} />
            </div>
            {s.insight && <InsightLine insight={s.insight} entity={s.key} />}
          </div>
        ))}
      </div>
    </div>
  );
}
