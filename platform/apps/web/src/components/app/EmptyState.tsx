"use client";

import { Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSarah } from "@/components/sarah/sarah-context";
import { Button } from "@/components/ui/button";

/**
 * Empty state in the product voice (00 §4): what Sarah/we will do —
 * never "create your first X".
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  askSarah,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  askSarah?: boolean;
}) {
  const { openWidget } = useSarah();
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      {Icon && <Icon className="size-6 text-muted-foreground" />}
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {askSarah && (
        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={openWidget}>
          <Sparkles className="size-3.5 text-primary" /> Ask Sarah
        </Button>
      )}
    </div>
  );
}
