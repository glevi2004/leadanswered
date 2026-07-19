"use client";

import * as React from "react";
import type { Approval, ApprovalKind } from "@/lib/data/shared";
import { useLu } from "@/components/lu/lu-context";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Categorical color per approval kind (the one place chrome gets color in the
 * monochrome app — approved palette, 2026-07-11). Chip only, no edge stripes
 * (Levi: seamless); the label always carries the meaning, color is
 * reinforcement. Shared by the approval cards and Home's inbox rows.
 */
export const KIND_META: Record<ApprovalKind, { label: string; chip: string; dot: string }> = {
  customer_message: { label: "Message", chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300", dot: "bg-blue-500" },
  quote: { label: "Quote", chip: "bg-violet-500/10 text-violet-700 dark:text-violet-300", dot: "bg-violet-500" },
  invoice: { label: "Invoice", chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  review_ask: { label: "Review ask", chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  post: { label: "Blog post", chip: "bg-pink-500/10 text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  social_post: { label: "Social post", chip: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  site_edit: { label: "Site edit", chip: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
};

/**
 * Kind chip — a colored dot + label, one hue per approval kind (design board's
 * KindChip, ported into the app on the KIND_META palette above). Shared by the
 * approval cards and the inbox rows so the whole Lu action surface reads as one.
 */
export function KindChip({ kind, className }: { kind: ApprovalKind; className?: string }) {
  const meta = KIND_META[kind];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        meta.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

/**
 * One pending hard-gate draft — the same card in the dock, Home, and /sarah
 * (00 §8). Approving is the owner's explicit yes; code sends, never the model.
 */
export function ApprovalCard({ approval, compact }: { approval: Approval; compact?: boolean }) {
  const { approve, decline } = useLu();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(approval.preview);

  return (
    <div className="neu-card-in rounded-2xl px-3.5 py-3 text-card-foreground">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{approval.summary}</p>
        <KindChip kind={approval.kind} />
      </div>

      {editing ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mt-2 text-sm"
          rows={compact ? 3 : 4}
          autoFocus
        />
      ) : (
        <p className={cn("mt-1.5 text-sm text-muted-foreground", compact && "line-clamp-3")}>
          “{draft}”
        </p>
      )}

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          className="gloss-ink press rounded-full px-3 py-1 text-[12px] font-medium text-white"
          onClick={() => approve(approval.id, draft)}
        >
          Approve
        </button>
        <button
          className="gloss press rounded-full px-3 py-1 text-[12px] font-medium text-foreground"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          className="press rounded-full px-2.5 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => decline(approval.id)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
