"use client";

import * as React from "react";
import {
  Building2,
  CalendarClock,
  Code2,
  Database,
  Home as HomeIcon,
  LifeBuoy,
  Megaphone,
  Palette,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { agentById, type DeptId } from "@/lib/canvas/graph";
import { DepartmentHome } from "./DepartmentHome";
import { DepartmentWorkplace } from "./DepartmentWorkplace";
import { DatabaseConsoleSlot } from "./DatabaseConsoleSlot";
import { cn } from "@/lib/utils";

/**
 * The **department-as-app frame** (canvas.md "The hub — a department is its agent's app"):
 * two depth-cards side by side.
 *   • Left = the **Department card** — a Home ⇄ Database-view toggle. Home lists the
 *     applications the department has shipped; Database renders the Supabase console.
 *   • Right = the **Workplace card** — the live preview of what it's building now, plus the
 *     Publish / Revert / Request-changes controls.
 * v0 provisions **Engineering** only; every other department renders an honest "not set up
 * yet" until it comes online (the frame is identical for each).
 */

const DEPT_ICON: Record<DeptId, React.ComponentType<{ className?: string }>> = {
  sales: TrendingUp,
  operations: CalendarClock,
  finance: Wallet,
  legal: Scale,
  engineering: Code2,
  design: Palette,
  marketing: Megaphone,
  support: LifeBuoy,
};

/** The one department that has a real built app in v0. */
const REAL_DEPT: DeptId = "engineering";

/** A deep floating card — the canvas depth-card language (elev + hairline ring). */
function DepthCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section
      className={cn(
        "flex min-h-[560px] flex-col overflow-hidden rounded-[20px] border border-black/5 bg-card elev-2 dark:border-white/10",
        className,
      )}
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

export function DepartmentApp({ department }: { department: string }) {
  const agent = agentById(department);
  const [view, setView] = React.useState<"home" | "database">("home");

  const Icon = agent ? DEPT_ICON[agent.id] : Building2;
  const label = agent?.label ?? "Department";
  const accent = agent?.accent ?? "96,165,250";

  const tile = (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-xl"
      style={{ backgroundColor: `rgba(${accent},0.14)`, color: `rgb(${accent})` }}
    >
      <Icon className="size-5" />
    </span>
  );

  // Not the real v0 department (or an unknown key) → honest "not set up yet".
  if (department !== REAL_DEPT) {
    return (
      <DepthCard className="min-h-[420px]">
        <div className="flex items-center gap-3 border-b px-5 py-4">
          {tile}
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">{label}</h1>
            <p className="text-sm text-muted-foreground">Department</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="text-sm font-medium text-foreground">
            {agent ? `${label} isn't set up yet` : "Unknown department"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {agent
              ? "v0 provisions the Engineering department first — this one comes online soon, with the same app frame."
              : "This department doesn't exist. Head back to the canvas to pick one."}
          </p>
        </div>
      </DepthCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {/* ── LEFT: the Department card (Home ⇄ Database) ── */}
      <DepthCard>
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
      <DepthCard>
        <header className="flex items-center gap-3 border-b px-5 py-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
            <Code2 className="size-5" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">Workplace</h1>
            <p className="text-sm text-muted-foreground">What {agent?.agentName ?? "the Engineer"} is building now</p>
          </div>
        </header>
        <DepartmentWorkplace dept={department} />
      </DepthCard>
    </div>
  );
}
