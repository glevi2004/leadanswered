import { cn } from "@/lib/utils";

/**
 * Shared board scaffolding for the /dev/design App-components gallery.
 * Every gallery section imports Frame + Cap from here so the whole board
 * reads as one system. Keep these dumb + presentational.
 */

export function Frame({ title, tag, children, className }: { title: string; tag?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative rounded-[22px] border bg-background/40 p-6", className)}>
      <div className="mb-5 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {tag && <span className="font-mono text-[11px] text-muted-foreground">{tag}</span>}
      </div>
      {children}
    </section>
  );
}

export function Cap({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{children}</div>;
}

/** A group label above a set of sections. */
export function GalleryHeading({ children, tag }: { children: React.ReactNode; tag?: string }) {
  return (
    <div className="flex items-baseline gap-3 px-1 pt-6">
      <h2 className="t-h2 text-foreground">{children}</h2>
      {tag && <span className="font-mono text-[11px] text-muted-foreground">{tag}</span>}
    </div>
  );
}

/* ---- shared color registries (mirror lib/dashboard-ui + ApprovalCard) ---- */

export type StatusTone = "gray" | "blue" | "violet" | "emerald" | "amber" | "red";
export const STATUS: Record<StatusTone, string> = {
  gray: "bg-foreground/8 text-muted-foreground",
  blue: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
  violet: "bg-violet-500/12 text-violet-700 dark:text-violet-400",
  emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/14 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/12 text-red-600 dark:text-red-400",
};
export function StatusChip({ tone, children, className }: { tone: StatusTone; children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS[tone], className)}>{children}</span>;
}

/** Categorical KINDS (by type) — solid hue for the dot, soft-tint for the chip. */
export const KIND: Record<string, string> = {
  message: "#3B82F6", quote: "#8B5CF6", invoice: "#10B981", review: "#F59E0B",
  post: "#EC4899", site: "#6366F1", question: "#F97316",
};
export function KindChip({ kind, className }: { kind: keyof typeof KIND | string; className?: string }) {
  const c = KIND[kind] ?? "#8a8a8a";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", className)}
      style={{ background: `color-mix(in oklab, ${c} 13%, transparent)`, color: c }}>
      <span className="size-1.5 rounded-full" style={{ background: c }} />
      {kind}
    </span>
  );
}
