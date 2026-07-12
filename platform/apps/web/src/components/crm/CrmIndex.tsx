"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Contact } from "@/lib/data/shared";
import type { CrmView, PipelineStage } from "@/lib/data/crm/types";
import { stageBadge, formatWhen } from "@/lib/dashboard-ui";
import { DataTable } from "@/components/app/DataTable";
import { EmptyState } from "@/components/app/EmptyState";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const VIEWS: { key: CrmView; label: string }[] = [
  { key: "all", label: "All" },
  { key: "leads", label: "Leads" },
  { key: "customers", label: "Customers" },
  { key: "needs_followup", label: "Needs follow-up" },
];

/** 05-crm §2 index: stage strip → view tabs → search/filters → the table. */
export function CrmIndex({
  contacts,
  needsFollowupIds,
  attentionIds,
  timezone,
}: {
  contacts: Contact[];
  /** ids Sarah is chasing (open escalation, quiet lead, unanswered quote) */
  needsFollowupIds: string[];
  /** ids with an open escalation — get the ⚠ marker */
  attentionIds: string[];
  timezone?: string;
}) {
  const router = useRouter();
  const [view, setView] = React.useState<CrmView>("all");
  const [stage, setStage] = React.useState<string>("all");
  const [source, setSource] = React.useState<string>("all");

  const needsSet = React.useMemo(() => new Set(needsFollowupIds), [needsFollowupIds]);
  const attentionSet = React.useMemo(() => new Set(attentionIds), [attentionIds]);

  const stageCounts = React.useMemo(() => {
    const counts = new Map<PipelineStage, number>();
    for (const c of contacts) counts.set(c.stage, (counts.get(c.stage) ?? 0) + 1);
    return counts;
  }, [contacts]);

  const sources = React.useMemo(() => Array.from(new Set(contacts.map((c) => c.source))).sort(), [contacts]);

  const viewCounts: Record<CrmView, number> = React.useMemo(
    () => ({
      all: contacts.length,
      leads: contacts.filter((c) => c.kind === "lead").length,
      customers: contacts.filter((c) => c.kind === "customer").length,
      needs_followup: contacts.filter((c) => needsSet.has(c.id)).length,
    }),
    [contacts, needsSet],
  );

  const rows = React.useMemo(() => {
    let r = contacts;
    if (view === "leads") r = r.filter((c) => c.kind === "lead");
    if (view === "customers") r = r.filter((c) => c.kind === "customer");
    if (view === "needs_followup") r = r.filter((c) => needsSet.has(c.id));
    if (stage !== "all") r = r.filter((c) => c.stage === stage);
    if (source !== "all") r = r.filter((c) => c.source === source);
    return [...r].sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  }, [contacts, view, stage, source, needsSet]);

  const columns = React.useMemo<ColumnDef<Contact, unknown>[]>(
    () => [
      {
        header: "Name",
        accessorKey: "name",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 font-medium">
            {row.original.name}
            {attentionSet.has(row.original.id) && <TriangleAlert className="size-3.5 text-orange-500" />}
          </span>
        ),
      },
      {
        header: "Stage",
        accessorKey: "stage",
        cell: ({ getValue }) => {
          const b = stageBadge(String(getValue()));
          return <Badge variant={b.variant}>{b.label}</Badge>;
        },
      },
      {
        header: "Source",
        accessorKey: "source",
        cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue()).replace("_", " ")}</span>,
        meta: { headClass: "hidden md:table-cell", cellClass: "hidden md:table-cell" },
      },
      {
        header: "Town",
        accessorKey: "town",
        cell: ({ getValue }) => <span className="text-muted-foreground">{String(getValue() ?? "—")}</span>,
        meta: { headClass: "hidden lg:table-cell", cellClass: "hidden lg:table-cell" },
      },
      {
        header: "Last activity",
        accessorKey: "lastActivityAt",
        cell: ({ getValue }) => <span className="text-muted-foreground">{formatWhen(String(getValue()), timezone)}</span>,
      },
    ],
    [attentionSet, timezone],
  );

  const filterSelect = (value: string, onChange: (v: string) => void, options: { value: string; label: string }[], allLabel: string) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-lg border bg-background px-2 text-sm text-muted-foreground outline-none focus:border-ring"
    >
      <option value="all">{allLabel}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* stage strip */}
      <div className="flex flex-wrap gap-1.5 overflow-x-auto">
        {Array.from(stageCounts.entries()).map(([s, n]) => (
          <button
            key={s}
            type="button"
            onClick={() => setStage(stage === s ? "all" : s)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
              stage === s ? "border-foreground/30 bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {stageBadge(s).label} {n}
          </button>
        ))}
      </div>

      {/* view tabs */}
      <div className="flex flex-wrap gap-1">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm transition-colors",
              view === v.key ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label} <span className="text-xs text-muted-foreground">{viewCounts[v.key]}</span>
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchPlaceholder="Search name, phone, town…"
        searchFn={(c, q) =>
          c.name.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) || (c.town ?? "").toLowerCase().includes(q)
        }
        toolbar={
          <>
            {filterSelect(stage, setStage, Array.from(stageCounts.keys()).map((s) => ({ value: s, label: stageBadge(s).label })), "Stage")}
            {filterSelect(source, setSource, sources.map((s) => ({ value: s, label: s.replace("_", " ") })), "Source")}
          </>
        }
        onRowClick={(c) => router.push(`/crm/${c.id}`)}
        emptyState={
          view === "customers" ? (
            <EmptyState
              title="No customers here yet."
              body="Bring your history in — Sarah reads it and knows your business day one."
              askSarah
            />
          ) : view === "needs_followup" ? (
            <EmptyState title="Nothing needs you — Sarah's on top of it." />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No contacts match.</p>
          )
        }
      />
    </div>
  );
}
