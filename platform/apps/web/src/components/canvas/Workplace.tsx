import { CheckCircle2, CircleDashed, FileText, Loader2 } from "lucide-react";
import { SarahIcon } from "@/components/icons/sarah";
import { AGENT_WORK } from "@/lib/canvas/agent-work";
import { agentById, type DeptId } from "@/lib/canvas/graph";

/**
 * The agent's WORKPLACE — the page where you watch what the agent is working on
 * right now: current task + progress, pending/approval queue, live activity, and
 * the draft artifact on its desk. One template, fed per-agent mock data
 * (lib/canvas/agent-work.ts). Served chrome-less at /embed/{dept}-work and rendered
 * live as a node on the company canvas.
 */
export function Workplace({ dept }: { dept: DeptId }) {
  const agent = agentById(dept);
  const work = AGENT_WORK[dept];
  if (!agent) return null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <header className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl" style={{ backgroundColor: `rgba(${agent.accent},0.14)`, color: `rgb(${agent.accent})` }}>
          <SarahIcon className="size-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{agent.agentName}</h1>
          <p className="text-sm text-muted-foreground">{agent.label} · workplace</p>
        </div>
        {work.current && (
          <span className="ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full" style={{ backgroundColor: `rgb(${agent.accent})` }} /> working
          </span>
        )}
      </header>

      {/* current task */}
      {work.current ? (
        <section className="rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium"><Loader2 className="size-4 animate-spin text-muted-foreground" /> {work.current.title}</p>
            <span className="text-xs text-muted-foreground">{work.current.startedAgo}</span>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{work.current.detail}</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(work.current.progress * 100)}%`, backgroundColor: `rgb(${agent.accent})` }} />
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed bg-card/40 p-4 text-sm text-muted-foreground">
          Nothing on the desk right now — {agent.agentName} picks up work as it comes in.
        </section>
      )}

      {/* pending / approvals */}
      {work.pending.length > 0 && (
        <section className="rounded-2xl border bg-card p-4">
          <p className="text-sm font-medium">Up next</p>
          <div className="mt-2 space-y-2">
            {work.pending.map((p) => (
              <div key={p.title} className="flex items-center gap-2.5 text-sm">
                <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                {p.status === "needs_approval" && (
                  <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">Needs your ok</span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">{p.ago}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* draft artifact */}
      {work.draft && (
        <section className="rounded-2xl border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-medium"><FileText className="size-4 text-muted-foreground" /> {work.draft.kind}</p>
          <div className="mt-2 rounded-xl border bg-background p-3">
            <p className="text-sm font-medium">{work.draft.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{work.draft.preview}</p>
          </div>
        </section>
      )}

      {/* activity */}
      <section className="rounded-2xl border bg-card p-4">
        <p className="text-sm font-medium">Activity</p>
        {work.activity.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Quiet so far — activity shows up here the moment {agent.agentName} starts working.</p>
        ) : (
          <ol className="mt-2 space-y-2.5">
            {work.activity.map((a, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="min-w-0 flex-1">{a.line}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{a.at}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
