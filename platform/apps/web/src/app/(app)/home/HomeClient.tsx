"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck } from "lucide-react";
import { useSarah } from "@/components/sarah/sarah-context";
import { ApprovalRows } from "@/components/app/ApprovalRows";
import { pendingSetupCount, skippedAppKeys } from "@/components/app/setup-steps";
import type { OrgProfile } from "@/lib/data/org-profile";
import { SarahIcon } from "@/components/icons/sarah";
import { SarahActionRow } from "@/components/app/SarahActionRow";
import { EmptyState } from "@/components/app/EmptyState";

/**
 * "Needs you" — the shared Linear-style approval inbox (ApprovalRows) inside
 * a standard dashboard card. For a freshly-onboarded org the remaining setup
 * steps ride in the SAME list, as rows that expand into "Set up with {Lu}".
 */
export function NeedsAttention({ profile }: { profile?: OrgProfile }) {
  const { pendingCount } = useSarah();
  const setupCount = profile ? pendingSetupCount(profile) + skippedAppKeys(profile).length : 0;
  const total = pendingCount + setupCount;

  if (total === 0) {
    return (
      <div className="flex items-center gap-2.5 py-1 text-sm text-muted-foreground">
        <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
        Nothing needs you right now — Sarah's on it.
      </div>
    );
  }

  return (
    <section className="card-lift rounded-2xl border bg-card p-5 shadow-xs">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold">Needs you</h2>
          <span className="text-xs text-muted-foreground/70">{total}</span>
        </div>
        <Link
          href="/sarah?tab=approvals"
          className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Approvals <ArrowRight className="size-3" />
        </Link>
      </div>
      <ApprovalRows setupProfile={profile} />
    </section>
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
