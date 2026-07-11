import { cn } from "@/lib/utils";

/**
 * Headline number tile (00 §8). `soon` renders the muted not-live-yet variant
 * (01-home §8 Q1) — never a fake number for a real partner.
 */
export function StatCard({
  label,
  value,
  hint,
  soon,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  hint?: string;
  soon?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("card-lift rounded-2xl border bg-card p-5 text-card-foreground shadow-xs", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {soon ? (
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">soon</span>
        </p>
      ) : (
        <>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
    </div>
  );
}
