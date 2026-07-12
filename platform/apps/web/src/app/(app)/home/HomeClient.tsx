"use client";

import { CircleCheck, MessageCircleQuestion } from "lucide-react";
import { useSarah } from "@/components/sarah/sarah-context";
import { ApprovalCard } from "@/components/app/ApprovalCard";
import { SarahActionRow } from "@/components/app/SarahActionRow";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import type { OpenEscalation } from "@/lib/data/home";
import { SarahIcon } from "@/components/icons/sarah";

/** "Needs you" — pending approvals (from the shared Sarah state) + open escalations. */
export function NeedsAttention({ escalations }: { escalations: OpenEscalation[] }) {
  const { approvals, openWidget } = useSarah();
  const nothing = approvals.length === 0 && escalations.length === 0;

  if (nothing) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border bg-card px-4 py-3.5 text-sm text-muted-foreground shadow-xs">
        <CircleCheck className="size-4.5 text-primary" />
        Nothing needs you right now — Sarah's on it.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Needs you</p>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {approvals.map((a) => (
          <ApprovalCard key={a.id} approval={a} compact />
        ))}
        {escalations.map((e) => (
          <div key={e.id} className="card-lift rounded-2xl border border-l-2 border-l-amber-400 bg-card p-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{e.contactName} asked</p>
              <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                <MessageCircleQuestion className="mr-1 inline size-3" />
                Question
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">“{e.question}”</p>
            <Button size="sm" variant="outline" className="mt-2.5 h-7 gap-1 px-3" onClick={openWidget}>
              <SarahIcon className="size-3.5 text-primary" /> Answer via Sarah
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "What Sarah's been doing" — the action digest (full log lives on /sarah). */
export function ActivityDigest() {
  const { actions } = useSarah();
  if (actions.length === 0) {
    return (
      <EmptyState
        icon={SarahIcon}
        title="Everything Sarah does will show up here."
        body="She's answering your line right now — bookings, replies, and follow-ups land in this feed."
      />
    );
  }
  return (
    <div className="flex flex-col">
      {actions.slice(0, 7).map((a) => (
        <SarahActionRow key={a.id} action={a} />
      ))}
    </div>
  );
}
