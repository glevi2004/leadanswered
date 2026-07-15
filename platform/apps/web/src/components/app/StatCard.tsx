import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Headline number tile (00 §8). `soon` renders the muted not-live-yet variant
 * (01-home §8 Q1) — never a fake number for a real partner. `href` deep-links
 * to the module the number fronts.
 */
export function StatCard({
  label,
  value,
  hint,
  badge,
  soon,
  href,
  className,
}: {
  label: string;
  value?: React.ReactNode;
  hint?: React.ReactNode;
  /** Target/state chip beside the value (11-analytics: "✓ under 60 seconds"). */
  badge?: React.ReactNode;
  soon?: boolean;
  href?: string;
  className?: string;
}) {
  const body = (
    <div
      className={cn(
        "card-lift h-full rounded-2xl border bg-card p-5 text-card-foreground shadow-xs",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {soon ? (
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">soon</span>
        </p>
      ) : (
        <>
          <p className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight">
            {value}
            {badge}
          </p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </>
      )}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
