import { cn } from "@/lib/utils";

/**
 * MeterBar — a continuous, thick, rounded fill sitting in a recessed socket
 * (ref: Cofounder "Open Rate 58%" green bar). The non-pixel counterpart to
 * PixelMeter: use this for a single honest percentage.
 */
const FILL: Record<string, string> = {
  green: "linear-gradient(180deg, hsl(145 60% 63%), hsl(145 54% 50%))",
  blue: "linear-gradient(180deg, hsl(214 90% 66%), hsl(214 84% 56%))",
  violet: "linear-gradient(180deg, hsl(258 82% 72%), hsl(258 74% 62%))",
  amber: "linear-gradient(180deg, hsl(40 95% 60%), hsl(36 92% 50%))",
  ink: "linear-gradient(180deg, color-mix(in oklab, var(--primary), #fff 16%), var(--primary))",
};

export function MeterBar({
  value,
  tone = "green",
  className,
  height = "h-9",
}: {
  value: number;
  tone?: keyof typeof FILL;
  className?: string;
  height?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("neu-socket w-full overflow-hidden rounded-xl", height, className)}>
      <div
        className="h-full rounded-xl transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, background: FILL[tone], boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.4)" }}
      />
    </div>
  );
}
