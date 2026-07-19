"use client";

import * as React from "react";
import { Rocket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePublishApprovals } from "@/lib/dock/live";

/**
 * PUBLISH (ENGINEER-ACTIVATION §C3) — the real publish gate. Polls /api/dock/approvals
 * (the org's pending approvals the Engineer opened with request_publish) and renders each
 * as a Publish / Reject card. Publish → POST /api/dock/approvals/resolve { approved } →
 * apps/api confirmPublish merges the PR, promotes the build to production, and takes the
 * site live. Reject just closes the gate. Renders nothing when there's nothing to publish,
 * so it's inert for demo orgs (their backend has no approvals).
 */

const ACTION_LABEL: Record<string, { title: string; blurb: string }> = {
  publish_site: {
    title: "Publish the site to production",
    blurb: "The Engineer built and previewed the site. Approve to merge and take it live.",
  },
};

export function PublishApprovals({ active }: { active: boolean }) {
  const { approvals, resolve, pending } = usePublishApprovals(active);
  // The plan gate (approve_plan) is rendered inline in the thread by LuBuildTracker; this
  // card owns the publish gates only, so a pending plan doesn't double up here.
  const publishApprovals = approvals.filter((a) => a.action !== "approve_plan");
  if (publishApprovals.length === 0) return null;

  return (
    <div className="mb-3 flex flex-col gap-2">
      {publishApprovals.map((a) => {
        const meta = ACTION_LABEL[a.action] ?? {
          title: a.action.replace(/_/g, " "),
          blurb: "Waiting on your approval to proceed.",
        };
        const busy = pending.has(a.id);
        return (
          <div key={a.id} className="card-lift rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold">{meta.title}</p>
              <span className="shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                Publish
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{meta.blurb}</p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                size="sm"
                className="btn-glow h-7 gap-1 px-3"
                disabled={busy}
                onClick={() => resolve(a.id, "approved")}
              >
                <Rocket className="size-3.5" /> {busy ? "Publishing…" : "Publish"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 gap-1 px-2.5 text-muted-foreground"
                disabled={busy}
                onClick={() => resolve(a.id, "rejected")}
              >
                <X className="size-3.5" /> Reject
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
