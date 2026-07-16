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
 * An app department's **two depth-cards, rendered as SEPARATE nodes on the canvas plane**
 * (canvas.md "The hub — a department is its agent's app"). The department itself is a **pill**
 * on the ring (connected to Lu); its app is these two cards **hanging below that pill**, each a
 * large **desktop-window-sized** node connected to the pill by a dashed spoke:
 *   • {@link DeptCardNode}  — the **Department card**: a Home ⇄ Database-view toggle (Home lists
 *     the sites it has shipped; Database renders the Supabase console).
 *   • {@link WorkCardNode}  — the **Workplace card**: the live preview of what it's building now
 *     + the Publish / Revert / Request-changes controls.
 *
 * Both reuse the existing `DepartmentHome` / `DatabaseConsoleSlot` / `DepartmentWorkplace`
 * (unchanged). Each is positioned + sized in WORLD units by `CompanyCanvas` (a plain browser-
 * window proportion — dimensions only, no fake browser chrome), pans/zooms with the plane, and
 * drags by its floating grip tab (the card body stays fully interactive). The wrapper carries
 * `lu-node` so react-zoom-pan-pinch / marquee / tools never act on it. (The world dimensions
 * DESK_CARD_W / DESK_CARD_H that size + box each card node live in `lib/canvas/graph`.)
 */

type GripHandlers = {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
};

/** A deep floating card that fills its node — the canvas depth-card language (elev + ring). */
function DepthCard({
  ringColor,
  children,
}: {
  ringColor?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex h-full w-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-black/5 bg-card elev-2 dark:border-white/10",
      )}
      style={ringColor ? { boxShadow: `0 0 0 2px var(--card), 0 0 0 4px ${ringColor}` } : undefined}
    >
      {children}
    </section>
  );
}

/** The floating grip tab — the ONLY drag handle (card bodies stay fully interactive). */
function GripTab({
  label,
  sub,
  accent,
  gripHandlers,
}: {
  label: string;
  sub: string;
  accent: string;
  gripHandlers: GripHandlers;
}) {
  return (
    <div
      {...gripHandlers}
      className="absolute -top-4 left-5 z-10 flex cursor-grab items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-sm elev-2 active:cursor-grabbing"
      title={`Drag to move · ${label}`}
    >
      <GripVertical className="size-4 shrink-0 opacity-40" />
      <Code2 className="size-4" style={{ color: `rgb(${accent})` }} />
      <span className="font-semibold text-foreground">{label}</span>
      <span className="text-muted-foreground">{sub}</span>
    </div>
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

/** ── The Department card (left) — Home ⇄ Database-view. Its own world-positioned node. ── */
export function DeptCardNode({
  department,
  ringColor = null,
  gripHandlers,
}: {
  department: DeptId;
  /** non-null → draw a highlight ring (selected = blue) */
  ringColor?: string | null;
  gripHandlers: GripHandlers;
}) {
  const agent = agentById(department);
  const [view, setView] = React.useState<"home" | "database">("home");
  const label = agent?.label ?? "Department";
  const accent = agent?.accent ?? "96,165,250";

  return (
    <>
      <GripTab label={label} sub="Department" accent={accent} gripHandlers={gripHandlers} />
      <DepthCard ringColor={ringColor}>
        <header className="flex items-center gap-3 border-b px-5 py-4">
          <span
            className="grid size-9 shrink-0 place-items-center rounded-xl"
            style={{ backgroundColor: `rgba(${accent},0.14)`, color: `rgb(${accent})` }}
          >
            <Code2 className="size-5" />
          </span>
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
    </>
  );
}

/** ── The Workplace card (right) — what the agent is building now. Its own world node. ── */
export function WorkCardNode({
  department,
  ringColor = null,
  gripHandlers,
}: {
  department: DeptId;
  ringColor?: string | null;
  gripHandlers: GripHandlers;
}) {
  const agent = agentById(department);
  const accent = agent?.accent ?? "96,165,250";

  return (
    <>
      <GripTab label="Workplace" sub={agent?.agentName ?? "the Engineer"} accent={accent} gripHandlers={gripHandlers} />
      <DepthCard ringColor={ringColor}>
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
    </>
  );
}
