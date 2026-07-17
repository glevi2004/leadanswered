import { cn } from "@/lib/utils";

/**
 * GamePill — the floating "Task Completed · SEO Optimization" status pill
 * (ref: Cofounder hero). A frosted glass pill with a status dot + label + value.
 * Lives ABOVE the scene (glass zone), reads like an in-game toast/achievement.
 */
const TONE: Record<string, { dot: string; text: string }> = {
  done: { dot: "bg-emerald-400", text: "text-emerald-50" },
  running: { dot: "bg-sky-400", text: "text-sky-50" },
  waiting: { dot: "bg-amber-400", text: "text-amber-50" },
};

export function GamePill({
  label,
  value,
  tone = "done",
  className,
}: {
  label: string;
  value: string;
  tone?: keyof typeof TONE;
  className?: string;
}) {
  const t = TONE[tone];
  return (
    <div className={cn("glass-ink inline-flex items-center gap-2.5 rounded-xl px-3 py-2", className)}>
      <span className={cn("size-2 rounded-full", t.dot)} style={{ boxShadow: "0 0 8px 1px currentColor" }} />
      <span className="text-[13px] font-medium text-white/70">{label}</span>
      <span className="text-[13px] font-semibold text-white">{value}</span>
    </div>
  );
}
