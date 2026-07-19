"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, List, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLu } from "@/components/lu/lu-context";
import { renderMarkdown } from "@/components/canvas/MarkdownNote";
import { useDockData, usePublishApprovals, libraryDocs, type LibraryDoc } from "@/lib/dock/live";

/**
 * The NOTION-STYLE document viewer (docs/product.md §3 — the Library's page size): one
 * company document, full width — big title, "Last updated", a document OUTLINE built from
 * the headings (anchor-scrolls the content), and the rendered markdown at reading scale.
 * Interactions: "Ask Lu to revise" prefills the composer; a gated doc (the architecture
 * doc) shows its Approve / Request-changes gate right here. Same live artifact rows as
 * every other surface — reload-safe, revisions replace the content in place.
 */

/** Document-scale styles for the rendered markdown (the mini renderer's output). */
const DOC_CSS = `
  .lu-doc{font-size:15px;line-height:1.7;color:var(--foreground)}
  .lu-doc h1{font-size:1.6rem;font-weight:700;letter-spacing:-0.01em;margin:1.6em 0 0.5em;scroll-margin-top:5rem}
  .lu-doc h2{font-size:1.25rem;font-weight:650;letter-spacing:-0.01em;margin:1.5em 0 0.4em;scroll-margin-top:5rem}
  .lu-doc h3{font-size:1.05rem;font-weight:600;margin:1.2em 0 0.3em;scroll-margin-top:5rem}
  .lu-doc h1:first-child,.lu-doc h2:first-child{margin-top:0.4em}
  .lu-doc p{margin:0 0 0.8em}
  .lu-doc ul,.lu-doc ol{margin:0 0 0.9em;padding-left:1.4em}
  .lu-doc ul{list-style:disc}
  .lu-doc ol{list-style:decimal}
  .lu-doc li{margin:0.2em 0}
  .lu-doc a{color:var(--primary);text-decoration:underline;text-underline-offset:2px}
  .lu-doc code{background:var(--muted);border-radius:5px;padding:0.1em 0.35em;font-family:var(--font-mono,monospace);font-size:0.85em}
  .lu-doc strong{font-weight:600}
`;

interface OutlineItem {
  id: string;
  level: number;
  text: string;
}

/** Add sequential ids to rendered heading tags and return the outline that maps to them. */
function withHeadingAnchors(html: string): { html: string; outline: OutlineItem[] } {
  const outline: OutlineItem[] = [];
  let i = 0;
  const anchored = html.replace(/<h([123])>(.*?)<\/h\1>/g, (_m, lvl: string, inner: string) => {
    const id = `h-${i++}`;
    outline.push({ id, level: Number(lvl), text: inner.replace(/<[^>]+>/g, "") });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });
  return { html: anchored, outline };
}

function lastUpdated(doc: LibraryDoc): string {
  if (!doc.createdAt) return "";
  try {
    const d = new Date(doc.createdAt);
    return `Last updated ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  } catch {
    return "";
  }
}

export function DocViewer({ docId }: { docId: string }) {
  const { prefillComposer, openDock, setDockTab } = useLu();
  const { artifacts, loaded } = useDockData(true);
  const { approvals, resolve, pending } = usePublishApprovals(true);

  const docs = React.useMemo(() => libraryDocs(artifacts), [artifacts]);
  const doc = docs.find((d) => d.id === docId) ?? null;

  const { html, outline } = React.useMemo(() => {
    if (!doc) return { html: "", outline: [] as OutlineItem[] };
    return withHeadingAnchors(renderMarkdown(doc.markdown || ""));
  }, [doc]);

  // The doc gate: a pending approve_doc applies to the LATEST gated doc — show it here
  // only when THIS doc is that one, so the buttons never approve the wrong version.
  const latestGated = docs.find((d) => d.gated) ?? null;
  const docApproval =
    doc && doc.gated && latestGated?.id === doc.id
      ? (approvals.find((a) => a.action === "approve_doc") ?? null)
      : null;

  const askToRevise = () => {
    if (!doc) return;
    prefillComposer(`Revise the "${doc.title}" document: `);
    openDock();
    setDockTab("lu");
  };

  if (!loaded) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  if (!doc) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Document not found (or not yours).</p>
        <Link href="/canvas" className="mt-2 inline-block text-sm text-primary hover:underline">
          Back to the workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <style>{DOC_CSS}</style>

      {/* top bar — back · meta · actions */}
      <div className="flex flex-wrap items-center gap-3 py-1">
        <Link
          href="/canvas"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Workspace
        </Link>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {doc.typeLabel}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{lastUpdated(doc)}</span>
        <Button size="sm" variant="outline" onClick={askToRevise}>
          <Pencil className="size-3.5" /> Ask Lu to revise
        </Button>
      </div>

      {/* the doc gate, when this doc is awaiting the owner */}
      {docApproval && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] p-4">
          <p className="min-w-0 flex-1 text-sm font-medium text-foreground">
            This document is awaiting your approval — Lu builds against it once you approve.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => resolve(docApproval.id, "approved")} disabled={pending.has(docApproval.id)}>
              {pending.has(docApproval.id) ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={askToRevise} disabled={pending.has(docApproval.id)}>
              <X className="size-3.5" /> Request changes
            </Button>
          </div>
        </div>
      )}

      <div className="mt-6 flex gap-10">
        {/* the outline (desktop) — anchors into the content */}
        {outline.length > 1 && (
          <nav className="sticky top-20 hidden w-52 shrink-0 self-start lg:block">
            <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <List className="size-3.5" /> Outline
            </p>
            <ul className="mt-2 space-y-1 border-l pl-0">
              {outline.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className="block truncate border-l-2 border-transparent py-0.5 text-[13px] text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {/* the document */}
        <article className="min-w-0 flex-1 pb-24">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">{doc.title}</h1>
          {doc.sql ? (
            <pre className="mt-6 overflow-auto rounded-xl border bg-muted p-4 font-mono text-xs leading-relaxed text-muted-foreground">
              {doc.sql}
            </pre>
          ) : (
            <div className="lu-doc mt-6" dangerouslySetInnerHTML={{ __html: html }} />
          )}
        </article>
      </div>
    </div>
  );
}
