"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * GlassNav — a floating frosted nav pill (ref: Cofounder top nav over the
 * pixel-art hero). The "Apple" material zone: translucent, blurred, hovering.
 * Active item becomes a small raised solid chip.
 */
export function GlassNav({
  items,
  defaultActive,
  ink = false,
  className,
}: {
  items: string[];
  defaultActive?: string;
  ink?: boolean;
  className?: string;
}) {
  const [active, setActive] = useState(defaultActive ?? items[0]);
  return (
    <nav className={cn(ink ? "glass-ink" : "glass", "inline-flex items-center gap-0.5 rounded-full p-1", className)}>
      {items.map((it) => {
        const on = it === active;
        return (
          <button
            key={it}
            onClick={() => setActive(it)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition active:translate-y-px",
              on
                ? ink
                  ? "bg-white/90 text-neutral-900 shadow-sm"
                  : "bg-card text-foreground shadow-sm"
                : ink
                  ? "text-white/70 hover:text-white"
                  : "text-foreground/65 hover:text-foreground",
            )}
          >
            {it}
          </button>
        );
      })}
    </nav>
  );
}
