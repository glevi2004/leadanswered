"use client";

import * as React from "react";
import { toast } from "sonner";
import { ClipboardCopy, File, FileText, Folder, LayoutGrid, List, Search } from "lucide-react";
import { useSarah } from "./sarah-context";
import { useCanvasGraph, type CanvasNode } from "@/lib/canvas/api";
import { OrgDocsList } from "@/components/library/OrgDocs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Library — everything the company keeps (docs/product.md §3). Two halves:
 *   DOCUMENTS — the company docs Lu writes (Business Plan, Architecture, decisions,
 *   migrations), as preview cards that open the Notion-style viewer at /doc/[id];
 *   FILES — the canvas `Collection`s (folders) + `note`/`file` nodes from `/api/canvas`.
 * Grid/list toggle + search apply to the files; honest-empty everywhere — never a fixture.
 */

const IMPORT_PROMPT =
  "Summarize everything important from our conversation so far into a single portable context document — the goals, decisions, facts, names, links, and open questions — formatted as clean Markdown I can hand to another assistant so it can pick up exactly where we left off.";

interface LibItem {
  id: string;
  kind: "folder" | "note" | "file";
  title: string;
  subtitle?: string;
}

function firstLine(s?: string | null): string {
  return (s ?? "").split("\n")[0].trim();
}

function nodeTitle(n: CanvasNode): string {
  const c = firstLine(n.content);
  if (n.type === "note") return c || "Untitled note";
  if (n.type === "file") return c || n.refId || "File";
  if (n.type === "folder") return c || "Folder";
  return c || "Item";
}

export function DockLibrary() {
  const { widgetOpen } = useSarah();
  const { nodes, collections, loaded } = useCanvasGraph(widgetOpen);
  const [view, setView] = React.useState<"grid" | "list">("list");
  const [query, setQuery] = React.useState("");

  const items = React.useMemo<LibItem[]>(() => {
    const folders: LibItem[] = collections.map((c) => ({
      id: c.id,
      kind: "folder",
      title: c.label?.trim() || "Folder",
      subtitle: `${c.nodeIds?.length ?? 0} item${(c.nodeIds?.length ?? 0) === 1 ? "" : "s"}`,
    }));
    const files: LibItem[] = nodes
      .filter((n) => n.type === "note" || n.type === "file" || n.type === "folder")
      .map((n) => ({
        id: n.id,
        kind: n.type === "file" ? "file" : n.type === "folder" ? "folder" : "note",
        title: nodeTitle(n),
        subtitle: n.type === "note" ? "Note" : n.type === "file" ? "File" : "Folder",
      }));
    return [...folders, ...files];
  }, [nodes, collections]);

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => i.title.toLowerCase().includes(q)) : items;

  const copyImportPrompt = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      toast.success("Prompt copied", {
        description: "Paste it into ChatGPT or Claude, then drop the result here as a note.",
      });
    } catch {
      toast.error("Couldn't copy — select and copy the prompt manually.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      {/* DOCUMENTS — the company docs, preview cards → the /doc viewer */}
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Documents</p>
      <OrgDocsList active={widgetOpen} variant="cards" className="mt-2" />

      {/* FILES — the canvas library */}
      <p className="mt-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Files</p>
      {/* Search + view toggle */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5">
          <Search className="size-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search library"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex shrink-0 items-center rounded-lg border p-0.5">
          {(["list", "grid"] as const).map((v) => {
            const Icon = v === "list" ? List : LayoutGrid;
            return (
              <button
                key={v}
                type="button"
                aria-label={v === "list" ? "List view" : "Grid view"}
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md p-1.5 transition-colors",
                  view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Import affordance — bring over ChatGPT/Claude context */}
      <button
        type="button"
        onClick={copyImportPrompt}
        className="mt-3 flex w-full items-center gap-2.5 rounded-lg border border-dashed bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted"
      >
        <ClipboardCopy className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">Bring over ChatGPT / Claude context</p>
          <p className="truncate text-xs text-muted-foreground">Copy a prompt to export your chat, then paste it back as a note.</p>
        </div>
      </button>

      {/* Items */}
      <div className="mt-4 min-h-0 flex-1">
        {!loaded ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] rounded-xl" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          view === "grid" ? (
            <div className="grid grid-cols-2 gap-2">
              {filtered.map((i) => (
                <LibCard key={i.id} item={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((i) => (
                <LibRow key={i.id} item={i} />
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {q ? "Nothing matches that." : "Your library is empty. Notes and files you add to the canvas show up here."}
          </p>
        )}
      </div>
    </div>
  );
}

function LibIcon({ kind, className }: { kind: LibItem["kind"]; className?: string }) {
  const Icon = kind === "folder" ? Folder : kind === "note" ? FileText : File;
  return <Icon className={className} />;
}

function LibRow({ item }: { item: LibItem }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm">
      <LibIcon kind={item.kind} className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-foreground">{item.title}</span>
      {item.subtitle && <span className="shrink-0 text-xs text-muted-foreground">{item.subtitle}</span>}
    </div>
  );
}

function LibCard({ item }: { item: LibItem }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm">
      <LibIcon kind={item.kind} className="size-5 text-muted-foreground" />
      <p className="line-clamp-2 min-h-0 font-medium text-foreground">{item.title}</p>
      {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
    </div>
  );
}
