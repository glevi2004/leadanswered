"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ExternalLink, FileText, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLu } from "./lu-context";
import { renderMarkdown } from "@/components/canvas/MarkdownNote";
import { DOC_PREVIEW_CSS } from "@/components/library/OrgDocs";
import { useDockData, usePublishApprovals, libraryDocs } from "@/lib/dock/live";

/**
 * The DOC gate in the thread (docs/product.md §2 — the card size of a Library document).
 * When Lu drafts a gated doc (draft_doc, docType architecture) an `approve_doc` approval
 * goes pending; this renders that doc as a card right in the conversation — preview,
 * Approve, Ask-for-changes, and the door to the full Notion-style viewer at /doc/[id].
 * Renders nothing when no doc is awaiting the owner (the Library keeps the history).
 */
export function LuDocsTracker() {
  const { dockOpen, sendMessage } = useLu();
  const surfaceActive = dockOpen;

  const { approvals, resolve, pending } = usePublishApprovals(surfaceActive);
  const docApproval = approvals.find((a) => a.action === "approve_doc") ?? null;
  const { artifacts } = useDockData(surfaceActive && docApproval !== null);
  const [editing, setEditing] = React.useState(false);
  const [feedback, setFeedback] = React.useState("");

  if (!docApproval) return null;
  const doc = libraryDocs(artifacts).find((d) => d.gated) ?? null;
  if (!doc) return null;

  const busy = pending.has(docApproval.id);
  const html = renderMarkdown(doc.markdown);

  return (
    <div className="card-lift mt-3 rounded-2xl border bg-card p-3.5 text-card-foreground shadow-xs">
      <style>{DOC_PREVIEW_CSS}</style>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <p className="truncate text-sm font-semibold">{doc.title}</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
          {doc.typeLabel}
        </span>
      </div>

      {/* shrunken preview — the full read lives in the viewer */}
      <div className="relative mt-2 max-h-44 overflow-hidden rounded-xl border bg-background px-3 py-2.5">
        <div
          aria-hidden
          className="lu-doc-preview pointer-events-none select-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--background)] to-transparent" />
      </div>
      <Link
        href={`/doc/${doc.id}`}
        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        <ExternalLink className="size-3" /> Open in the Library
      </Link>

      {editing ? (
        <div className="mt-2.5">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="What should Lu change in this doc?"
            rows={2}
            autoFocus
            className="w-full resize-none rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-ring"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              className="btn-glow h-7 gap-1 px-3"
              disabled={!feedback.trim()}
              onClick={() => {
                sendMessage(`Please revise the "${doc.title}" document: ${feedback.trim()}`);
                setEditing(false);
                setFeedback("");
              }}
            >
              <Pencil className="size-3.5" /> Send to Lu
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2.5 text-muted-foreground"
              onClick={() => {
                setEditing(false);
                setFeedback("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center gap-2">
          <Button
            size="sm"
            className="btn-glow h-7 gap-1 px-3"
            disabled={busy}
            onClick={() => resolve(docApproval.id, "approved")}
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            {busy ? "Approving…" : "Approve"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2.5"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            <Pencil className="size-3.5" /> Ask for changes…
          </Button>
        </div>
      )}
    </div>
  );
}
