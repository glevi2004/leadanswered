import { cn } from "@/lib/utils";
import { PixelMeter, type PixelMeterProps } from "./PixelMeter";
import { DeltaPill } from "./DeltaPill";

/**
 * StatBlock — the signature metric tile (ref: Cofounder "Sign ups 234" cards):
 * uppercase label, big IBM Plex Mono numeral, pixel ramp meter, delta pill.
 * The clearest single expression of "pixel-accented editorial".
 */
export function StatBlock({
  label,
  value,
  delta,
  meterValue,
  tone = "ramp",
  segments = 28,
  bare = false,
  className,
}: {
  label: string;
  value: string;
  delta?: number;
  meterValue?: number;
  tone?: PixelMeterProps["tone"];
  segments?: number;
  bare?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(!bare && "neu-card rounded-2xl bg-card p-5 transition hover:-translate-y-0.5", "min-w-0", className)}>
      <div className="text-xs font-medium tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-3xl font-semibold tabular-nums text-foreground">{value}</div>
      <PixelMeter className="mt-3" value={meterValue} tone={tone} segments={segments} />
      {delta !== undefined && (
        <div className="mt-2.5 flex items-center gap-1.5">
          <DeltaPill value={delta} />
        </div>
      )}
    </div>
  );
}
