"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Info, Pause, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Campaign, ReviewRequest, ReviewRequestStatus } from "@/lib/data/reviews/types";
import { useSarah } from "@/components/sarah/sarah-context";
import { statusChip } from "@/lib/dashboard-ui";
import { StarRating } from "@/components/app/StarRating";
import { DataTable } from "@/components/app/DataTable";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** 09-reviews §2 campaign detail: funnel → compliance → targets. */
export function CampaignDetail({ campaign, requests }: { campaign: Campaign; requests: ReviewRequest[] }) {
  const { openWidget } = useSarah();
  const [status, setStatus] = React.useState(campaign.status);
  const [rows, setRows] = React.useState(requests);
  const [editing, setEditing] = React.useState<"ask" | "pacing" | null>(null);
  const [template, setTemplate] = React.useState(campaign.ask.template);
  const [perDay, setPerDay] = React.useState(campaign.pacing.perDay);
  const c = campaign.counts;
  const sent = c.sent + c.replied + c.reviewed + c.opted_out + c.failed;
  const replied = c.replied + c.reviewed;
  const done = status === "completed";

  const togglePause = () => {
    const next = status === "running" ? "paused" : "running";
    setStatus(next);
    toast.success(next === "paused" ? "Paused — nothing sends until you resume." : "Resumed.");
  };

  const toggleRow = (id: string) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, paused: !r.paused } : r)));
    const r = rows.find((x) => x.id === id);
    toast.success(r?.paused ? `Resumed ${r.contactName}.` : `Paused ${r?.contactName} — their slot and reminder are held.`);
  };

  const funnel = [
    { label: "queued", n: c.queued },
    { label: "sent", n: sent },
    { label: "replied", n: replied },
    { label: "reviewed", n: c.reviewed },
  ];

  const columns = React.useMemo<ColumnDef<ReviewRequest, unknown>[]>(
    () => [
      {
        header: "Customer",
        accessorKey: "contactName",
        cell: ({ row }) => <span className="font-medium">{row.original.contactName}</span>,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", statusChip(row.original.status).chip)}>
            {statusChip(row.original.status).label}
          </span>
        ),
      },
      {
        header: "Detail",
        accessorKey: "detail",
        cell: ({ row }) => (
          <span className="flex items-center gap-2 text-muted-foreground">
            {row.original.rating && <StarRating rating={row.original.rating} />}
            {row.original.detail}
            {row.original.approvalId && (
              <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); openWidget(); }}>
                Review
              </Button>
            )}
          </span>
        ),
      },
      {
        header: "",
        id: "pause",
        cell: ({ row }) =>
          ["queued", "sent"].includes(row.original.status) ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                toggleRow(row.original.id);
              }}
            >
              {row.original.paused ? <Play className="size-3" /> : <Pause className="size-3" />}
              {row.original.paused ? "Resume" : "Pause"}
            </Button>
          ) : null,
      },
    ],
    [rows], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/reviews" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Reviews
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusChip(status).chip}`}>{statusChip(status).label}</span>
          {!done && (
            <Button size="sm" variant="outline" className="h-7 gap-1 px-2.5 text-xs" onClick={togglePause}>
              {status === "running" ? <Pause className="size-3" /> : <Play className="size-3" />}
              {status === "running" ? "Pause" : "Resume"}
            </Button>
          )}
        </div>
      </div>

      {done && (
        <div className="card-lift rounded-2xl border bg-card p-5">
          <p className="text-lg font-semibold">
            {campaign.results.newReviews} new reviews from {sent} asks · {campaign.results.averageRating}★ average
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Google went {campaign.results.googleBefore} → {campaign.results.googleAfter} reviews. This is the wave that
            proved it — the big one followed.
          </p>
        </div>
      )}

      {/* funnel */}
      <div className="card-lift rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          {funnel.map((f, i) => (
            <React.Fragment key={f.label}>
              {i > 0 && <ChevronRight className="size-4 text-muted-foreground/50" />}
              <span className="flex items-baseline gap-1.5 rounded-lg bg-muted/60 px-2.5 py-1">
                <span className="font-semibold">{f.n}</span>
                <span className="text-xs capitalize text-muted-foreground">{f.label}</span>
              </span>
            </React.Fragment>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            opted out {c.opted_out} · failed {c.failed} · audience {campaign.audience.eligible} of {campaign.audience.imported} imported
          </span>
        </div>
      </div>

      {/* compliance, plainly */}
      <div className="flex gap-2.5 rounded-2xl border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          How this runs: <span className="font-medium text-foreground">{campaign.pacing.perDay}/day</span> inside your
          hours (Mon–Sat 9–7) — never a blast · STOP opts anyone out automatically, forever · one ask + one reminder,
          then we leave them alone · {c.opted_out} opted out.
        </p>
      </div>

      {!done && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => setEditing(editing === "ask" ? null : "ask")}>
              <Pencil className="size-3" /> Edit the ask
            </Button>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 px-2.5 text-xs" onClick={() => setEditing(editing === "pacing" ? null : "pacing")}>
              <Pencil className="size-3" /> Change pacing
            </Button>
          </div>
          {editing === "ask" && (
            <div className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
              <label className="text-xs font-medium text-muted-foreground">
                The message — personalized per customer; already-sent asks are untouched
              </label>
              <Textarea value={template} onChange={(e) => setTemplate(e.target.value)} rows={5} className="text-sm" />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditing(null);
                    toast.success("Saved — the next asks use the new message.");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
          {editing === "pacing" && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
              <label className="text-sm">Asks per day</label>
              <input
                type="number"
                min={1}
                max={40}
                value={perDay}
                onChange={(e) => setPerDay(Number(e.target.value))}
                className="h-9 w-20 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
              />
              <span className="text-xs text-muted-foreground">inside your hours (Mon–Sat 9–7)</span>
              <Button
                size="sm"
                className="ml-auto"
                onClick={() => {
                  setEditing(null);
                  toast.success(`Saved — ${perDay} asks a day from tomorrow.`);
                }}
              >
                Save
              </Button>
            </div>
          )}
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search customers…"
        searchFn={(r, q) => r.contactName.toLowerCase().includes(q)}
        pageSize={12}
        emptyState={
          <p className="py-8 text-center text-sm text-muted-foreground">
            {done
              ? "Every target was asked — this wave is done."
              : `The queue is set — the first asks land in your approvals tomorrow at ${campaign.pacing.window.start.replace(/^0/, "")}.`}
          </p>
        }
      />
    </div>
  );
}
