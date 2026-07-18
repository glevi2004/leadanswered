"use client";

import * as React from "react";
import { ConnectionsPanel } from "@/components/settings/ConnectionsPanel";
import { cn } from "@/lib/utils";

/**
 * The REAL connect form, in the dock (docs/product.md §7 — surfaces drive real actions):
 * wraps the same ConnectionsPanel Settings uses (token paste → /api/connect/*, live status,
 * disconnect) in a dock-sized card. Rendered wherever connecting is the actual next step —
 * Home's roadmap, the Company stack, and INLINE IN THE CHAT when a plan is waiting on
 * missing connections — so "connect X" is a form right here, never a bounce to another
 * surface or a chat message that answers "go to Settings".
 */
export const ConnectCard = React.forwardRef<
  HTMLDivElement,
  { title?: string; subtitle?: string; className?: string }
>(function ConnectCard({ title = "Connect your accounts", subtitle, className }, ref) {
  return (
    <div ref={ref} className={cn("rounded-xl border bg-card p-4 elev-1", className)}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <ConnectionsPanel className="mt-3" />
    </div>
  );
});
