"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NOTIFICATION_EVENT_TYPES } from "@/lib/config";
import { saveOnboardingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 0, label: "Sun" },
];
const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

type RecipientRow = { name: string; phone: string; email: string; events: Set<string> };

export type OnboardingInitial = {
  companyName: string;
  sarahName?: string;
  personaNotes?: string | null;
  projectTypes?: string[];
  baseLocations?: { zip: string; radiusMiles: number }[];
  includeOverrides?: string[];
  excludeOverrides?: string[];
  requireDecisionMaker?: boolean;
  slots?: { dayOfWeek: number; time: string }[];
  escalationTopics?: string[];
  recipients?: { name: string; phone?: string | null; email?: string | null; subscriptions?: { eventType: string }[] }[];
};

export function OnboardingForm({ initial }: { initial: OnboardingInitial }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState(initial.companyName);
  const [sarahName, setSarahName] = useState(initial.sarahName || "Sarah");
  const [persona, setPersona] = useState(initial.personaNotes ?? "");
  const [projectTypes, setProjectTypes] = useState(
    (initial.projectTypes?.length ? initial.projectTypes : ["roof_repair", "roof_replacement"]).join(", "),
  );
  const [baseZip, setBaseZip] = useState(initial.baseLocations?.[0]?.zip ?? "");
  const [radius, setRadius] = useState(initial.baseLocations?.[0]?.radiusMiles ?? 25);
  const [include, setInclude] = useState((initial.includeOverrides ?? []).join(", "));
  const [exclude, setExclude] = useState((initial.excludeOverrides ?? []).join(", "));
  const [requireDM, setRequireDM] = useState(initial.requireDecisionMaker ?? true);
  const [slots, setSlots] = useState<Set<string>>(
    new Set((initial.slots ?? []).map((s) => `${s.dayOfWeek}|${s.time}`)),
  );
  const [escalation, setEscalation] = useState(
    (initial.escalationTopics?.length
      ? initial.escalationTopics
      : ["financing or payment plans", "warranties", "licensing or insurance"]
    ).join(", "),
  );
  const [recipients, setRecipients] = useState<RecipientRow[]>(
    initial.recipients?.length
      ? initial.recipients.map((r) => ({
          name: r.name,
          phone: r.phone ?? "",
          email: r.email ?? "",
          events: new Set((r.subscriptions ?? []).map((s) => s.eventType)),
        }))
      : [{ name: "", phone: "", email: "", events: new Set(["booking_confirmed", "new_qualified_lead"]) }],
  );

  const toggleSlot = (key: string) =>
    setSlots((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  function setRecipient(i: number, patch: Partial<RecipientRow>) {
    setRecipients((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function toggleRecipientEvent(i: number, event: string) {
    setRecipients((rs) =>
      rs.map((r, idx) => {
        if (idx !== i) return r;
        const events = new Set(r.events);
        events.has(event) ? events.delete(event) : events.add(event);
        return { ...r, events };
      }),
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const config = {
      companyName: company,
      sarahName,
      personaNotes: persona || null,
      projectTypes: splitList(projectTypes),
      serviceArea: {
        baseLocations: [{ zip: baseZip, radiusMiles: Number(radius) }],
        includeOverrides: splitList(include),
        excludeOverrides: splitList(exclude),
      },
      qualificationRules: { requireDecisionMaker: requireDM },
      standingAvailability: {
        timezone: "America/New_York",
        slots: [...slots]
          .map((k) => {
            const [day, time] = k.split("|");
            return { dayOfWeek: Number(day), time };
          })
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time)),
      },
      escalationTopics: splitList(escalation),
      recipients: recipients
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          phone: r.phone.trim() || null,
          email: r.email.trim() || null,
          subscriptions: [...r.events].map((eventType) => ({ eventType, channels: "both" as const })),
        })),
    };

    const res = await saveOnboardingAction(config);
    setSaving(false);
    if (res?.error) setError(res.error);
    else router.push("/status");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your business</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Company name</Label>
            <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sarahName">Assistant name</Label>
              <Input id="sarahName" value={sarahName} onChange={(e) => setSarahName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="projectTypes">Project types (comma-separated)</Label>
              <Input id="projectTypes" value={projectTypes} onChange={(e) => setProjectTypes(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="persona">Assistant persona notes</Label>
            <Textarea id="persona" rows={2} placeholder="Warm, local, always mentions the on-site estimate is free…" value={persona} onChange={(e) => setPersona(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service area</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="baseZip">Base ZIP</Label>
              <Input id="baseZip" value={baseZip} onChange={(e) => setBaseZip(e.target.value)} placeholder="02458" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="radius">Radius (miles)</Label>
              <Input id="radius" type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="include">Always-serve ZIPs</Label>
              <Input id="include" value={include} onChange={(e) => setInclude(e.target.value)} placeholder="01601" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exclude">Never-serve ZIPs</Label>
              <Input id="exclude" value={exclude} onChange={(e) => setExclude(e.target.value)} placeholder="02101" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={requireDM} onCheckedChange={(v) => setRequireDM(v === true)} />
            Only book the homeowner / decision-maker
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly availability</CardTitle>
        </CardHeader>
        <CardContent>
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
                      const on = slots.has(key);
                      return (
                        <td key={t} className="p-0.5">
                          <button
                            type="button"
                            onClick={() => toggleSlot(key)}
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Loop me in on</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Topics Sarah escalates to you instead of guessing (comma-separated).</p>
          <Input value={escalation} onChange={(e) => setEscalation(e.target.value)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Who gets notified</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {recipients.map((r, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Name" value={r.name} onChange={(e) => setRecipient(i, { name: e.target.value })} />
                <Input placeholder="Phone (+1…)" value={r.phone} onChange={(e) => setRecipient(i, { phone: e.target.value })} />
                <Input placeholder="Email" value={r.email} onChange={(e) => setRecipient(i, { email: e.target.value })} />
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {NOTIFICATION_EVENT_TYPES.map((ev) => (
                  <label key={ev} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox checked={r.events.has(ev)} onCheckedChange={() => toggleRecipientEvent(i, ev)} />
                    {ev.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setRecipients((rs) => [...rs, { name: "", phone: "", email: "", events: new Set() }])}
          >
            + Add recipient
          </Button>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" disabled={saving}>
        {saving ? "Saving…" : "Finish setup"}
      </Button>
    </form>
  );
}
