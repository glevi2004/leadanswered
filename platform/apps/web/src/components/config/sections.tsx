"use client";

import { NOTIFICATION_EVENT_TYPES } from "@/lib/config";
import { DAYS, TIMES, splitList, type OnboardingState } from "@/lib/onboarding-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="sarahName">Assistant name</Label>
          <Input id="sarahName" value={state.sarahName} onChange={(e) => update({ sarahName: e.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="projectTypes">Project types (comma-separated)</Label>
          <Input id="projectTypes" value={state.projectTypes} onChange={(e) => update({ projectTypes: e.target.value })} />
        </div>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="include">Always-serve ZIPs</Label>
          <Input id="include" value={state.include} onChange={(e) => update({ include: e.target.value })} placeholder="01601" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="exclude">Never-serve ZIPs</Label>
          <Input id="exclude" value={state.exclude} onChange={(e) => update({ exclude: e.target.value })} placeholder="02101" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={state.requireDM} onCheckedChange={(v) => update({ requireDM: v === true })} />
        Only book the homeowner / decision-maker
      </label>
    </div>
  );
}

export function AvailabilitySection({ state, update }: SectionProps) {
  const toggle = (key: string) => {
    const next = new Set(state.slots);
    next.has(key) ? next.delete(key) : next.add(key);
    update({ slots: next });
  };
  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">Tap the times you can take on-site estimates. Sarah only offers these.</p>
      <div className="overflow-x-auto">
        <table className="text-xs">
          <thead>
            <tr>
              <th></th>
              {TIMES.map((t) => (
                <th key={t} className="px-1 py-1 font-normal text-muted-foreground">{t.slice(0, 5)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d) => (
              <tr key={d.n}>
                <td className="pr-2 text-muted-foreground">{d.label}</td>
                {TIMES.map((t) => {
                  const key = `${d.n}|${t}`;
                  const on = state.slots.has(key);
                  return (
                    <td key={t} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => toggle(key)}
                        className={`h-6 w-7 rounded ${on ? "bg-primary" : "bg-muted hover:bg-muted-foreground/20"}`}
                        aria-pressed={on}
                        aria-label={`${d.label} ${t}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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
  const rows: [string, string][] = [
    ["Company", state.company || "—"],
    ["Assistant", state.sarahName],
    ["Project types", splitList(state.projectTypes).join(", ") || "—"],
    ["Service area", `${state.baseZip || "—"} · ${state.radius} mi`],
    ["Availability", `${state.slots.size} time slot${state.slots.size === 1 ? "" : "s"}`],
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
