"use client";

import { Sparkles } from "lucide-react";
import { useSarah } from "@/components/sarah/sarah-context";
import { Button } from "@/components/ui/button";

/** Standard page header (00 §8): title, optional preview badge, actions, Ask Sarah. */
export function PageHeader({
  title,
  description,
  preview,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  preview?: boolean;
  actions?: React.ReactNode;
}) {
  const { openWidget } = useSarah();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {preview && (
            <span className="rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300">
              Preview
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={openWidget}>
          <Sparkles className="size-3.5 text-primary" /> Ask Sarah
        </Button>
      </div>
    </div>
  );
}
