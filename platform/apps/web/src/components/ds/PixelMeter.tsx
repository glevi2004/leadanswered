import { cn } from "@/lib/utils";
import { rampColor, SOLID, cellStyle } from "./pixel";

/**
 * PixelMeter — the signature Lu meter (ref: Cofounder "Sign ups / DAU" cards).
 * A row of chunky pixel cells that ramp green → amber → red.
 *
 * - Omit `value` for the decorative full ramp; pass `value` (0–100) for an honest meter.
 * - `rows` stacks a denser pixel field.
 */
export type PixelMeterProps = {
  value?: number;
  segments?: number;
  rows?: number;
  tone?: "ramp" | "green" | "blue" | "violet" | "amber";
  size?: "sm" | "md";
  className?: string;
};

export function PixelMeter({ value, segments = 28, rows = 1, tone = "ramp", size = "md", className }: PixelMeterProps) {
  const lit = value == null ? segments : Math.round((Math.min(Math.max(value, 0), 100) / 100) * segments);
  const cell = size === "sm" ? "h-2 w-[6px]" : "h-2.5 w-2";
  return (
    <div
      className={cn("inline-flex flex-col gap-[3px]", className)}
      role="meter"
      aria-valuenow={value ?? 100}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-[3px]">
          {Array.from({ length: segments }).map((_, i) => {
            const on = i < lit;
            const color = tone === "ramp" ? rampColor(i / (segments - 1)) : SOLID[tone];
            return <span key={i} className={cn("rounded-[1px]", cell)} style={cellStyle(color, on, false)} />;
          })}
        </div>
      ))}
    </div>
  );
}
