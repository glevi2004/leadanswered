"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import type { TimelineEvent } from "@/lib/data/shared";
import type { ContactDetail as Detail } from "@/lib/data/crm";
import { LEAD_STAGES, type PipelineStage } from "@/lib/data/crm/types";
import { statusChip, formatWhen } from "@/lib/dashboard-ui";
import { updateLeadStageAction } from "@/app/(app)/crm/actions";
import { useSarah } from "@/components/sarah/sarah-context";
import { SarahIcon } from "@/components/icons/sarah";
import { Timeline } from "@/components/app/Timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const money = (cents: number) => `$${(cents / 100).toLocaleString()}`;
const ALL_STAGES: PipelineStage[] = [...LEAD_STAGES, "job_scheduled", "job_done", "paid", "past_customer"];

/** 05-crm §2 contact detail: header · unified timeline · sidebar. */
export function ContactDetail({ detail, demo, timezone }: { detail: Detail; demo: boolean; timezone?: string }) {
  const { openWidget } = useSarah();
  const [stage, setStage] = React.useState(detail.contact.stage);
  const [tags, setTags] = React.useState(detail.contact.tags);
  const [events, setEvents] = React.useState<TimelineEvent[]>(detail.timeline);
  const [note, setNote] = React.useState("");
  const c = detail.contact;
  const sb = detail.sidebar;

  const changeStage = async (next: PipelineStage) => {
    setStage(next);
    if (!demo && LEAD_STAGES.includes(next)) {
      await updateLeadStageAction(c.id, next);
      toast.success(`Moved to ${statusChip(next).label}`);
    } else {
      toast.success(`Moved to ${statusChip(next).label}`, {
        description: demo ? undefined : "Customer-side stages go live with the customer entity.",
      });
    }
  };

  const addTag = () => {
    const t = window.prompt("Add a tag");
    if (!t?.trim()) return;
    setTags((prev) => [...prev, t.trim().toLowerCase().replace(/\s+/g, "-")]);
    toast.success("Tag added", { description: demo ? undefined : "Tags go live with the customer entity." });
  };

  const addNote = () => {
    const body = note.trim();
    if (!body) return;
    setEvents((ev) => [
      ...ev,
      { id: `note_${Date.now()}`, contactId: c.id, at: new Date().toISOString(), type: "note", body, author: "You" },
    ]);
    setNote("");
    toast.success("Note added", { description: demo ? undefined : "Note storage ships with the customer entity." });
  };

  const chip = statusChip(stage);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/crm" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> CRM
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
              <Badge variant="outline" className="capitalize">{c.kind}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <span className={`cursor-pointer rounded-full px-2 py-0.5 text-[11px] font-medium ${chip.chip}`}>{chip.label} ▾</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ALL_STAGES.map((s) => (
                    <DropdownMenuItem key={s} onClick={() => changeStage(s)}>
                      {statusChip(s).label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              {tags.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
              <button
                type="button"
                onClick={addTag}
                className="flex size-5 items-center justify-center rounded-full border text-muted-foreground hover:text-foreground"
                aria-label="Add tag"
              >
                <Plus className="size-3" />
              </button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[c.phone, c.address ?? c.town, `source: ${c.source.replace("_", " ")}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openWidget({ entity: c.name })}>
              <SarahIcon className="size-3.5" /> Ask Sarah about {c.name.split(" ")[0]}
            </Button>
            {/* stub per 05-crm §3 — visible so partners see where it's going */}
            <span
              title="Soon: pause Sarah and text this customer yourself from here."
              className="flex cursor-not-allowed items-center gap-2 text-sm text-muted-foreground/70"
            >
              You take over
              <span className="relative h-4 w-7 rounded-full bg-muted">
                <span className="absolute left-0.5 top-0.5 size-3 rounded-full bg-background shadow" />
              </span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">soon</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border bg-card p-4 sm:p-5 [--bubble-surface:var(--card)]">
            <Timeline events={events} timezone={timezone} />
            <div className="mt-4 flex gap-2 border-t pt-3">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Add a note…"
                className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring"
              />
              <Button size="sm" variant="outline" className="h-9" onClick={addNote} disabled={!note.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Up next</h3>
            {sb.nextAppointment ? (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm">
                Estimate — {formatWhen(sb.nextAppointment.startAt, timezone)}
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip(sb.nextAppointment.status).chip}`}>
                  {statusChip(sb.nextAppointment.status).label}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Nothing scheduled.</p>
            )}
          </div>
          {(sb.openQuote || sb.openInvoice) && (
            <div className="rounded-2xl border bg-card p-4">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Money</h3>
              <div className="mt-2 flex flex-col gap-1.5 text-sm">
                {sb.openQuote && (
                  <p className="flex flex-wrap items-center gap-1.5">
                    {sb.openQuote.label} · {money(sb.openQuote.totalCents)}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip(sb.openQuote.status).chip}`}>
                      {statusChip(sb.openQuote.status).label}
                    </span>
                  </p>
                )}
                {sb.openInvoice && (
                  <p className="flex flex-wrap items-center gap-1.5">
                    {sb.openInvoice.label} · {money(sb.openInvoice.totalCents)}
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip(sb.openInvoice.status).chip}`}>
                      {statusChip(sb.openInvoice.status).label}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Quick facts</h3>
            <dl className="mt-2 flex flex-col gap-1.5 text-sm">
              {sb.facts.map((f) => (
                <div key={f.label} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{f.label}</dt>
                  <dd className="text-right">{f.value}</dd>
                </div>
              ))}
              {sb.openEscalations > 0 && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Open questions</dt>
                  <dd className="font-medium text-orange-600 dark:text-orange-400">{sb.openEscalations}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
