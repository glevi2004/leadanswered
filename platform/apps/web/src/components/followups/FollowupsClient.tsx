"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Pause, Play, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { ChaseItem, ChaseKind, ChaseLogEntry, FollowUpRule } from "@/lib/data/followups/types";
import { statusChip, formatWhen, formatTime } from "@/lib/dashboard-ui";
import { useSarah } from "@/components/sarah/sarah-context";
import { SarahIcon } from "@/components/icons/sarah";
import { StatCard } from "@/components/app/StatCard";
import { DataTable } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * 10-followups: the chase board — everything Sarah keeps warm, when she'll
 * act next, and WHY she's silent when she is. Board / Rules / History.
 * Transparency about silence is the feature (§3 voice rule: skips are Sarah
 * explaining herself, never "the system skipped").
 */

const KIND_HEADER: Record<ChaseKind, string> = {
  lead: "Quiet leads",
  quote: "Quiet quotes",
  invoice: "Unpaid invoices",
  estimate: "No-show estimates",
};

const KIND_ORDER: ChaseKind[] = ["lead", "quote", "invoice", "estimate"];

/** "30 min after they go quiet, then the next morning" — a cadence in words. */
function cadenceSentence(kind: ChaseKind, delays: number[]): string {
  const human = (m: number) =>
    m === 0 ? "the moment it's due" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)} day${m >= 2880 ? "s" : ""}`;
  const stall: Record<ChaseKind, string> = {
    lead: "after they go quiet",
    quote: "after the quote sends",
    invoice: "from the due date",
    estimate: "after a no-show",
  };
  return delays.map((d, i) => (i === 0 ? (d === 0 ? human(d) : `${human(d)} ${stall[kind]}`) : `then again ${human(d)} in`)).join(", ");
}

export function FollowupsClient({
  chases: initialChases,
  rules: initialRules,
  log: initialLog,
  stats,
  timezone,
}: {
  chases: ChaseItem[];
  rules: FollowUpRule[];
  log: ChaseLogEntry[];
  stats: { nudges30d: number; replies30d: number };
  timezone?: string;
}) {
  const { escalations, beginEscalationAnswer, openWidget } = useSarah();
  const [chases, setChases] = React.useState(initialChases);
  const [rules, setRules] = React.useState(initialRules);
  const [log, setLog] = React.useState(initialLog);

  const armed = chases.filter((c) => c.status === "armed").length;
  const waiting = chases.filter((c) => c.status === "held").length;

  const patch = (id: string, p: Partial<ChaseItem>) =>
    setChases((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));

  // The payoff beat: answer the open question (widget/dock) → the held chase re-arms itself.
  React.useEffect(() => {
    const released = chases.filter(
      (c) => c.status === "held" && !escalations.some((e) => e.contactId === c.contactId),
    );
    if (released.length === 0) return;
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(9, 15, 0, 0);
    setChases((cs) =>
      cs.map((c) =>
        released.some((r) => r.id === c.id)
          ? {
              ...c,
              status: "armed" as const,
              holdReason: undefined,
              nextNudgeAt: next.toISOString(),
              deferredForHours: true,
              plannedAngle: `Thanks for waiting, ${c.contactName.split(" ")[0]} — Marcus says yes on the copper gutters. Want me to fold that into the quote so you can see both prices?`,
            }
          : c,
      ),
    );
    for (const r of released) {
      toast.success(`Chase re-armed — ${r.contactName.split(" ")[0]} got his answer.`, {
        description: "Sarah follows up tomorrow at 9:15 with the quote back on the table.",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escalations]);

  const nudgeNow = (c: ChaseItem) => {
    // Honest > obedient (§5): the engine still gates a held chase.
    if (c.status === "held") {
      toast("Sarah looked and decided not to text", { description: c.holdReason });
      return;
    }
    const attempts = c.attempts + 1;
    const exhausted = attempts >= c.maxAttempts;
    patch(c.id, {
      attempts,
      lastTouchAt: new Date().toISOString(),
      status: exhausted ? "exhausted" : "armed",
      nextNudgeAt: exhausted ? undefined : c.nextNudgeAt,
      plannedAngle: exhausted ? undefined : c.plannedAngle,
    });
    setLog((l) => [
      {
        id: `cl_local_${Date.now()}`,
        at: new Date().toISOString(),
        chaseId: c.id,
        contactId: c.contactId,
        contactName: c.contactName,
        kind: c.kind,
        decision: "sent" as const,
        body: c.plannedAngle ?? `Nudged ${c.contactName.split(" ")[0]} about: ${c.stalledSummary}`,
        outcome: "still_quiet" as const,
      },
      ...l,
    ]);
    toast.success(`Sarah's on it — nudge sent to ${c.contactName.split(" ")[0]}.`, {
      description: exhausted ? "That was her last planned attempt — she stops here unless you say otherwise." : undefined,
    });
  };

  const togglePause = (c: ChaseItem) => {
    const paused = c.status === "paused";
    patch(c.id, { status: paused ? "armed" : "paused" });
    toast.success(
      paused
        ? `Resumed — Sarah picks the ${c.contactName.split(" ")[0]} chase back up.`
        : `Paused — Sarah won't touch this until you resume.`,
    );
  };

  const resolve = (c: ChaseItem) => {
    setChases((cs) => cs.filter((x) => x.id !== c.id));
    toast.success(`Resolved — Sarah stops chasing ${c.contactName.split(" ")[0]}.`);
  };

  const answerHold = (c: ChaseItem) => {
    const esc = escalations.find((e) => e.contactId === c.contactId);
    if (!esc) {
      openWidget();
      return;
    }
    beginEscalationAnswer(esc);
    openWidget();
  };

  /* ------------------------------- history table ------------------------------- */
  const columns = React.useMemo<ColumnDef<ChaseLogEntry, unknown>[]>(
    () => [
      { header: "When", accessorKey: "at", cell: ({ getValue }) => <span className="whitespace-nowrap text-muted-foreground">{formatWhen(String(getValue()), timezone)}</span> },
      { header: "Contact", accessorKey: "contactName", cell: ({ row }) => <span className="font-medium">{row.original.contactName}</span> },
      {
        header: "Kind",
        accessorKey: "kind",
        cell: ({ getValue }) => <span className="capitalize text-muted-foreground">{String(getValue())}</span>,
        meta: { headClass: "hidden md:table-cell", cellClass: "hidden md:table-cell" },
      },
      {
        header: "Decision",
        accessorKey: "decision",
        cell: ({ row }) => {
          const c = statusChip(row.original.decision);
          return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", c.chip)}>{c.label}</span>;
        },
      },
      {
        header: "Detail",
        id: "detail",
        cell: ({ row }) => {
          const e = row.original;
          return (
            <span className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
              <span className="max-w-md truncate">{e.decision === "sent" ? `“${e.body}”` : e.reason}</span>
              {e.outcome && (
                <span className={cn("shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium", statusChip(e.outcome).chip)}>
                  {statusChip(e.outcome).label}
                </span>
              )}
            </span>
          );
        },
      },
    ],
    [timezone],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Being chased" value={armed} hint="Sarah acts next — you don't have to" />
        <StatCard label="Waiting on you" value={waiting} hint="she stays quiet until you answer" />
        <StatCard label="Last 30 days" value={`${stats.nudges30d} → ${stats.replies30d}`} hint="nudges sent → replies won" />
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="mt-4 flex flex-col gap-5">
          {KIND_ORDER.map((kind) => {
            const group = chases.filter((c) => c.kind === kind);
            return (
              <section key={kind}>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {KIND_HEADER[kind]} <span className="font-normal">({group.length})</span>
                </h2>
                {group.length === 0 ? (
                  <p className="mt-1.5 text-sm text-muted-foreground">Nothing here. Sarah's watching.</p>
                ) : (
                  <div className="mt-2 flex flex-col gap-3">
                    {group.map((c) => (
                      <ChaseCard
                        key={c.id}
                        chase={c}
                        timezone={timezone}
                        onNudge={() => nudgeNow(c)}
                        onPause={() => togglePause(c)}
                        onResolve={() => resolve(c)}
                        onAnswer={() => answerHold(c)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 grid gap-4 lg:grid-cols-2">
          {rules.map((r) => (
            <RuleCard
              key={r.kind}
              rule={r}
              onToggle={() => {
                setRules((rs) => rs.map((x) => (x.kind === r.kind ? { ...x, enabled: !x.enabled } : x)));
                toast.success(r.enabled ? `${KIND_HEADER[r.kind]} chases off.` : `${KIND_HEADER[r.kind]} chases on.`);
              }}
              onSaveTone={(tone) => {
                setRules((rs) => rs.map((x) => (x.kind === r.kind ? { ...x, toneNote: tone } : x)));
                toast.success("Saved — Sarah writes the next nudges in that tone.");
              }}
            />
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <DataTable
            columns={columns}
            data={log}
            searchPlaceholder="Search contacts…"
            searchFn={(e, q) => e.contactName.toLowerCase().includes(q)}
            pageSize={10}
            emptyState={
              <p className="py-8 text-center text-sm text-muted-foreground">
                Every nudge — and every deliberate silence — lands here with its reason.
              </p>
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* --------------------------------- chase card ---------------------------------- */

function ChaseCard({
  chase: c,
  timezone,
  onNudge,
  onPause,
  onResolve,
  onAnswer,
}: {
  chase: ChaseItem;
  timezone?: string;
  onNudge: () => void;
  onPause: () => void;
  onResolve: () => void;
  onAnswer: () => void;
}) {
  const chip = statusChip(c.status);
  const paused = c.status === "paused";
  const held = c.status === "held";
  const exhausted = c.status === "exhausted";

  return (
    <div className="card-lift rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{c.contactName}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</span>
        <Link
          href={`/customers/${c.contactId}`}
          className="ml-auto flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View thread <ArrowRight className="size-3" />
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{c.stalledSummary}</p>

      <p className="mt-2 text-xs text-muted-foreground">
        Last touch {formatWhen(c.lastTouchAt, timezone)} · attempt {c.attempts} of {c.maxAttempts}
        {c.status === "armed" && c.nextNudgeAt && (
          <>
            {" · "}
            <span className="font-medium text-foreground">
              next nudge {formatWhen(c.nextNudgeAt, timezone)}
            </span>
            {c.deferredForHours && " — she waits for your business hours"}
          </>
        )}
        {exhausted && (
          <>
            {" · "}
            <span className="font-medium text-foreground">out of planned attempts — she stops here</span>
          </>
        )}
      </p>

      {held && c.holdReason && (
        <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
          <span className="font-medium">Sarah decided not to text.</span>{" "}
          <span className="text-muted-foreground">{c.holdReason}</span>
        </p>
      )}

      {c.plannedAngle && !held && !paused && (
        <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
          <SarahIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Her angle: <span className="text-foreground">“{c.plannedAngle}”</span>
          </span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {held ? (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" onClick={onAnswer}>
            <SarahIcon className="size-3.5" /> Answer — she picks it back up
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" onClick={onNudge} disabled={paused}>
            <Send className="size-3" /> {exhausted ? "Try once more" : "Nudge now"}
          </Button>
        )}
        {!held && (
          <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground" onClick={onPause}>
            {paused ? <Play className="size-3" /> : <Pause className="size-3" />}
            {paused ? "Resume" : "Pause"}
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground" onClick={onResolve}>
          <X className="size-3" /> Resolve
        </Button>
      </div>
    </div>
  );
}

/* --------------------------------- rule card ----------------------------------- */

function RuleCard({
  rule: r,
  onToggle,
  onSaveTone,
}: {
  rule: FollowUpRule;
  onToggle: () => void;
  onSaveTone: (tone: string) => void;
}) {
  const [tone, setTone] = React.useState(r.toneNote ?? "");
  const dirty = tone !== (r.toneNote ?? "");

  return (
    <div className={cn("rounded-2xl border bg-card p-4", !r.enabled && "opacity-60")}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{KIND_HEADER[r.kind]}</h3>
        <button
          type="button"
          role="switch"
          aria-checked={r.enabled}
          onClick={onToggle}
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          {r.enabled ? "On" : "Off"}
          <span className={cn("relative h-4 w-7 rounded-full transition-colors", r.enabled ? "bg-primary" : "bg-muted")}>
            <span className={cn("absolute top-0.5 size-3 rounded-full bg-white shadow transition-all", r.enabled ? "left-3.5" : "left-0.5")} />
          </span>
        </button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {cadenceSentence(r.kind, r.delaysMinutes)} · {r.maxAttempts} attempt{r.maxAttempts > 1 ? "s" : ""} max
      </p>

      <label className="mt-3 block text-xs font-medium text-muted-foreground">Tone note — how she should sound</label>
      <div className="mt-1 flex items-start gap-2">
        <Textarea value={tone} onChange={(e) => setTone(e.target.value)} rows={1} className="min-h-9 flex-1 text-sm" />
        <Button size="sm" className="h-9" disabled={!dirty} onClick={() => onSaveTone(tone)}>
          Save
        </Button>
      </div>

      {/* non-negotiables render as facts, never toggles (§2) */}
      <ul className="mt-3 flex flex-col gap-1 border-t pt-2.5 text-xs text-muted-foreground">
        <li>· One nudge per interaction — she never stacks.</li>
        <li>· Only during your business hours.</li>
        <li>· If they're waiting on you, she stays quiet — and says so.</li>
      </ul>
    </div>
  );
}
