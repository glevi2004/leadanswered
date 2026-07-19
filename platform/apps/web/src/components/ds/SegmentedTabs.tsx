"use client";

import { cn } from "@/lib/utils";

/**
 * SegmentedTabs — THE design-system tab control (demoed on /dev/design as `Segmented`/`Tabs`):
 * a recessed `neu-socket` track holding the items, the active one a raised `gloss` pill and the
 * rest muted text, with `press` physics. `fill` spreads the items across the full width
 * (justify-between) instead of hugging them. One control, used by the board and the product.
 */
export function SegmentedTabs<T extends string>({
  items,
  active,
  onChange,
  labels,
  fill = false,
  className,
}: {
  items: readonly T[];
  active: T;
  onChange: (value: T) => void;
  /** Optional display label per item (defaults to the item, capitalized by CSS). */
  labels?: Partial<Record<T, string>>;
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
      {items.map((it) => (
        <button
          key={it}
          type="button"
          onClick={() => onChange(it)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition active:translate-y-px",
            it === active ? "gloss text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {labels?.[it] ?? it}
        </button>
      ))}
    </div>
  );
}
