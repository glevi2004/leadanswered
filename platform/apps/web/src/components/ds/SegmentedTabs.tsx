"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SegmentedTabs — THE design-system tab/mode switcher (demoed on /dev/design as `Segmented`/
 * `Tabs`): a recessed `neu-socket` track, the active item a raised `gloss` pill, the rest muted,
 * with `press` physics. Text by default; pass `icons` for an icon switcher (e.g. grid/list).
 * `fill` spreads items edge-to-edge. One control — used by the board and the product.
 */
export function SegmentedTabs<T extends string>({
  items,
  active,
  onChange,
  labels,
  icons,
  fill = false,
  className,
}: {
  items: readonly T[];
  active: T;
  onChange: (value: T) => void;
  /** Optional display label per item (defaults to the item, capitalized by CSS). */
  labels?: Partial<Record<T, string>>;
  /** Optional icon per item — when present the item renders icon-only (tighter padding). */
  icons?: Partial<Record<T, React.ReactNode>>;
  /** Spread the items edge-to-edge (justify-between) rather than hugging their content. */
  fill?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "neu-socket inline-flex items-center gap-1 rounded-xl p-1",
        fill && "flex w-full justify-between",
        className,
      )}
    >
      {items.map((it) => {
        const icon = icons?.[it];
        return (
          <button
            key={it}
            type="button"
            aria-label={icon ? labels?.[it] ?? it : undefined}
            onClick={() => onChange(it)}
            className={cn(
              "grid place-items-center rounded-lg py-1.5 text-[13px] font-medium capitalize transition active:translate-y-px",
              icon ? "px-2" : "px-3",
              it === active ? "gloss text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {icon ?? labels?.[it] ?? it}
          </button>
        );
      })}
    </div>
  );
}
