"use client";

import * as React from "react";
import { Check, ListChecks, Pencil, Target, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DockPlan } from "@/lib/dock/live";

/**
 * PLAN GATE — the owner approves Lu's plan BEFORE a build runs. When the owner asks Lu to
 * build something, Lu calls `propose_plan`, which creates the engineering Task (NOT building
 * yet), writes the plan as a `doc` artifact, and stages a pending `approve_plan` approval.
 * LuBuildTracker renders this card FIRST for that tracked task: the objective, the ordered
 * steps, the acceptance criteria, and Approve / Reject. Approve → POST
 * /api/dock/approvals/resolve { approved } → apps/api dispatches the Engineer and the tracker's
 * polling shows the build unfold. Reject cancels it. Mirrors PublishApprovals' card anatomy.
 */

export function PlanApprovalCard({
  plan,
  busy,
  onApprove,
  onReject,
  onRequestChanges,
}: {
  plan: DockPlan | null;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  /** Owner wants the plan revised → Lu re-plans with this feedback (approve / reject / revise loop). */
  onRequestChanges?: (feedback: string) => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  return (
    <div className="card-lift rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <ListChecks className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-semibold">Review the plan before I build</p>
        </div>
        <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
          Plan
        </span>
      </div>

      {plan ? (
        <div className="mt-2.5 space-y-3">
          {plan.objective && (
            <p className="flex items-start gap-1.5 text-sm text-foreground">
              <Target className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0">{plan.objective}</span>
            </p>
          )}

          {plan.steps.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Steps</p>
              <ol className="space-y-1">
                {plan.steps.map((step, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="min-w-0">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {plan.acceptance.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Done when
              </p>
              <ul className="space-y-1">
                {plan.acceptance.map((crit, i) => (
                  <li key={i} className="flex gap-1.5 text-sm text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="min-w-0">{crit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Loading the plan details…</p>
      )}

      {editing ? (
        <div className="mt-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should Lu change about this plan?"
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-ring"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              className="btn-glow h-7 gap-1 px-3"
              disabled={busy || !feedback.trim()}
              onClick={() => {
                onRequestChanges?.(feedback.trim());
                setEditing(false);
                setFeedback("");
              }}
            >
              <Pencil className="size-3.5" /> Send to Lu
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-muted-foreground"
              onClick={() => {
                setEditing(false);
                setFeedback("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" className="btn-glow h-7 gap-1 px-3" disabled={busy} onClick={onApprove}>
            <Check className="size-3.5" /> {busy ? "Starting…" : "Approve & build"}
          </Button>
          {onRequestChanges && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2.5"
              disabled={busy}
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-3.5" /> Request changes
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 px-2.5 text-muted-foreground"
            disabled={busy}
            onClick={onReject}
          >
            <X className="size-3.5" /> Reject
          </Button>
        </div>
      )}
    </div>
  );
}
