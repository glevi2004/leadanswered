"use client";

import * as React from "react";
import { Check, Pencil, X } from "lucide-react";
import type { Approval, ApprovalKind } from "@/lib/data/shared";
import { useSarah } from "@/components/sarah/sarah-context";
import { Button } from "@/components/ui/button";
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
 * One pending hard-gate draft — the same card in the widget, Home, and /sarah
 * (00 §8). Approving is the owner's explicit yes; code sends, never the model.
 */
export function ApprovalCard({ approval, compact }: { approval: Approval; compact?: boolean }) {
  const { approve, decline } = useSarah();
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(approval.preview);

  return (
    <div className="card-lift rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{approval.summary}</p>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
            KIND_META[approval.kind].chip,
          )}
        >
          {KIND_META[approval.kind].label}
        </span>
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

      <div className="mt-2.5 flex items-center gap-2">
        <Button size="sm" className="btn-glow h-7 gap-1 px-3" onClick={() => approve(approval.id, draft)}>
          <Check className="size-3.5" /> Send it
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 px-2.5"
          onClick={() => setEditing((v) => !v)}
        >
          <Pencil className="size-3.5" /> {editing ? "Done" : "Edit"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2.5 text-muted-foreground"
          onClick={() => decline(approval.id)}
        >
          <X className="size-3.5" /> No
        </Button>
      </div>
    </div>
  );
}
