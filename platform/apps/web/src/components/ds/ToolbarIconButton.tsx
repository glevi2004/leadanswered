"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The toolbar icon button — the exact button the canvas toolbar uses, shared so the collapsed
 * Lu rail is literally the same control. `ink` sits on a `gloss-ink` (dark) pill; `surface` sits
 * on a `gloss` (theme-light) pill — the same button, colors flipped. Active = the inverted fill.
 */
export function ToolbarIconButton({
  active = false,
  variant = "ink",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  variant?: "ink" | "surface";
}) {
  return (
    <button
      type="button"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-lg transition-all duration-150",
        variant === "ink"
          ? active
            ? "bg-primary-foreground text-primary"
            : "text-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          : active
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
