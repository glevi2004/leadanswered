"use client";

import * as React from "react";
import { Check, Pencil, X } from "lucide-react";
import type { Approval, ApprovalKind } from "@/lib/data/shared";
import { useSarah } from "@/components/sarah/sarah-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<ApprovalKind, string> = {
  customer_message: "Message",
  quote: "Quote",
  invoice: "Invoice",
  review_ask: "Review ask",
  post: "Blog post",
  social_post: "Social post",
  site_edit: "Site edit",
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
    <div
      className={cn(
        "card-lift rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs",
        "border-l-2 border-l-primary",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{approval.summary}</p>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {KIND_LABEL[approval.kind]}
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
        <Button size="sm" className="btn-glow h-7 gap-1 px-3" onClick={() => approve(approval.id)}>
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
