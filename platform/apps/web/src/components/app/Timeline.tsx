"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, FileText, MessageCircleQuestion, NotebookPen, Receipt, Star, Upload } from "lucide-react";
import type { TimelineEvent } from "@/lib/data/shared";
import { formatTime, formatWhen, statusChip } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

/**
 * The unified contact timeline (00 §8; 05-crm is the primary consumer).
 * `message` events render as chat bubbles (the lead-detail spirit: inbound
 * left/muted, outbound right/primary); everything else is a slim centered
 * marker row. Filter chips toggle event types.
 */

const TYPE_LABELS: Record<string, string> = {
  message: "Messages",
  appointment: "Appts",
  quote: "Quotes",
  invoice: "Invoices",
  review: "Reviews",
  note: "Notes",
  escalation: "Escalations",
  import: "Import",
};

const money = (cents: number) => `$${(cents / 100).toLocaleString()}`;

/** Central-registry status chip, marker-row sized (00 §9 — no bespoke status text). */
function StatusPill({ status }: { status: string }) {
  const c = statusChip(status);
  return <span className={cn("ml-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium", c.chip)}>{c.label}</span>;
}

function Marker({ icon: Icon, children, href }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; href?: string }) {
  const row = (
    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
      <span className="h-px w-8 bg-border" />
      <Icon className="size-3.5 shrink-0" />
      <span className={cn("flex min-w-0 items-center gap-1 truncate", href && "underline-offset-2 hover:text-foreground hover:underline")}>{children}</span>
      <span className="h-px w-8 bg-border" />
    </div>
  );
  return href ? <Link href={href}>{row}</Link> : row;
}

export function Timeline({ events, timezone, sarahName = "Sarah" }: { events: TimelineEvent[]; timezone?: string; sarahName?: string }) {
  const types = Array.from(new Set(events.map((e) => e.type)));
  const [active, setActive] = React.useState<Set<string>>(new Set(types));
  React.useEffect(() => setActive(new Set(types)), [events.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (t: string) =>
    setActive((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const visible = events.filter((e) => active.has(e.type));

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {types.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                active.has(t) ? "border-foreground/20 bg-muted text-foreground" : "text-muted-foreground/60 hover:text-muted-foreground",
              )}
            >
              {TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {visible.map((e) => {
          switch (e.type) {
            case "message": {
              const out = e.direction === "outbound";
              return (
                <div key={e.id} className={cn("flex flex-col", out ? "items-end" : "items-start")}>
                  <div className={cn("msg", out ? "msg-me" : "msg-them")}>{e.body}</div>
                  <span className="mt-0.5 px-1 text-[10px] text-muted-foreground">
                    {out ? sarahName : ""} {formatTime(e.at, timezone)}
                  </span>
                </div>
              );
            }
            case "appointment":
              return (
                <Marker key={e.id} icon={CalendarDays} href="/schedule">
                  Estimate — {formatWhen(e.startAt, timezone)} <StatusPill status={e.status} />
                </Marker>
              );
            case "quote":
              return (
                <Marker key={e.id} icon={FileText}>
                  {e.label} · {money(e.totalCents)} <StatusPill status={e.status} />
                </Marker>
              );
            case "invoice":
              return (
                <Marker key={e.id} icon={Receipt}>
                  {e.label} · {money(e.totalCents)} <StatusPill status={e.status} />
                </Marker>
              );
            case "review":
              return (
                <Marker key={e.id} icon={Star}>
                  {"★".repeat(e.rating)} {e.excerpt ? `“${e.excerpt}”` : "New review"}
                </Marker>
              );
            case "escalation":
              return (
                <Marker key={e.id} icon={MessageCircleQuestion}>
                  Asked: “{e.question}” <StatusPill status={e.status} />
                </Marker>
              );
            case "note":
              return (
                <Marker key={e.id} icon={NotebookPen}>
                  Note ({e.author}): {e.body}
                </Marker>
              );
            case "import":
              return (
                <Marker key={e.id} icon={Upload}>
                  Imported from {e.source}
                </Marker>
              );
          }
        })}
      </div>
    </div>
  );
}
