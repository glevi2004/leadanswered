"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronDown, FileText, Folder, FolderOpen, Info, LayoutGrid, List, Search, Upload, X } from "lucide-react";
import { useLu } from "./lu-context";
import { useDockData, libraryFiles, libraryFolders, type LibraryFile } from "@/lib/dock/live";
import { Toolbar, type ToolbarItem } from "@/components/ds/Toolbar";
import { LibraryFolderCard } from "@/components/ds/LibraryFolderCard";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Library — ONE place for everything the company keeps: FOLDERS (General + each live department)
 * holding FILES (the docs Lu writes + generated image assets). Two views, toggled with the
 * design-system Toolbar: GRID (folder cards with file previews) · LIST (an expandable folder
 * tree). Search + import-context sit above. Honest-empty — never a fixture.
 */

const IMPORT_PROMPT =
  "Summarize everything important from our conversation so far into a single portable context document — the goals, decisions, facts, names, links, and open questions — formatted as clean Markdown I can hand to another assistant so it can pick up exactly where we left off.";

export function DockLibrary() {
  const { dockOpen } = useLu();
  const { artifacts, loaded } = useDockData(dockOpen);
  const [view, setView] = React.useState<"grid" | "list">("grid");
  const [query, setQuery] = React.useState("");
  const [importDismissed, setImportDismissed] = React.useState(false);

  const files = React.useMemo(() => libraryFiles(artifacts), [artifacts]);
  const q = query.trim().toLowerCase();
  const filtered = q ? files.filter((f) => f.name.toLowerCase().includes(q)) : files;
  const folders = React.useMemo(() => libraryFolders(filtered), [filtered]);
  // While searching, drop empty folders; otherwise show the canonical folders (honest-empty).
  const shown = q ? folders.filter((f) => f.files.length > 0) : folders;

  const copyImportPrompt = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_PROMPT);
      toast.success("Prompt copied", {
        description: "Paste it into ChatGPT or Claude, then drop the result here as a file.",
      });
    } catch {
      toast.error("Couldn't copy — select and copy the prompt manually.");
    }
  };

  const viewToggle: ToolbarItem[] = [
    { key: "grid", label: "Grid view", active: view === "grid", onClick: () => setView("grid"), render: () => <LayoutGrid className="size-4" /> },
    { key: "list", label: "List view", active: view === "list", onClick: () => setView("list"), render: () => <List className="size-4" /> },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      {/* Header — title + import + view toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <h2 className="text-xl font-semibold text-foreground">Library</h2>
          <Info className="size-3.5 shrink-0 text-muted-foreground" aria-label="Everything Lu writes and builds files here." />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="Import context"
            title="Bring over ChatGPT / Claude context"
            onClick={copyImportPrompt}
            className="gloss press grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <Upload className="size-4" />
          </button>
          <Toolbar items={viewToggle} orientation="horizontal" variant="ink" />
        </div>
      </div>

      {/* Search */}
      <div className="neu-socket mt-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search files"
          className="field-bare min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Import context card */}
      {!importDismissed && (
        <div className="neu-card mt-3 rounded-2xl bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="neu-card-in grid size-9 shrink-0 place-items-center rounded-full">
              <FileText className="size-4 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Bring over ChatGPT or Claude context</p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                Copy a prompt that turns old chats, decisions, and working preferences into import-ready Markdown.
              </p>
              <button
                type="button"
                onClick={copyImportPrompt}
                className="gloss press mt-3 rounded-lg px-3 py-1.5 text-[13px] font-medium text-foreground"
              >
                Copy prompt
              </button>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setImportDismissed(true)}
              className="press shrink-0 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mt-4 min-h-0 flex-1">
        {!loaded ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            {q ? "Nothing matches that." : "Your library is empty. Docs Lu writes and assets she builds show up here."}
          </p>
        ) : view === "grid" ? (
          <div className="space-y-3">
            {shown.map((f) => (
              <LibraryFolderCard key={f.key} label={f.label} files={f.files} onOpen={() => setView("list")} />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {shown.map((f) => (
              <FolderTree key={f.key} folder={f} defaultOpen={f.files.length > 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** One folder in the LIST view — a header row over its indented file rows. */
function FolderTree({
  folder,
  defaultOpen,
}: {
  folder: { key: string; label: string; files: LibraryFile[] };
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const FolderIcon = open ? FolderOpen : Folder;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
        <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">{folder.label}</span>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{folder.files.length}</span>
      </button>
      {open &&
        folder.files.map((file) => {
          const inner = (
            <>
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{file.name}</span>
            </>
          );
          const cls = "group flex items-center gap-2.5 rounded-lg py-1.5 pl-8 pr-2 transition-colors hover:bg-muted/50";
          return file.href ? (
            <Link key={file.id} href={file.href} className={cls}>
              {inner}
            </Link>
          ) : (
            <div key={file.id} className={cls}>
              {inner}
            </div>
          );
        })}
    </div>
  );
}
