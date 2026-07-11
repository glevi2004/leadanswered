"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTIFICATION_EVENT_TYPES, DEFAULT_PROJECT_TYPES } from "@/lib/config";
import { DAYS, TIMES, splitList, cellsToWindows, type OnboardingState } from "@/lib/onboarding-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { TagInput } from "./TagInput";

export type SectionProps = {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
};

export function BusinessSection({ state, update }: SectionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="company">Company name</Label>
        <Input id="company" value={state.company} onChange={(e) => update({ company: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="sarahName">Assistant name</Label>
        <Input id="sarahName" value={state.sarahName} onChange={(e) => update({ sarahName: e.target.value })} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="projectTypes">Project types</Label>
        <TagInput
          id="projectTypes"
          value={state.projectTypes}
          onChange={(projectTypes) => update({ projectTypes })}
          suggestions={DEFAULT_PROJECT_TYPES}
          placeholder="e.g. Roof repair — or pick a suggestion below"
        />
        <p className="text-xs text-muted-foreground">The services you offer. Pick a suggestion or type your own.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="persona">Assistant persona notes</Label>
        <Textarea
          id="persona"
          rows={3}
          placeholder="Warm, local, always mentions the on-site estimate is free…"
          value={state.persona}
          onChange={(e) => update({ persona: e.target.value })}
        />
      </div>
    </div>
  );
}

export function ServiceAreaSection({ state, update }: SectionProps) {
  // Start expanded only if there are already exceptions to show — otherwise keep it out of the way.
  const [showExceptions, setShowExceptions] = useState(
    () => state.include.trim().length > 0 || state.exclude.trim().length > 0,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="baseZip">Base ZIP</Label>
          <Input id="baseZip" value={state.baseZip} onChange={(e) => update({ baseZip: e.target.value })} placeholder="02458" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="radius">Radius (miles)</Label>
          <Input id="radius" type="number" value={state.radius} onChange={(e) => update({ radius: Number(e.target.value) })} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Sarah serves anywhere within this radius of the base ZIP — for most organizations that's all you need.
      </p>

      {/* Optional exceptions — collapsed by default; most organizations leave this alone. */}
      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowExceptions((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium"
        >
          <span>
            Exceptions <span className="font-normal text-muted-foreground">— optional</span>
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", showExceptions && "rotate-180")} />
        </button>
        {showExceptions && (
          <div className="flex flex-col gap-4 border-t px-3 py-3">
            <div className="grid gap-2">
              <Label htmlFor="include">Always serve these ZIPs</Label>
              <Input id="include" value={state.include} onChange={(e) => update({ include: e.target.value })} placeholder="01601" />
              <p className="text-xs text-muted-foreground">Towns you'll take even though they're outside your radius.</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exclude">Never serve these ZIPs</Label>
              <Input id="exclude" value={state.exclude} onChange={(e) => update({ exclude: e.target.value })} placeholder="02101" />
              <p className="text-xs text-muted-foreground">Towns you refuse even though they're inside your radius.</p>
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={state.requireDM} onCheckedChange={(v) => update({ requireDM: v === true })} />
        Only book the decision-maker
      </label>
    </div>
  );
}

const TIMEZONES: string[] =
  typeof (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf === "function"
    ? (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone")
    : ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix", "America/Anchorage", "Pacific/Honolulu", "UTC"];

export function AvailabilitySection({ state, update }: SectionProps) {
  // Drag-to-paint: mousedown decides add vs erase (opposite of the first cell); dragging applies it.
  // We mutate a working Set in a ref so rapid pointerenter events during a drag don't race React state.
  const paint = useRef<{ mode: "add" | "erase"; set: Set<string> } | null>(null);

  useEffect(() => {
    const end = () => {
      paint.current = null;
    };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, []);

  const applyCell = (key: string) => {
    const p = paint.current;
    if (!p) return;
    if (p.mode === "add") p.set.add(key);
    else p.set.delete(key);
    update({ slots: new Set(p.set) });
  };
  const startPaint = (key: string) => {
    paint.current = { mode: state.slots.has(key) ? "erase" : "add", set: new Set(state.slots) };
    applyCell(key);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2">
        <Label htmlFor="timezone">Timezone</Label>
        <select
          id="timezone"
          value={state.timezone}
          onChange={(e) => update({ timezone: e.target.value })}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Your local timezone. All availability + appointment times are in this zone.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Click and drag to paint the times you can take on-site estimates (shown in <b>{state.timezone.replace(/_/g, " ")}</b>) —
        half-hours and split shifts are fine. Sarah only offers these. Drag over green to clear.
      </p>
      <div className="overflow-x-auto">
        <div
          className="grid min-w-[28rem] select-none"
          style={{ gridTemplateColumns: `3rem repeat(${DAYS.length}, minmax(2.5rem, 1fr))` }}
        >
          <div />
          {DAYS.map((d) => (
            <div key={d.n} className="pb-1 text-center text-xs font-medium text-muted-foreground">
              {d.label}
            </div>
          ))}

          {TIMES.map((t, ti) => {
            const isHour = t.endsWith(":00");
            return (
              <Fragment key={t}>
                <div className="-translate-y-1.5 pr-2 text-right text-[10px] leading-none text-muted-foreground">
                  {isHour ? t : ""}
                </div>
                {DAYS.map((d) => {
                  const key = `${d.n}|${t}`;
                  const on = state.slots.has(key);
                  const onAbove = ti > 0 && state.slots.has(`${d.n}|${TIMES[ti - 1]}`);
                  const onBelow = ti < TIMES.length - 1 && state.slots.has(`${d.n}|${TIMES[ti + 1]}`);
                  return (
                    <div
                      key={d.n}
                      onPointerDown={() => startPaint(key)}
                      onPointerEnter={() => applyCell(key)}
                      aria-label={`${d.label} ${t}`}
                      className={cn(
                        "h-5 cursor-pointer border-l border-t border-l-border/25",
                        isHour ? "border-t-border/60" : "border-t-border/20",
                        on ? "bg-primary" : "hover:bg-muted/70",
                        on && onAbove && "border-t-transparent",
                        on && !onAbove && "rounded-t-sm",
                        on && !onBelow && "rounded-b-sm",
                      )}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function EscalationSection({ state, update }: SectionProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">Topics Sarah escalates to you instead of guessing (comma-separated).</p>
      <Input value={state.escalation} onChange={(e) => update({ escalation: e.target.value })} />
    </div>
  );
}

export function RecipientsSection({ state, update }: SectionProps) {
  const setR = (i: number, patch: Partial<OnboardingState["recipients"][number]>) =>
    update({ recipients: state.recipients.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const toggleEvent = (i: number, ev: string) =>
    update({
      recipients: state.recipients.map((r, idx) => {
        if (idx !== i) return r;
        const events = new Set(r.events);
        events.has(ev) ? events.delete(ev) : events.add(ev);
        return { ...r, events };
      }),
    });
  const add = () =>
    update({ recipients: [...state.recipients, { name: "", phone: "", email: "", events: new Set<string>() }] });

  return (
    <div className="flex flex-col gap-3">
      {state.recipients.map((r, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Input placeholder="Name" value={r.name} onChange={(e) => setR(i, { name: e.target.value })} />
            <Input placeholder="Phone (+1…)" value={r.phone} onChange={(e) => setR(i, { phone: e.target.value })} />
            <Input placeholder="Email" value={r.email} onChange={(e) => setR(i, { email: e.target.value })} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            {NOTIFICATION_EVENT_TYPES.map((ev) => (
              <label key={ev} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox checked={r.events.has(ev)} onCheckedChange={() => toggleEvent(i, ev)} />
                {ev.replace(/_/g, " ")}
              </label>
            ))}
          </div>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={add}>
        + Add recipient
      </Button>
    </div>
  );
}

/** Ordered section metadata — drives both the wizard steps and the settings page. */
export const SECTIONS = [
  { key: "business", title: "Your business", subtitle: "Company, assistant, and what you do", Component: BusinessSection },
  { key: "service", title: "Service area", subtitle: "Where you take jobs", Component: ServiceAreaSection },
  { key: "availability", title: "Weekly availability", subtitle: "When Sarah can book estimates", Component: AvailabilitySection },
  { key: "escalation", title: "Loop me in on", subtitle: "What Sarah should escalate to you", Component: EscalationSection },
  { key: "recipients", title: "Who gets notified", subtitle: "Your team's alert preferences", Component: RecipientsSection },
] as const;

/** Read-only recap for the wizard's final step. */
export function ReviewSummary({ state }: { state: OnboardingState }) {
  const trim = (hhmm: string) => hhmm.replace(/^0/, "");
  const byDay = new Map<number, string[]>();
  for (const w of cellsToWindows(state.slots)) {
    (byDay.get(w.dayOfWeek) ?? byDay.set(w.dayOfWeek, []).get(w.dayOfWeek)!).push(
      `${trim(w.start)}–${trim(w.end)}`,
    );
  }
  const availability = byDay.size
    ? DAYS.filter((d) => byDay.has(d.n)).map((d) => `${d.label} ${byDay.get(d.n)!.join(", ")}`).join(" · ")
    : "—";

  const rows: [string, string][] = [
    ["Company", state.company || "—"],
    ["Assistant", state.sarahName],
    ["Project types", state.projectTypes.join(", ") || "—"],
    ["Service area", `${state.baseZip || "—"} · ${state.radius} mi`],
    ["Timezone", state.timezone.replace(/_/g, " ")],
    ["Availability", availability],
    ["Escalate", splitList(state.escalation).join(", ") || "—"],
    ["Notify", state.recipients.filter((r) => r.name.trim()).map((r) => r.name.trim()).join(", ") || "—"],
  ];
  return (
    <dl className="divide-y rounded-lg border">
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-4 px-4 py-3 text-sm">
          <dt className="w-32 shrink-0 text-muted-foreground">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
