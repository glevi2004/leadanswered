import { cn } from "@/lib/utils";

/**
 * TaskCard — a roadmap / quest card (ref: Cofounder "Pick a Company Name /
 * Setup Codebase / Incorporate LLC" stage cards). A raised pillow card with a
 * pixel/line icon tile, title + owner subtitle, and a glossy → advance button.
 *
 * kind — who owns the step, drives the subtitle + a faint accent.
 * state — todo (default), active (ring + brighter), locked (dimmed + 🔒), done (✓).
 */
export type TaskKind = "user" | "agent" | "approval";
export type TaskState = "todo" | "active" | "locked" | "done";

const KIND_LABEL: Record<TaskKind, string> = {
  user: "User task",
  agent: "Agent task",
  approval: "Agent requires approval",
};
const KIND_DOT: Record<TaskKind, string> = {
  user: "bg-sky-500",
  agent: "bg-violet-500",
  approval: "bg-orange-500",
};

export function TaskCard({
  title,
  kind = "agent",
  state = "todo",
  icon,
  className,
}: {
  title: string;
  kind?: TaskKind;
  state?: TaskState;
  icon?: React.ReactNode;
  className?: string;
}) {
  const locked = state === "locked";
  const done = state === "done";
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl bg-card p-2.5 pr-2.5 transition",
        // depth duality: active pops out (raised), done stays raised, pending/locked
        // are recessed (pressed into the well) until they become active.
        state === "active" ? "neu-card-active" : done ? "neu-card" : "neu-card-in",
        locked && "opacity-55",
        !locked && state !== "active" && "hover:-translate-y-0.5 hover:shadow-[var(--elev-2)]",
        className,
      )}
    >
      <div
        className={cn(
          "neu-chip grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground",
          done && "!bg-emerald-500/15",
        )}
      >
        {done ? (
          <svg viewBox="0 0 16 16" className="size-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
        ) : locked ? (
          <svg viewBox="0 0 16 16" className="size-4 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="4" y="7" width="8" height="6" rx="1" /><path d="M6 7V5.5a2 2 0 0 1 4 0V7" />
          </svg>
        ) : (
          icon ?? <span className={cn("size-2 rounded-full", KIND_DOT[kind])} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold leading-tight text-foreground">{title}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={cn("size-1.5 rounded-full", KIND_DOT[kind])} />
          {KIND_LABEL[kind]}
        </div>
      </div>

      <button
        aria-label="Open step"
        disabled={locked}
        className="gloss grid size-7 shrink-0 place-items-center rounded-lg text-foreground/70 disabled:opacity-40"
      >
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
      </button>
    </div>
  );
}

/**
 * TaskStage — a labeled column of TaskCards (the Cofounder kanban "Idea stage 1/1").
 */
export function TaskStage({
  label,
  count,
  children,
  className,
}: {
  label: string;
  count?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("w-64 shrink-0", className)}>
      <div className="mb-2 flex items-center justify-between">
        <span className="gloss rounded-full px-2.5 py-1 font-mono text-[11px] font-medium text-muted-foreground">{label}</span>
        {count && <span className="font-mono text-[11px] text-muted-foreground">{count}</span>}
      </div>
      <div className="flex flex-col gap-3 p-1">{children}</div>
    </div>
  );
}
