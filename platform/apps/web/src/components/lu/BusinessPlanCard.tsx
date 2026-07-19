"use client";

import * as React from "react";
import { Building2, Check, Pencil, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLu } from "./lu-context";
import type { BusinessPlan } from "@/lib/dock/live";

/**
 * BUSINESS PLAN (Phase 2 boot gate). Once the decisions are in, Lu drafts a `business_plan`
 * doc: how she classified the company (type / industry / who it serves) and its values.
 * This card renders that plan and holds the ACTIVATION gate — "Accept & activate departments"
 * resolves the pending `activate_departments` approval, which boots the company backend-side.
 * The owner can also ask Lu for follow-up changes, which just sends her a revise message.
 * Mirrors PlanApprovalCard's anatomy.
 */
export function BusinessPlanCard({
  plan,
  approvalId,
  busy,
  onActivate,
}: {
  plan: BusinessPlan;
  /** the pending `activate_departments` approval id, or null while it isn't staged yet. */
  approvalId: string | null;
  busy: boolean;
  onActivate: () => void;
}) {
  const { sendMessage } = useLu();
  const [editing, setEditing] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");
  const { classification, values, summary } = plan;

  const rows: Array<{ label: string; value: string }> = [
    { label: "Company Type", value: classification.companyType },
    { label: "Industry", value: classification.industry },
    { label: "User Type", value: classification.userType },
  ].filter((r) => r.value.trim() !== "");

  return (
    <div className="card-lift rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Building2 className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-semibold">Your business plan</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          Plan
        </span>
      </div>

      {summary && <p className="mt-2 text-sm text-foreground">{summary}</p>}

      {rows.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Business Classification
          </p>
          <dl className="overflow-hidden rounded-xl border bg-background">
            {rows.map((r, i) => (
              <div
                key={r.label}
                className={i > 0 ? "flex items-center justify-between gap-3 border-t px-3 py-2" : "flex items-center justify-between gap-3 px-3 py-2"}
              >
                <dt className="shrink-0 text-xs text-muted-foreground">{r.label}</dt>
                <dd className="min-w-0 truncate text-right text-sm font-medium text-foreground">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {values.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Company Values
          </p>
          <ul className="space-y-1">
            {values.map((v, i) => (
              <li key={i} className="flex gap-1.5 text-sm text-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="min-w-0">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing ? (
        <div className="mt-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should Lu change about the plan?"
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-ring"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              className="btn-glow h-7 gap-1 px-3"
              disabled={!feedback.trim()}
              onClick={() => {
                sendMessage(`Please revise the business plan: ${feedback.trim()}`);
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
          <Button
            size="sm"
            className="btn-glow h-7 gap-1 px-3"
            disabled={busy || !approvalId}
            onClick={onActivate}
          >
            <Rocket className="size-3.5" /> {busy ? "Activating…" : "Accept & activate departments"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2.5"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" /> Ask for follow-up changes…
          </Button>
        </div>
      )}
    </div>
  );
}
