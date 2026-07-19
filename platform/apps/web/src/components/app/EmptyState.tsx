"use client";

import { useLu } from "@/components/lu/lu-context";
import { Button } from "@/components/ui/button";
import { LuIcon } from "@/components/icons/lu";

/**
 * Empty state in the product voice (00 §4): what Lu/we will do —
 * never "create your first X".
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  askLu,
  variant = "default",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  askLu?: boolean;
  /** "mono" = a centered terminal-style empty state (IBM Plex Mono via `font-mono`). */
  variant?: "default" | "mono";
}) {
  const { openDock } = useLu();

  // Terminal empty state (dept Inbox / "All caught up") — monospace, centered, quiet.
  if (variant === "mono") {
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed px-6 py-10 text-center font-mono">
        {Icon && <Icon className="size-5 text-muted-foreground" />}
        <p className="text-sm font-medium text-foreground">{title}</p>
        {body && <p className="max-w-xs text-xs text-muted-foreground">{body}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-10 text-center">
      {Icon && <Icon className="size-6 text-muted-foreground" />}
      <p className="text-sm font-medium">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted-foreground">{body}</p>}
      {askLu && (
        <Button variant="outline" size="sm" className="mt-2 gap-1.5" onClick={() => openDock()}>
          <LuIcon className="size-3.5 text-primary" /> Ask Lu
        </Button>
      )}
    </div>
  );
}
