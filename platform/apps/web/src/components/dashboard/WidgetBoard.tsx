"use client";

import "react-grid-layout/css/styles.css";

import { useCallback, useEffect, useRef, useState } from "react";
import GridLayout, { useContainerWidth } from "react-grid-layout";
import type { Layout, LayoutItem } from "react-grid-layout";
import Link from "next/link";
import { ArrowRight, LayoutGrid, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DEFAULT_WIDGETS,
  SURFACES,
  SURFACE_LABEL,
  WIDGETS,
  widgetById,
  type DashItem,
  type WidgetCtx,
  type WidgetDef,
} from "./widget-catalog";

/**
 * Zone B — the customizable widget board on top of react-grid-layout v2. View mode
 * renders every placed widget static; "Customize" flips on drag + resize, a
 * per-widget remove (×), and an "Add widget" picker. The chosen layout (widget ids
 * + geometry) persists to localStorage under `lu_dashboard_widgets_v1`. On narrow
 * widths the board stacks the widgets in a single column instead of using the grid.
 */

const STORAGE_KEY = "lu_dashboard_widgets_v1";
const COLS = 12;
const ROW_HEIGHT = 88;
const MARGIN: [number, number] = [16, 16];
const GRID_MIN_WIDTH = 700; // below this we stack instead of using the grid

const GRID_CSS = `
.dash-grid .react-grid-item.react-grid-placeholder {
  background: rgb(120 120 120 / 0.22) !important;
  border-radius: 0.75rem;
  opacity: 1;
}
.dash-grid .react-resizable-handle::after {
  border-color: rgb(130 130 130 / 0.9);
}
.dash-grid.dash-editing .react-resizable-handle {
  opacity: 1;
}
`;

function sanitize(layout: DashItem[]): DashItem[] {
  return layout.filter((it) => widgetById(it.i));
}

/** Sanitized `layout`, or the default board if nothing usable survives. */
function orDefault(layout: DashItem[]): DashItem[] {
  const clean = sanitize(layout);
  return clean.length > 0 ? clean : sanitize(DEFAULT_WIDGETS);
}

function loadSaved(fallback: DashItem[]): DashItem[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const clean = sanitize(JSON.parse(raw) as DashItem[]);
    return clean.length > 0 ? clean : fallback;
  } catch {
    return fallback;
  }
}

function bottomOf(items: DashItem[]): number {
  return items.reduce((max, it) => Math.max(max, it.y + it.h), 0);
}

