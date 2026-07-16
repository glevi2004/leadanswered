"use client";

import * as React from "react";
import {
  Code2,
  Database,
  GripVertical,
  Home as HomeIcon,
} from "lucide-react";
import { agentById, type DeptId } from "@/lib/canvas/graph";
import { DepartmentHome } from "@/components/department/DepartmentHome";
import { DepartmentWorkplace } from "@/components/department/DepartmentWorkplace";
import { DatabaseConsoleSlot } from "@/components/department/DatabaseConsoleSlot";
import { cn } from "@/lib/utils";

/**
 * The **department-as-app rendered INLINE on the canvas plane** (canvas.md "The hub — a
 * department is its agent's app"). A department is NOT a pill that navigates to a separate
 * page — it is **two depth-cards, side by side, living on the plane** as one large node:
 *   • Left  = the **Department card** — a Home ⇄ Database-view toggle (Home lists the sites it
 *     has shipped; Database renders the Supabase console).
 *   • Right = the **Workplace card** — the live preview of what it's building now + the
 *     Publish / Revert / Request-changes controls.
 *
 * This composes the existing `DepartmentHome` / `DatabaseConsoleSlot` / `DepartmentWorkplace`
 * (reused as-is) into an explicit two-column layout so the cards are **always** side by side —
 * unlike `DepartmentApp`'s viewport-driven `xl:grid-cols-2`, a canvas node has a fixed world
 * width, so the split must not depend on the browser viewport.
 *
 * Positioned + sized in WORLD units by `CompanyCanvas`; it pans/zooms with the plane and drags
 * by its floating grip tab (the card bodies stay fully interactive). Carries `lu-node` on the
 * wrapper (in the canvas) so react-zoom-pan-pinch / marquee / tools never act on it.
 */

/** World dimensions of the whole department node (both cards + the gap). Exported so the
 *  canvas can compute its marquee box, drop-target box, and keep site previews clear of it. */
export const DEPT_NODE_W = 1320;
export const DEPT_NODE_H = 720;

/** A deep floating card — the canvas depth-card language (elev + hairline ring). */
function DepthCard({
  className,
  ringColor,
  children,
}: {
  className?: string;
  ringColor?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-black/5 bg-card elev-2 dark:border-white/10",
        className,
      )}
      style={ringColor ? { boxShadow: `0 0 0 2px var(--card), 0 0 0 4px ${ringColor}` } : undefined}
    >
      {children}
    </section>
  );
}

/** A tactile neu-socket segmented toggle (gloss active pill) — the Home ⇄ Database switcher. */
function ViewToggle({
  view,
  onChange,
}: {
  view: "home" | "database";
  onChange: (v: "home" | "database") => void;
}) {
  const items: { key: "home" | "database"; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "database", label: "Database", icon: Database },
  ];
  return (
    <div className="neu-socket inline-flex items-center gap-0.5 rounded-full p-0.5">
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onChange(it.key)}
            aria-pressed={active}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition",
              active ? "gloss text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" /> {it.label}
          </button>
        );
      })}
    </div>
  );
}

export function DepartmentCanvasNode({
  department,
  ringColor = null,
  gripHandlers,
}: {
  department: DeptId;
  /** non-null → draw a highlight ring (selected = blue, connect-target = grant color) */
  ringColor?: string | null;
  /** the canvas node-drag pointer handlers, spread onto the grip tab (drag by the tab only) */
  gripHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
  };
}) {
  const agent = agentById(department);
  const [view, setView] = React.useState<"home" | "database">("home");

  const label = agent?.label ?? "Department";
  const accent = agent?.accent ?? "96,165,250";

  const tile = (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-xl"
      style={{ backgroundColor: `rgba(${accent},0.14)`, color: `rgb(${accent})` }}
    >
      <Code2 className="size-5" />
    </span>
  );

  return (
    <>
      {/* floating grip tab (the ONLY drag handle — card bodies stay fully interactive) */}
      <div
        {...gripHandlers}
        className="absolute -top-4 left-5 z-10 flex cursor-grab items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm elev-2 active:cursor-grabbing"
        title={`Drag to move · click to focus ${label}`}
      >
        <GripVertical className="size-4 shrink-0 opacity-40" />
        <Code2 className="size-4" style={{ color: `rgb(${accent})` }} />
        <span className="font-semibold text-foreground">{label}</span>
        <span className="text-muted-foreground">Department</span>
      </div>

      {/* the two depth-cards, side by side — always (explicit two-column flex) */}
      <div className="flex h-full w-full items-stretch gap-5">
        {/* ── LEFT: the Department card (Home ⇄ Database) ── */}
        <DepthCard className="min-w-0 flex-1" ringColor={ringColor}>
          <header className="flex items-center gap-3 border-b px-5 py-4">
            {tile}
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">{label}</h1>
              <p className="text-sm text-muted-foreground">
                {view === "home" ? "Applications it has shipped" : "The backend it runs on"}
              </p>
            </div>
            <div className="ml-auto shrink-0">
              <ViewToggle view={view} onChange={setView} />
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto py-2">
            {view === "home" ? <DepartmentHome dept={department} /> : <DatabaseConsoleSlot />}
          </div>
        </DepthCard>

        {/* ── RIGHT: the Workplace card ── */}
        <DepthCard className="min-w-0 flex-1" ringColor={ringColor}>
          <header className="flex items-center gap-3 border-b px-5 py-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
              <Code2 className="size-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight">Workplace</h1>
              <p className="text-sm text-muted-foreground">
                What {agent?.agentName ?? "the Engineer"} is building now
              </p>
            </div>
          </header>
          <DepartmentWorkplace dept={department} />
        </DepthCard>
      </div>
    </>
  );
}
