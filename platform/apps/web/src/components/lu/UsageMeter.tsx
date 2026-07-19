"use client";

import * as React from "react";

interface Usage {
  usedMicros: number;
  bucketMicros: number;
  plan: string;
  overBucket: boolean;
  overageOptIn: boolean;
}

/**
 * A compact agent-compute usage chip for the Lu dock (plan Pillar 2). Reads the session org's
 * metered compute vs its bucket off /api/dock/usage and shows "$used/$bucket · N%". Renders nothing
 * until it has data (honest-empty). costMicros are USD millionths (1 USD = 1_000_000).
 */
export function UsageMeter({ className = "" }: { className?: string }) {
  const [usage, setUsage] = React.useState<Usage | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/dock/usage")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && typeof d.bucketMicros === "number") setUsage(d as Usage);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!usage || !usage.bucketMicros) return null;
  const pct = Math.min(100, Math.round((usage.usedMicros / usage.bucketMicros) * 100));
  const used = (usage.usedMicros / 1_000_000).toFixed(2);
  const bucket = (usage.bucketMicros / 1_000_000).toFixed(0);
  return (
    <span
      title={`Agent compute this period: $${used} of $${bucket}${usage.overBucket ? " (over bucket)" : ""}`}
      className={`rounded-md border bg-card px-2 py-1 font-mono text-[11px] ${
        usage.overBucket ? "text-amber-500" : "text-muted-foreground"
      } ${className}`}
    >
      ${used}/${bucket} · {pct}%
    </span>
  );
}
