import { cn } from "@/lib/utils";

/**
 * DeltaPill — a mono % change chip with a circled up/down arrow.
 * Green for gains, red for losses (ref: Cofounder "+12% / 10% / 6%" chips).
 */
export function DeltaPill({
  value,
  className,
  showSign = true,
}: {
  value: number;
  className?: string;
  showSign?: boolean;
}) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums",
        up
          ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
          : "bg-red-500/12 text-red-600 dark:text-red-400",
        className,
      )}
    >
      <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="6" cy="6" r="5" opacity="0.32" />
        {up ? <path d="M6 8.4V3.6M6 3.6 4 5.6M6 3.6 8 5.6" /> : <path d="M6 3.6v4.8M6 8.4 4 6.4M6 8.4 8 6.4" />}
      </svg>
      {showSign && up ? "+" : ""}
      {value}%
    </span>
  );
}
