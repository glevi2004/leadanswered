"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Pause, Play, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import type { Campaign, ReviewFeedItem, ReviewRequest } from "@/lib/data/reviews/types";
import { loadLocalCampaigns } from "@/lib/data/reviews/localCampaigns";
import { statusChip } from "@/lib/dashboard-ui";
import { useSarah } from "@/components/sarah/sarah-context";
import { StarRating } from "@/components/app/StarRating";
import { StatCard } from "@/components/app/StatCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
  return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
}

const asked = (c: Campaign) =>
  c.counts.sent + c.counts.replied + c.counts.reviewed + c.counts.opted_out + c.counts.failed;

/** 09-reviews §2 module home: the proof, the machines, the wall. */
export function ReviewsHome({
  campaigns,
  ongoing,
  feed,
}: {
  campaigns: Campaign[];
  ongoing: ReviewRequest[];
  feed: ReviewFeedItem[];
}) {
  const { approvals, openWidget } = useSarah();
  const [local, setLocal] = React.useState<Campaign[]>([]);
  const [paused, setPaused] = React.useState<Record<string, boolean>>({});
  const [ongoingOn, setOngoingOn] = React.useState(true);
  const [feedFilter, setFeedFilter] = React.useState<"all" | "campaign" | "ongoing">("all");

  React.useEffect(() => {
    setLocal(loadLocalCampaigns().map((e) => e.campaign));
  }, []);

  const all = [...local, ...campaigns];
  const running = all.filter((c) => c.status !== "completed");
  const done = all.filter((c) => c.status === "completed");
  const awaiting = approvals.filter((a) => a.kind === "review_ask" && a.status === "pending").length;

  // the results wall — aggregated across everything Sarah has collected
  const ongoingReviews = ongoing.filter((r) => r.status === "reviewed").length;
  const totalNew = all.reduce((n, c) => n + c.results.newReviews, 0) + ongoingReviews;
  const googleStart = Math.min(...all.map((c) => c.results.googleBefore));
  const googleNow = Math.max(...all.map((c) => c.results.googleAfter)) + ongoingReviews;
  const avg = all.find((c) => c.status === "running")?.results.averageRating ?? all[0]?.results.averageRating;

  const togglePause = (c: Campaign) => {
    const isPaused = paused[c.id] ?? c.status === "paused";
    setPaused((p) => ({ ...p, [c.id]: !isPaused }));
    toast.success(!isPaused ? "Paused — nothing sends until you resume." : "Resumed — Sarah picks the queue back up.");
  };

  const statusOf = (c: Campaign) => (paused[c.id] ?? c.status === "paused") ? "paused" : c.status;

  const shownFeed = feed.filter((r) => feedFilter === "all" || r.source === feedFilter);

  return (
    <div className="flex flex-col gap-5">
      {/* toolbar: where the numbers come from + the entry point */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/settings"
          className="flex items-center gap-1.5 text-xs text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400"
        >
          <RefreshCw className="size-3" /> Google Business Profile: Apex Roofing — Newton ✓
        </Link>
        <Button size="sm" className="h-8 gap-1" nativeButton={false} render={<Link href="/reviews/new" />}>
          <Plus className="size-3.5" /> New campaign
        </Button>
      </div>

      {/* the results wall */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="New reviews" value={`+${totalNew}`} hint="everything Sarah has collected" />
        <StatCard label="Average rating" value={avg} hint="across the new reviews" />
        <StatCard label="Google reviews" value={googleNow} hint={`up from ${googleStart} when Sarah started asking`} />
      </div>

      {/* campaigns */}
      <div className="card-lift rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-semibold">Campaigns</h2>
        <div className="mt-1 divide-y divide-border/60">
          {running.map((c) => {
            const st = statusOf(c);
            const a = asked(c);
            return (
              <div key={c.id} className="py-3">
                <Link href={`/reviews/${c.id}`} className="group flex flex-wrap items-center gap-3">
                  <span className="text-sm font-medium group-hover:underline">{c.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip(st).chip}`}>
                    {statusChip(st).label}
                  </span>
                  <span className="ml-auto flex items-center gap-3">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full bg-foreground"
                        style={{ width: `${c.audience.eligible ? Math.round((a / c.audience.eligible) * 100) : 0}%` }}
                      />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {a} of {c.audience.eligible} asked · {c.counts.reviewed} reviews
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground" />
                  </span>
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {st === "running" ? (
                    <span>
                      Next: {c.pacing.perDay} asks tomorrow from {c.pacing.window.start.replace(/^0/, "")}
                      {awaiting > 0 && (
                        <>
                          {" · "}
                          <Link href="/sarah?tab=approvals" className="text-foreground underline underline-offset-2">
                            {awaiting} awaiting your OK
                          </Link>
                        </>
                      )}
                    </span>
                  ) : (
                    <span>Paused — queued targets and reminders are held.</span>
                  )}
                  <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-xs" onClick={() => togglePause(c)}>
                    {st === "running" ? <Pause className="size-3" /> : <Play className="size-3" />}
                    {st === "running" ? "Pause" : "Resume"}
                  </Button>
                </div>
              </div>
            );
          })}
          {done.map((c) => (
            <Link key={c.id} href={`/reviews/${c.id}`} className="group flex flex-wrap items-center gap-3 py-3">
              <span className="text-sm font-medium group-hover:underline">{c.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip("completed").chip}`}>
                {statusChip("completed").label}
              </span>
              <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {c.results.newReviews} reviews from {asked(c)} asks · {c.results.averageRating}★ ·{" "}
                  {c.endedAt ? timeAgo(c.endedAt) : ""}
                </span>
                <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground" />
              </span>
            </Link>
          ))}
          {running.length === 0 && done.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              No campaigns yet — start one and Sarah texts your past customers, a few a day, every ask past you first.
            </p>
          )}
        </div>
      </div>

      {/* the ongoing machine */}
      <div className="card-lift rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">After every job</h2>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip(ongoingOn ? "on" : "off").chip}`}>
            {statusChip(ongoingOn ? "on" : "off").label}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto h-7 text-xs"
            onClick={() => {
              setOngoingOn((v) => !v);
              toast.success(ongoingOn ? "Ongoing asks off." : "Ongoing asks on — every finished job gets a drafted ask.");
            }}
          >
            Turn {ongoingOn ? "off" : "on"}
          </Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          When a job wraps up, Sarah drafts the ask and sends it to you for a yes — nothing goes out on its own.
        </p>
        <div className="mt-3 divide-y divide-border/60 rounded-xl border px-3">
          {ongoing.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="font-medium">{r.contactName}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip(r.status).chip}`}>
                {statusChip(r.status).label}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {r.rating && <StarRating rating={r.rating} />}
                {r.detail}
              </span>
              {r.approvalId && (
                <Button size="sm" variant="outline" className="ml-auto h-6 px-2 text-xs" onClick={() => openWidget()}>
                  Review
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* recent reviews */}
      <div className="card-lift rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Recent reviews</h2>
          <div className="ml-auto flex gap-1">
            {(
              [
                { key: "all", label: "All" },
                { key: "campaign", label: "Campaign" },
                { key: "ongoing", label: "After a job" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFeedFilter(f.key)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                  feedFilter === f.key
                    ? "border-foreground/30 bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 divide-y divide-border/60">
          {shownFeed.map((r) => (
            <div key={r.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2">
                <StarRating rating={r.rating} />
                <span className="text-sm font-medium">{r.reviewer}</span>
                <span className="text-xs text-muted-foreground">{timeAgo(r.at)}</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {r.source === "ongoing" ? "after a job" : r.source}
                </span>
                {r.privateFeedback && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    kept private
                  </span>
                )}
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto flex items-center gap-0.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  >
                    View on Google <ArrowUpRight className="size-3" />
                  </a>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">“{r.excerpt}”</p>
              {r.privateFeedback && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Under 4★, Sarah asks what went wrong instead of sending the Google link — this never posted publicly.
                </p>
              )}
            </div>
          ))}
          {shownFeed.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nothing here yet.</p>}
        </div>
      </div>
    </div>
  );
}
