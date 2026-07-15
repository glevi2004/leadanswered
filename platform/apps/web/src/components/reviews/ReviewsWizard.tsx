"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { Campaign } from "@/lib/data/reviews/types";
import { saveLocalCampaign } from "@/lib/data/reviews/localCampaigns";
import { APEX_AUDIENCE_NAMES, APEX_CAMPAIGN } from "@/lib/data/fixtures/apex";
import { AskPreview } from "./AskPreview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Campaign setup (09-reviews §2): 4 steps, everything pre-filled — the owner
 * confirms, not builds. Launch CREATES the campaign (localStorage seam) and
 * lands on its detail page with the queue visible.
 */

const STEPS = ["Audience", "The ask", "Pacing", "Launch"] as const;

const monthName = () => new Intl.DateTimeFormat("en-US", { month: "long" }).format(new Date());

export function ReviewsWizard() {
  const router = useRouter();
  const [step, setStep] = React.useState(0);
  const [template, setTemplate] = React.useState(APEX_CAMPAIGN.ask.template);
  const [link, setLink] = React.useState(APEX_CAMPAIGN.ask.reviewLinkUrl);
  const [perDay, setPerDay] = React.useState(15);
  const [name, setName] = React.useState(`Past-customer wave — ${monthName()}`);
  const [showList, setShowList] = React.useState(false);
  const [removed, setRemoved] = React.useState<Set<number>>(new Set());
  const a = APEX_CAMPAIGN.audience;

  const eligible = a.eligible - removed.size;
  const names = APEX_AUDIENCE_NAMES;

  const toggleRemoved = (i: number) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const launch = () => {
    const now = new Date().toISOString();
    const campaign: Campaign = {
      id: `camp_local_${Date.now()}`,
      kind: "reactivation",
      name: name.trim() || `Past-customer wave — ${monthName()}`,
      status: "running",
      ask: { ...APEX_CAMPAIGN.ask, template, reviewLinkUrl: link },
      pacing: { perDay, window: APEX_CAMPAIGN.pacing.window },
      audience: { imported: a.imported, eligible, excluded: a.excluded },
      counts: { queued: eligible, sent: 0, replied: 0, reviewed: 0, opted_out: 0, failed: 0 },
      results: {
        newReviews: 0,
        averageRating: 0,
        googleBefore: APEX_CAMPAIGN.results.googleAfter,
        googleAfter: APEX_CAMPAIGN.results.googleAfter,
      },
      startedAt: now,
      createdAt: now,
    };
    saveLocalCampaign({ campaign, queuedNames: names.filter((_, i) => !removed.has(i)) });
    toast.success("The wave is on — Sarah's drafting the first asks.", {
      description: "Each one lands in your approvals before it sends.",
    });
    router.push(`/reviews/${campaign.id}`);
  };

  // No history yet → the wizard can't build an audience; hand off to import.
  if (a.imported === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <Link href="/reviews" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Reviews
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Your review campaign</h1>
        </div>
        <div className="flex flex-col items-start gap-3 rounded-2xl border bg-card p-6">
          <p className="text-sm font-semibold">First, your customer history.</p>
          <p className="text-sm text-muted-foreground">
            Sarah builds the campaign from your past customers — import them once and she reads the history, removes
            anyone she shouldn't text, and sets the whole thing up for you.
          </p>
          <Button size="sm" nativeButton={false} render={<Link href="/customers" />}>Import your customers</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <Link href="/reviews" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Reviews
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Your review campaign</h1>
        <p className="mt-1 text-sm text-muted-foreground">We set it up — walk through it and launch.</p>
      </div>

      <ol className="flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold",
                i < step ? "border-foreground bg-foreground text-background" : i === step ? "border-foreground" : "text-muted-foreground",
              )}
            >
              {i < step ? <Check className="size-3" /> : i + 1}
            </span>
            <span className={cn(i === step ? "font-medium" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm font-semibold">Your {a.imported} imported customers</p>
            <p className="mt-1 text-sm text-muted-foreground">We already removed the ones we shouldn't text:</p>
            <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
              <li>already reviewed · {a.excluded.alreadyReviewed}</li>
              <li>opted out · {a.excluded.optedOut}</li>
              <li>open lead · {a.excluded.openLead}</li>
              <li>bad number · {a.excluded.badPhone}</li>
            </ul>
            <p className="mt-3 text-sm font-medium">
              {eligible} will be asked{removed.size > 0 && <span className="text-muted-foreground"> · {removed.size} removed by you</span>}
            </p>
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {showList ? "Hide the list" : "See the list"}
            </button>
            {showList && (
              <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border">
                <ul className="divide-y divide-border/60 text-sm">
                  {names.map((n, i) => (
                    <li key={i} className={cn("flex items-center justify-between px-3 py-1.5", removed.has(i) && "opacity-50")}>
                      <span className={cn(removed.has(i) && "line-through")}>{n}</span>
                      <button
                        type="button"
                        onClick={() => toggleRemoved(i)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        aria-label={removed.has(i) ? `Put ${n} back` : `Remove ${n}`}
                      >
                        {removed.has(i) ? "Put back" : <X className="size-3.5" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button className="btn-glow gap-1.5" onClick={() => setStep(1)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div className="grid items-start gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-muted-foreground">The message (personalized per customer)</label>
              <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={7} className="text-sm" />
              <label className="text-xs font-medium text-muted-foreground">Google review link</label>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
              />
              <p className="text-xs text-muted-foreground">Your photo rides along as an MMS — a familiar face beats a form letter.</p>
            </div>
            <AskPreview template={template} link={link} />
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button className="btn-glow gap-1.5" onClick={() => setStep(2)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <label className="text-sm font-semibold">Asks per day</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={40}
                value={perDay}
                onChange={(e) => setPerDay(Number(e.target.value))}
                className="h-9 w-24 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
              />
              <span className="text-sm text-muted-foreground">inside your business hours (Mon–Sat 9–7, your timezone)</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Never a blast · STOP is handled automatically, forever · one ask + one reminder (3 days later), then we
              leave them alone.
            </p>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button className="btn-glow gap-1.5" onClick={() => setStep(3)}>
              Continue <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center">
          <div className="flex w-full max-w-sm flex-col gap-1.5 text-left">
            <label className="text-xs font-medium text-muted-foreground">Campaign name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
            />
          </div>
          <p className="text-lg font-semibold">Ready: ask {eligible} past customers, {perDay} a day.</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Sarah drafts every ask; the first ones land in your approvals for a yes before anything sends. Most owners
            see the first new reviews within days.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button className="btn-glow gap-1.5" onClick={launch}>
              Start the wave <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
