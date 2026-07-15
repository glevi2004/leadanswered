"use client";

import Link from "next/link";
import { ArrowRight, Ban, CircleCheck, Clock3, HelpCircle, ShieldCheck } from "lucide-react";
import { needsYou, type NeedsYouKind } from "@/lib/canvas/agent-work";
import { EmptyState } from "@/components/app/EmptyState";

/**
 * Zone A — "Needs you". A cross-agent compilation of every department agent's
 * workplace: what each agent is doing right now, and what's waiting on the owner
 * (an approval, a question, or a blocked item). Every card links straight to the
 * Workspace (/canvas), where the agent lives. Data comes from `needsYou()` — a
 * mock rollup, same as the canvas experiment it fronts.
 */

const KIND: Record<
  NeedsYouKind,
  { label: string; chip: string; icon: React.ComponentType<{ className?: string }> }
> = {
  // ~#e0913c "Requires approval" — orange, via tokens (no raw hex).
  approval: {
    label: "Requires approval",
    chip: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
    icon: ShieldCheck,
  },
  question: {
    label: "Question for you",
    chip: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
    icon: HelpCircle,
  },
  blocked: {
    label: "Blocked",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    icon: Ban,
  },
};

export function NeedsYou() {
  const rollups = needsYou();
  const total = rollups.reduce((n, r) => n + r.waiting.length, 0);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-baseline gap-2 text-sm font-semibold">
          Needs you
          {total > 0 && <span className="text-xs font-normal text-muted-foreground/70">{total}</span>}
        </h2>
        <Link
          href="/canvas"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open Workspace <ArrowRight className="size-3" />
        </Link>
      </div>

      {total === 0 ? (
        <EmptyState
          variant="mono"
          icon={CircleCheck}
          title="All clear"
          body="Every agent's on track — nothing's waiting on you."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rollups.map((r) => (
            <Link
              key={r.dept}
              href="/canvas"
              className="elev-card group flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/[0.04] transition-colors hover:bg-muted/40"
            >
              {/* agent identity + live status */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-2 ring-inset ring-background"
                    style={{ backgroundColor: `rgb(${r.accent})` }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold leading-tight">{r.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.agentName}</p>
                  </div>
                </div>
                {r.working ? (
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                    <span className="relative flex size-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                    </span>
                    Working
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Idle
                  </span>
                )}
              </div>

              {/* what it's doing right now */}
              {r.working && (
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-2">
                  <Clock3 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{r.working.title}</p>
                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      {r.working.detail}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {r.working.startedAgo}
                  </span>
                </div>
              )}

              {/* what's waiting on you */}
              {r.waiting.length > 0 && (
                <ul className="flex flex-col gap-2.5">
                  {r.waiting.map((it) => {
                    const k = KIND[it.kind];
                    const Icon = k.icon;
                    return (
                      <li key={it.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${k.chip}`}
                          >
                            <Icon className="size-3" /> {k.label}
                          </span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                            {it.ago}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-snug">{it.title}</p>
                        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                          {it.detail}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
