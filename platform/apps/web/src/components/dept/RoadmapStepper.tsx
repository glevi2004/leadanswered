import { Check, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RoadmapStep } from "@/lib/canvas/dept-roadmap";

/**
 * The horizontal "Department Roadmap" stepper (Cofounder-style): connected milestone
 * cards joined by dashed connectors. The active step is ring-highlighted with a
 * partial-progress ring + a "Review" action; later steps are locked and muted. Scrolls
 * horizontally when it overflows. Presentational + fully token-styled (both themes).
 */
export function RoadmapStepper({ steps }: { steps: RoadmapStep[] }) {
  return (
    <div className="-mx-1 flex items-stretch overflow-x-auto px-1 pb-1">
      {steps.map((step, i) => (
        <div key={step.title} className="flex shrink-0 items-stretch">
          <StepCard step={step} index={i} />
          {i < steps.length - 1 && <Connector locked={steps[i + 1].state !== "done"} />}
        </div>
      ))}
    </div>
  );
}

function StepCard({ step, index }: { step: RoadmapStep; index: number }) {
  const active = step.state === "in_progress";
  const locked = step.state === "locked";
  const done = step.state === "done";
  return (
    <div
      className={cn(
        "elev-1 flex w-[13rem] shrink-0 flex-col rounded-xl border bg-card p-3.5 transition-shadow",
        active && "ring-2 ring-foreground/25",
        locked && "opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Step {index + 1}
        </span>
        <span className={cn("grid size-5 place-items-center", locked ? "text-muted-foreground" : "text-foreground")}>
          {done ? <Check className="size-4" /> : active ? <ProgressRing /> : <Lock className="size-3.5" />}
        </span>
      </div>

      <p className="mt-2 text-sm font-medium leading-snug text-foreground">{step.title}</p>
      <p className={cn("mt-1 text-xs", active ? "text-foreground/70" : "text-muted-foreground")}>
        {done ? "Done" : active ? "In progress" : (step.note ?? "Needs earlier steps first")}
      </p>

      {active && (
        <Button size="sm" className="mt-3 w-full justify-center">
          Review <ChevronRight className="size-3.5" />
        </Button>
      )}
    </div>
  );
}

/** A dashed connector between two step cards, with a small lock/dot node on it. */
function Connector({ locked }: { locked: boolean }) {
  return (
    <div className="relative flex w-8 shrink-0 items-center self-center sm:w-12">
      <div className="h-0 w-full border-t border-dashed border-foreground/20" />
      <span className="absolute left-1/2 top-1/2 grid size-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-foreground/15 bg-background">
        {locked ? (
          <Lock className="size-2.5 text-muted-foreground" />
        ) : (
          <span className="size-1.5 rounded-full bg-muted-foreground" />
        )}
      </span>
    </div>
  );
}

/** A ~40%-filled progress ring drawn in the current text color (token-safe). */
function ProgressRing({ className }: { className?: string }) {
  const r = 8;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" className="stroke-current opacity-25" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="stroke-current"
        strokeDasharray={`${c * 0.4} ${c}`}
        transform="rotate(-90 12 12)"
      />
    </svg>
  );
}