export function WidgetBoard({ layout, ctx }: { layout: DashItem[]; ctx: WidgetCtx }) {
  // SSR + first client render use the server default so hydration matches; the
  // saved layout is loaded from localStorage right after mount.
  const [items, setItems] = useState<DashItem[]>(() => orDefault(layout));
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { width, containerRef, mounted } = useContainerWidth();

  useEffect(() => {
    setItems((prev) => loadSaved(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = useCallback((next: DashItem[]) => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage full/unavailable — the board still works, just doesn't persist */
      }
    }, 400);
  }, []);
  useEffect(
    () => () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    },
    [],
  );

  const handleLayoutChange = useCallback(
    (next: Layout) => {
      const mapped: DashItem[] = next.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }));
      setItems(mapped);
      persist(mapped);
    },
    [persist],
  );

  const removeWidget = useCallback(
    (id: string) => {
      setItems((prev) => {
        const next = prev.filter((it) => it.i !== id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addWidget = useCallback(
    (def: WidgetDef) => {
      setItems((prev) => {
        if (prev.some((it) => it.i === def.id)) return prev;
        const next: DashItem[] = [
          ...prev,
          { i: def.id, x: 0, y: bottomOf(prev), w: def.defaultSize.w, h: def.defaultSize.h },
        ];
        persist(next);
        return next;
      });
      setPickerOpen(false);
    },
    [persist],
  );

  const placed = new Set(items.map((it) => it.i));
  const canGrid = mounted && width >= GRID_MIN_WIDTH;

  // The react-grid-layout item list, enriched with per-widget min sizes.
  const rglLayout: LayoutItem[] = items.map((it) => {
    const def = widgetById(it.i);
    return { ...it, minW: def?.minSize?.w, minH: def?.minSize?.h };
  });

  return (
    <section className="flex flex-col gap-3">
      <style>{GRID_CSS}</style>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <LayoutGrid className="size-4" /> Your dashboard
        </h2>
        {canGrid && (
          <div className="flex items-center gap-2">
            {editing && (
              <Button variant="outline" size="sm" className="elev-btn" onClick={() => setPickerOpen(true)}>
                <Plus className="size-3.5" /> Add widget
              </Button>
            )}
            <Button
              variant={editing ? "default" : "outline"}
              size="sm"
              className={editing ? "" : "elev-btn"}
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Done" : "Customize"}
            </Button>
          </div>
        )}
      </div>

      <div ref={containerRef}>
        {canGrid ? (
          <GridLayout
            width={width}
            layout={rglLayout}
            className={`dash-grid ${editing ? "dash-editing" : ""}`}
            gridConfig={{ cols: COLS, rowHeight: ROW_HEIGHT, margin: MARGIN, containerPadding: [0, 0] }}
            dragConfig={{ enabled: editing, cancel: ".rgl-cancel" }}
            resizeConfig={{ enabled: editing }}
            onLayoutChange={handleLayoutChange}
          >
            {items.map((it) => {
              const def = widgetById(it.i);
              if (!def) return null;
              return (
                <div key={it.i}>
                  <WidgetCard def={def} ctx={ctx} editing={editing} onRemove={() => removeWidget(it.i)} />
                </div>
              );
            })}
          </GridLayout>
        ) : (
          // Pre-mount (SSR) + narrow widths: a plain stacked column.
          <div className="flex flex-col gap-4">
            {items.map((it) => {
              const def = widgetById(it.i);
              if (!def) return null;
              return (
                <div key={it.i} className="min-h-[7rem]">
                  <WidgetCard def={def} ctx={ctx} editing={false} onRemove={() => {}} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add a widget</SheetTitle>
            <SheetDescription>Pick a slice of a department to pin to your dashboard.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-5 p-4">
            {SURFACES.map((surface) => {
              const avail = WIDGETS.filter((w) => w.surface === surface && !placed.has(w.id));
              if (avail.length === 0) return null;
              return (
                <div key={surface}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {SURFACE_LABEL[surface]}
                  </p>
                  <div className="grid gap-2">
                    {avail.map((w) => (
                      <div
                        key={w.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => addWidget(w)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            addWidget(w);
                          }
                        }}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border bg-card p-3 text-left transition-colors hover:border-foreground/30 hover:bg-accent/40"
                      >
                        <span className="text-sm font-medium">{w.title}</span>
                        <Plus className="size-4 shrink-0 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {WIDGETS.every((w) => placed.has(w.id)) && (
              <p className="text-sm text-muted-foreground">Every widget is already on your dashboard.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function WidgetCard({
  def,
  ctx,
  editing,
  onRemove,
}: {
  def: WidgetDef;
  ctx: WidgetCtx;
  editing: boolean;
  onRemove: () => void;
}) {
  // Bare widgets render a self-carded component (StatCard / SparklineStat) full
  // bleed; the remove control overlays the tile in edit mode.
  if (def.bare) {
    return (
      <div className={`group/w relative h-full ${editing ? "cursor-move" : ""}`}>
        <div className={`h-full ${editing ? "pointer-events-none select-none" : ""}`}>{def.render(ctx)}</div>
        {editing && (
          <button
            type="button"
            onClick={onRemove}
            className="rgl-cancel absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-md bg-background/80 text-muted-foreground ring-1 ring-foreground/10 backdrop-blur transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Remove ${def.title}`}
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`group/w flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-4 ${
        editing ? "cursor-move ring-1 ring-foreground/30" : "elev-card"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold">{def.title}</h3>
        {editing ? (
          <button
            type="button"
            onClick={onRemove}
            className="rgl-cancel flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`Remove ${def.title}`}
          >
            <X className="size-3.5" />
          </button>
        ) : (
          <Link
            href={def.href}
            className="rgl-cancel flex shrink-0 items-center text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/w:opacity-100"
            aria-label={`Open ${def.title}`}
          >
            <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      <div className={`min-h-0 flex-1 overflow-auto ${editing ? "pointer-events-none select-none" : ""}`}>
        {def.render(ctx)}
      </div>
    </div>
  );
}
