"use client";

import * as React from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { renderMarkdown } from "@/components/canvas/MarkdownNote";
import { useDockData, libraryDocs, type LibraryDoc } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

/**
 * The org's DOCUMENTS (docs/product.md §3 — the Library's other half): the Business Plan,
 * the Architecture doc, decisions, migrations — everything Lu writes for the company,
 * pulled from the same doc artifacts every other surface reads. Two renderings:
 *   cards (the Library tab — cofounder-style preview cards) · rows (the Company tab).
 * Every one clicks through to the Notion-style viewer at /doc/[id].
 */

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

/**
 * The documents list. `active` gates the poll (pass the surface-visible signal);
 * `variant`: "cards" (Library tab) | "rows" (Company tab). Honest-empty before the
 * company has any docs — the Business Plan is the first one onboarding creates.
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

  if (docs.length === 0) {
    return (
      <p className={cn("text-xs text-muted-foreground", className)}>
        {loaded
          ? "No documents yet — the Business Plan lands here when Lu drafts it."
          : "Loading documents…"}
      </p>
    );
  }
  return (
    <div className={cn(variant === "cards" ? "space-y-3" : "space-y-2", className)}>
      <style>{DOC_PREVIEW_CSS}</style>
      {docs.map((d) => (variant === "cards" ? <DocCard key={d.id} doc={d} /> : <DocRow key={d.id} doc={d} />))}
    </div>
  );
}
