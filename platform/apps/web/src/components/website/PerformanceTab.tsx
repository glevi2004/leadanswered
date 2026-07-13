"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import type { SeoSnapshot, Site } from "@/lib/data/website/types";
import { SparklineStat } from "@/components/app/SparklineStat";
import { FAMILY_CHIP } from "@/lib/dashboard-ui";

function daysAgo(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

function Delta({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">▲{delta}</span>;
  if (delta < 0) return <span className="text-xs font-medium text-red-600 dark:text-red-400">▼{Math.abs(delta)}</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

/** 03 §2 Performance tab: visits + site leads, then the Visibility panel. */
export function PerformanceTab({ site, seo }: { site: Site; seo: SeoSnapshot }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SparklineStat label="Visits" value={site.visits30d.toLocaleString()} hint="last 30 days" series={site.visitsSeries} />
        <SparklineStat
          label="Leads from your site"
          value={site.leadsFromSite30d}
          hint={
            <Link href="/crm?source=website" className="underline-offset-2 hover:text-foreground hover:underline">
              last 30 days, and climbing · see them in CRM →
            </Link>
          }
          series={site.leadsSeries}
          seriesLabel="Leads so far"
          cumulative
        />
      </div>

      <div className="card-lift rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Can people find you?</h2>

        <div className="mt-3 divide-y divide-border/60">
          {seo.keywords.map((k) => (
            <div key={k.term} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm">“{k.term}”</span>
              <span className="flex items-center gap-2">
                {k.position === null ? (
                  <span className="text-xs text-muted-foreground">not yet — Sarah's working on it</span>
                ) : (
                  <>
                    <span className="text-sm font-semibold tabular-nums">#{k.position}</span>
                    <Delta delta={k.delta} />
                  </>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">Google Business Profile</span>
            <span className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${seo.gbp.connected ? FAMILY_CHIP.emerald : FAMILY_CHIP.gray}`}>
                {seo.gbp.connected ? "Connected" : "Not connected"}
              </span>
              {seo.gbp.connected && (
                <span className="text-sm text-muted-foreground">
                  {seo.gbp.rating}★ · {seo.gbp.reviewCount} reviews
                </span>
              )}
            </span>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-sm">
              {seo.aiAnswers.sentence}
              {seo.aiAnswers.visible && <Check className="ml-1.5 inline size-3.5 text-emerald-600 dark:text-emerald-400" />}
            </p>
          </div>

          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              How Sarah keeps this working — details
            </summary>
            <ul className="mt-2 space-y-1.5">
              {seo.plumbing.map((p) => (
                <li key={p.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className={`size-3.5 ${p.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                  {p.label}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">Checked {daysAgo(seo.checkedAt)}.</p>
    </div>
  );
}
