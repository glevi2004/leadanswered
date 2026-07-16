import Link from "next/link";
import { ArrowRight, CircleCheck, Clock3, Globe, ListTodo, ShieldCheck, Wrench } from "lucide-react";
import { EmptyState } from "@/components/app/EmptyState";
import {
  ENGINEER,
  relativeAgo,
  siteHostOf,
  type EngineeringHomeData,
} from "@/lib/dashboard/engineering-home";

/**
 * The REAL dashboard home — Engineering only (the cockpit's Part A). Replaces the mock
 * cross-agent "Needs you" rollup (Apex fixtures + eight fake agents) that the audit found
 * on real orgs. Everything here is sourced from `loadEngineeringHome()` — the org's real
 * tasks / approvals / sites off the dock seam. Honest-empty when the Engineer has no work;
 * demo mode keeps the old multi-agent rollup (see home/page.tsx). Styled to match NeedsYou.
 */

const SITE_STATUS: Record<string, string> = {
  live: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  preview: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  building: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

function TaskLine({
  title,
  detail,
  ago,
}: {
  title: string;
  detail?: string;
  ago?: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-xs font-medium">{title}</p>
        {ago && (
          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{ago}</span>
        )}
      </div>
      {detail && (
        <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">{detail}</p>
      )}
    </div>
  );
}

export function EngineeringHome({ data }: { data: EngineeringHomeData }) {
  const { inProgress, needsApproval, queued, approvals, sites, needsYouCount, isWorking, isEmpty } =
    data;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-baseline gap-2 text-sm font-semibold">
          Needs you
          {needsYouCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground/70">{needsYouCount}</span>
          )}
        </h2>
        <Link
          href="/canvas"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open Workspace <ArrowRight className="size-3" />
        </Link>
      </div>

      {isEmpty ? (
        <EmptyState
          variant="mono"
          icon={CircleCheck}
          title="Your Engineer is standing by"
          body="Nothing's building yet. Ask Lu to build or fix something and you'll watch it happen here."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {/* The Engineer — identity + everything on its desk right now. */}
          <div className="elev-card flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/[0.04]">
            {/* identity + live status */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-md ring-2 ring-inset ring-background"
                  style={{ backgroundColor: `rgba(${ENGINEER.accent}, 0.14)` }}
                >
                  <Wrench className="size-3.5" style={{ color: `rgb(${ENGINEER.accent})` }} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-tight">{ENGINEER.label}</p>
                  <p className="truncate text-xs text-muted-foreground">the {ENGINEER.agentName}</p>
                </div>
              </div>
              {isWorking ? (
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

            {/* what it's building right now */}
            {inProgress.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-2 rounded-lg bg-muted/50 px-2.5 py-2"
              >
                <Clock3 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <TaskLine title={task.title} detail={task.body} ago={relativeAgo(task.updatedAt ?? task.createdAt)} />
              </div>
            ))}

            {/* what's waiting on you: needs-approval tasks + pending publish gates */}
            {needsYouCount > 0 && (
              <ul className="flex flex-col gap-2.5">
                {needsApproval.map((task) => (
                  <li key={task.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                        <ShieldCheck className="size-3" /> Needs you
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        {relativeAgo(task.updatedAt ?? task.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-snug">{task.title}</p>
                    {task.body && (
                      <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                        {task.body}
                      </p>
                    )}
                  </li>
                ))}
                {approvals.map((approval) => (
                  <li key={approval.id} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-700 dark:text-orange-300">
                        <ShieldCheck className="size-3" /> Publish gate
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">
                        {relativeAgo(approval.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs font-medium leading-snug">
                      Approve to publish{approval.action ? ` (${approval.action.replace(/_/g, " ")})` : ""}
                    </p>
                    <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                      The Engineer is waiting on your OK to ship. Review it in the Workspace.
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {/* queued work (nothing waiting on you, just lined up) */}
            {queued.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                  <ListTodo className="size-3.5" /> Queued
                </p>
                <ul className="flex flex-col gap-1.5">
                  {queued.map((task) => (
                    <li key={task.id} className="flex items-center gap-2">
                      <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                      <TaskLine title={task.title} ago={relativeAgo(task.updatedAt ?? task.createdAt)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {needsYouCount === 0 && (
              <p className="text-[11px] text-muted-foreground">Nothing needs you right now.</p>
            )}
          </div>

          {/* Sites — the Engineer's deliverables. */}
          {sites.length > 0 && (
            <div className="elev-card flex flex-col gap-3 rounded-xl border bg-card p-4 ring-1 ring-foreground/[0.04]">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Globe className="size-3.5 text-muted-foreground" /> Sites
              </p>
              <ul className="flex flex-col gap-2">
                {sites.map((site) => (
                  <li
                    key={site.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{siteHostOf(site)}</p>
                      {site.repoFullName && (
                        <p className="truncate font-mono text-[10px] text-muted-foreground">
                          {site.repoFullName}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        SITE_STATUS[site.status] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {site.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
