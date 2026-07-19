"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, FileText, Folder } from "lucide-react";
import { renderMarkdown } from "@/components/canvas/MarkdownNote";
import { useDockData, libraryDocs, type LibraryDoc } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The org's DOCUMENTS (docs/product.md §3 — the Library's other half): the Business Context,
 * the Architecture doc, migrations — everything Lu writes for the company,
 * pulled from the same doc artifacts every other surface reads. Docs file into FOLDERS
 * (cofounder-style): **General** (company docs) + one per live department — Engineering
 * today; sales/marketing/design/support/operations/finance/legal come with their
 * departments. Two renderings: cards-in-folders (the Library tab) · flat rows (Company).
 * Every doc clicks through to the Notion-style viewer at /doc/[id].
 */

/** The folders shown today, in order — always rendered, honest-empty when empty. */
const FOLDERS: Array<{ key: string; label: string }> = [
  { key: "general", label: "General" },
  { key: "engineering", label: "Engineering" },
];

/** A scoped mini-stylesheet for the card PREVIEW (a shrunken render of the doc). */
export const DOC_PREVIEW_CSS = `
  .lu-doc-preview{font-size:11px;line-height:1.45;color:var(--muted-foreground)}
  .lu-doc-preview h1,.lu-doc-preview h2,.lu-doc-preview h3{font-weight:600;color:var(--foreground);margin:0 0 3px}
  .lu-doc-preview h1{font-size:13px}
  .lu-doc-preview h2{font-size:12px;margin-top:8px}
  .lu-doc-preview h3{font-size:11px;margin-top:6px}
  .lu-doc-preview p{margin:0 0 5px}
  .lu-doc-preview ul,.lu-doc-preview ol{margin:0 0 5px;padding-left:16px}
  .lu-doc-preview li{margin:1px 0}
  .lu-doc-preview a{color:inherit;text-decoration:none;pointer-events:none}
  .lu-doc-preview code{font-family:var(--font-mono,monospace);font-size:10px}
  .lu-doc-preview strong{font-weight:600;color:var(--foreground)}
`;

function docDate(d: LibraryDoc): string {
  if (!d.createdAt) return "";
  try {
    return new Date(d.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

/** One preview CARD (the Library tab) — title, a shrunken live preview, date + type tag. */
function DocCard({ doc }: { doc: LibraryDoc }) {
  const html = React.useMemo(
    () => renderMarkdown(doc.sql ? `**SQL migration**\n\n\`${doc.sql.slice(0, 200)}\`` : doc.markdown),
    [doc.markdown, doc.sql],
  );
  return (
    <Link
      href={`/doc/${doc.id}`}
      className="group block overflow-hidden rounded-xl border bg-card transition-colors hover:border-ring/50"
    >
      <div className="relative h-40 overflow-hidden border-b bg-background px-4 pt-3.5">
        <p className="text-sm font-semibold text-foreground">{doc.title}</p>
        <div
          aria-hidden
          className="lu-doc-preview pointer-events-none mt-2 select-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--card)] to-transparent" />
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <FileText className="size-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground group-hover:underline">{doc.title}</p>
          {docDate(doc) && <p className="truncate text-[11px] text-muted-foreground">{docDate(doc)}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {doc.typeLabel}
        </span>
      </div>
    </Link>
  );
}

/** One compact ROW (the Company tab). */
function DocRow({ doc }: { doc: LibraryDoc }) {
  return (
    <Link
      href={`/doc/${doc.id}`}
      className="group flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2 transition-colors hover:bg-muted"
    >
      <FileText className="size-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground group-hover:underline">{doc.title}</span>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
        {doc.typeLabel}
      </span>
    </Link>
  );
}

/** One collapsible FOLDER (the Library tab) — header (name + count) over its doc cards. */
function DocFolder({ label, docs, loaded }: { label: string; docs: LibraryDoc[]; loaded: boolean }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/60"
      >
        <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
        <Folder className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{label}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {docs.length} {docs.length === 1 ? "file" : "files"}
        </span>
      </button>
      {open && (
        <div className="mt-1.5 space-y-3 pl-2">
          {docs.length > 0 ? (
            docs.map((d) => <DocCard key={d.id} doc={d} />)
          ) : (
            <p className="pb-1 pl-4 text-xs text-muted-foreground">
              {loaded ? "Empty — documents file here as Lu writes them." : "Loading…"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The documents list. `active` gates the poll (pass the surface-visible signal);
 * `variant`: "cards" (the Library tab — folders of preview cards) | "rows" (the Company
 * tab — a flat compact list). Honest-empty before the company has any docs — the
 * Business Context is the first one onboarding creates.
 */
export function OrgDocsList({
  active,
  variant = "cards",
  className,
}: {
  active: boolean;
  variant?: "cards" | "rows";
  className?: string;
}) {
  const { artifacts, loaded } = useDockData(active);
  const docs = React.useMemo(() => libraryDocs(artifacts), [artifacts]);

  if (variant === "rows") {
    if (docs.length === 0) {
      return (
        <p className={cn("text-xs text-muted-foreground", className)}>
          {loaded ? "No documents yet — Lu's docs for the company land here as she works." : "Loading documents…"}
        </p>
      );
    }
    return (
      <div className={cn("space-y-2", className)}>
        {docs.map((d) => (
          <DocRow key={d.id} doc={d} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <style>{DOC_PREVIEW_CSS}</style>
      {FOLDERS.map((f) => (
        <DocFolder key={f.key} label={f.label} loaded={loaded} docs={docs.filter((d) => d.folder === f.key)} />
      ))}
    </div>
  );
}
