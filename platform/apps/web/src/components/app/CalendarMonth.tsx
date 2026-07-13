"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The shared events month grid (04 §6 / 07 §2) — Schedule's month-view
 * construction, generalized: Monday-first 42-cell bordered grid, today pill,
 * labeled dot rows, org-timezone dates. One calendar grammar app-wide.
 * Items are clickable; `draggable` items can be dropped on a day (content
 * uses this to reschedule posts).
 */

export interface CalendarMonthItem {
  id: string;
  at: string; // ISO
  label: string;
  dot: string; // bg-* class from a registry (KIND_META dot, statusDot…)
  onClick?: () => void;
  draggable?: boolean;
}

const dateKeyOf = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export function CalendarMonth({
  items,
  timezone,
  onDropItem,
  className,
}: {
  items: CalendarMonthItem[];
  timezone: string;
  /** Called when a draggable item is dropped on a day (dateKey = YYYY-MM-DD). */
  onDropItem?: (id: string, dateKey: string) => void;
  className?: string;
}) {
  const [anchor, setAnchor] = React.useState(() => new Date());
  const [dragOverKey, setDragOverKey] = React.useState<string | null>(null);

  const todayKey = dateKeyOf(new Date(), timezone);
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // back to Monday
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return { key: dateKeyOf(d, timezone), num: d.getDate(), inMonth: d.getMonth() === anchor.getMonth() };
  });

  const byDay = React.useMemo(() => {
    const m = new Map<string, CalendarMonthItem[]>();
    for (const item of items) {
      const k = dateKeyOf(new Date(item.at), timezone);
      m.set(k, [...(m.get(k) ?? []), item]);
    }
    return m;
  }, [items, timezone]);

  const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: timezone, month: "long", year: "numeric" }).format(anchor);
  const shift = (dir: 1 | -1) => setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + dir, 1));

  return (
    <div className={className}>
      {/* toolbar — mirrors the Schedule toolbar's language */}
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-7 px-1.5" aria-label="Previous month" onClick={() => shift(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-1.5" aria-label="Next month" onClick={() => shift(1)}>
          <ChevronRight className="size-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setAnchor(new Date())}>
          Today
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <div className="grid min-w-[760px] grid-cols-7 border-b text-xs font-medium text-muted-foreground">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid min-w-[760px] grid-cols-7">
          {cells.map((c, i) => {
            const dayItems = byDay.get(c.key) ?? [];
            return (
              <div
                key={c.key}
                className={cn(
                  "flex min-h-24 flex-col items-stretch gap-0.5 border-b p-1.5 text-left align-top",
                  i % 7 !== 0 && "border-l",
                  !c.inMonth && "bg-muted/30",
                  dragOverKey === c.key && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                )}
                onDragOver={
                  onDropItem
                    ? (e) => {
                        e.preventDefault();
                        setDragOverKey(c.key);
                      }
                    : undefined
                }
                onDragLeave={onDropItem ? () => setDragOverKey((k) => (k === c.key ? null : k)) : undefined}
                onDrop={
                  onDropItem
                    ? (e) => {
                        e.preventDefault();
                        setDragOverKey(null);
                        const id = e.dataTransfer.getData("text/plain");
                        if (id) onDropItem(id, c.key);
                      }
                    : undefined
                }
              >
                <span
                  className={cn(
                    "mb-0.5 self-start text-xs",
                    c.key === todayKey
                      ? "rounded-full bg-foreground px-1.5 py-0.5 font-semibold text-background"
                      : c.inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/60",
                  )}
                >
                  {c.num}
                </span>
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    draggable={item.draggable && !!onDropItem}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", item.id)}
                    className={cn(
                      "flex items-center gap-1 truncate rounded px-0.5 text-left text-[10px] leading-tight",
                      item.onClick && "hover:bg-muted",
                      item.draggable && onDropItem && "cursor-grab active:cursor-grabbing",
                    )}
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", item.dot)} />
                    <span className="truncate text-muted-foreground">{item.label}</span>
                  </button>
                ))}
                {dayItems.length > 3 && <span className="text-[10px] text-muted-foreground">+{dayItems.length - 3} more</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
