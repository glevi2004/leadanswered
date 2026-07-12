import Link from "next/link";
import type { SarahAction } from "@/lib/data/shared";
import { MODULES } from "@/lib/data/registry";
import { cn } from "@/lib/utils";
import { SarahIcon } from "@/components/icons/sarah";

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** One "what Sarah did" feed row — shared by Home's digest and /sarah's activity log (00 §8). */
export function SarahActionRow({ action, className }: { action: SarahAction; className?: string }) {
  const moduleLabel = action.module === "core" ? null : MODULES[action.module]?.label;
  const row = (
    <div className={cn("flex items-start gap-3 rounded-xl px-2 py-2", action.href && "hover:bg-muted", className)}>
      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <SarahIcon className="size-3 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">{action.summary}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {timeAgo(action.at)}
          {moduleLabel ? ` · ${moduleLabel}` : ""}
        </p>
      </div>
    </div>
  );
  return action.href ? <Link href={action.href}>{row}</Link> : row;
}
