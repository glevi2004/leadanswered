"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { Quote, QuoteEvent } from "@/lib/data/quotes/types";
import { deletedQuoteIds, getQuoteMock, quotesStore } from "@/lib/data/quotes";
import { createInvoiceFromQuote } from "@/lib/data/invoices";
import { formatCents, formatWhen, statusChip, statusDot } from "@/lib/dashboard-ui";
import { LineItemsEditor, LineItemsTable } from "@/components/app/LineItems";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/** 06 §2 detail: line items + status rail + customer link; actions per status. */

const EVENT_LABEL: Record<QuoteEvent["event"], string> = {
  drafted: "Drafted",
  approved: "Approved",
  sent: "Sent by text",
  resent: "Resent",
  viewed: "Viewed",
  accepted: "Accepted ✓",
  declined: "Declined",
  expired: "Expired",
  edited: "Edited",
};
const ACTOR_LABEL: Record<QuoteEvent["actor"], string> = { sarah: "by Sarah", owner: "by you", customer: "", system: "" };
const EVENT_STATUS: Record<QuoteEvent["event"], string> = {
  drafted: "draft",
  approved: "confirmed",
  sent: "sent",
  resent: "sent",
  viewed: "viewed",
  accepted: "accepted",
  declined: "declined",
  expired: "expired",
  edited: "draft",
};

export function QuoteDetail({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const [editing, setEditing] = React.useState(false);
  const [confirm, setConfirm] = React.useState<null | "send" | "accept" | "decline" | "delete">(null);

  const quote = getQuoteMock(quoteId);
  if (!quote) {
    return <EmptyState title="This quote isn't here." body="It may have been deleted — head back to Quotes." />;
  }
  const chip = statusChip(quote.status);
  // Path only for display (SSR-stable — origin differs per environment and
  // would hydration-mismatch); the copy handler resolves the full URL on click.
  const publicPath = `/q/${quote.token}`;

  const record = (patch: Partial<Quote>, event?: QuoteEvent["event"], actor: QuoteEvent["actor"] = "owner") => {
    const history = event ? [...quote.history, { at: new Date().toISOString(), event, actor }] : quote.history;
    quotesStore.patch(quote.id, { ...patch, history, updatedAt: new Date().toISOString() });
    bump();
  };

  const send = () => {
    record({ status: "sent", sentAt: new Date().toISOString() }, "sent", "system");
    setConfirm(null);
    setEditing(false);
    toast.success(`Texted the quote link to ${quote.contactName}.`, { description: `${quote.number} · ${formatCents(quote.totalCents)}` });
  };
  const markStatus = (status: "accepted" | "declined") => {
    record({ status, respondedAt: new Date().toISOString() }, status, "owner");
    setConfirm(null);
    toast.success(status === "accepted" ? "Marked accepted — nice one." : "Marked declined.");
  };
  const convert = () => {
    const inv = createInvoiceFromQuote(quote);
    quotesStore.patch(quote.id, { invoiceId: inv.id });
    toast.success(`Invoice ${inv.number} drafted from ${quote.number}.`);
    router.push(`/invoices/${inv.id}`);
  };
  const duplicate = () => {
    toast("Duplicated as a new draft.", { description: "The demo keeps one open draft — edits land there." });
    const draft = { ...quote };
    void draft;
    router.push(`/quotes/q_1044`);
  };

  const isDraft = quote.status === "draft";

  return (
    <div className="flex flex-col gap-4 pb-16 lg:pb-4">
      <div>
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Quotes
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{quote.number}</h1>
          <span className="text-sm text-muted-foreground">
            {quote.title} —{" "}
            <Link href={`/crm/${quote.contactId}`} className="underline-offset-2 hover:underline">
              {quote.contactName}
            </Link>
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</span>
        </div>
        {/* actions per status (06 §2) */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isDraft && (
            <>
              <Button size="sm" className="text-xs" onClick={() => setConfirm("send")}>
                Send by text
              </Button>
              <Button size="sm" variant="outline" className="text-xs" onClick={() => setEditing((v) => !v)}>
                {editing ? "Done editing" : "Edit"}
              </Button>
            </>
          )}
          {(quote.status === "sent" || quote.status === "viewed") && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => toast.success(`Resent to ${quote.contactName}.`, { description: "Same link, fresh text." })}
            >
              Resend
            </Button>
          )}
          {quote.status === "accepted" &&
            (quote.invoiceId ? (
              <Button size="sm" className="text-xs" nativeButton={false} render={<Link href={`/invoices/${quote.invoiceId}`} />}>
                View invoice →
              </Button>
            ) : (
              <Button size="sm" className="text-xs" onClick={convert}>
                Convert to invoice
              </Button>
            ))}
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="sm" variant="ghost" aria-label="More" className="px-1.5" />}>
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(quote.status === "sent" || quote.status === "viewed") && (
                <>
                  <DropdownMenuItem onClick={() => setConfirm("accept")}>Mark accepted</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setConfirm("decline")}>Mark declined</DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={duplicate}>Duplicate</DropdownMenuItem>
              {isDraft && (
                <DropdownMenuItem variant="destructive" onClick={() => setConfirm("delete")}>
                  Delete draft
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line items</p>
            {editing && isDraft ? (
              <LineItemsEditor
                items={quote.lineItems}
                onChange={(items) =>
                  record({ lineItems: items, totalCents: items.reduce((s, l) => s + l.totalCents, 0) })
                }
                className="mt-3"
              />
            ) : (
              <LineItemsTable items={quote.lineItems} totalCents={quote.totalCents} className="mt-2" />
            )}
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes &amp; terms</p>
            {editing && isDraft ? (
              <Textarea
                defaultValue={quote.notes}
                onBlur={(e) => record({ notes: e.target.value })}
                className="mt-2 text-sm"
                aria-label="Notes and terms"
              />
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{quote.notes ?? "—"}</p>
            )}
          </div>
        </div>

        <div className="flex h-fit flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status history</p>
            <ol className="mt-3 flex flex-col gap-2.5">
              {quote.history.map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={cn("mt-1 size-2 shrink-0 rounded-full", statusDot(EVENT_STATUS[h.event]))} />
                  <div>
                    <p className="text-sm leading-tight">
                      {EVENT_LABEL[h.event]} {ACTOR_LABEL[h.actor] && <span className="text-muted-foreground">{ACTOR_LABEL[h.actor]}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatWhen(h.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {!isDraft && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer link</p>
              <p className="mt-1.5 truncate text-xs text-muted-foreground">{publicPath}</p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => {
                    void navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
                    toast.success("Link copied.");
                  }}
                >
                  <Copy className="size-3" /> Copy link
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => window.open(`/q/${quote.token}`, "_blank", "noopener")}>
                  Preview ↗
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* confirms */}
      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "send" && `Text ${quote.contactName} the quote link?`}
              {confirm === "accept" && "Mark this quote accepted?"}
              {confirm === "decline" && "Mark this quote declined?"}
              {confirm === "delete" && "Delete this draft?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "send" &&
                `${quote.number} · ${formatCents(quote.totalCents)} — the text goes out from your line with the accept link.`}
              {(confirm === "accept" || confirm === "decline") && "For when they answered by phone — this just records it."}
              {confirm === "delete" && "Drafts delete for good; sent quotes are history and can't be."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            {confirm === "send" && (
              <Button size="sm" onClick={send}>
                Send it
              </Button>
            )}
            {confirm === "accept" && (
              <Button size="sm" onClick={() => markStatus("accepted")}>
                Mark accepted
              </Button>
            )}
            {confirm === "decline" && (
              <Button size="sm" onClick={() => markStatus("declined")}>
                Mark declined
              </Button>
            )}
            {confirm === "delete" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  deletedQuoteIds.add(quote.id);
                  toast("Draft deleted.");
                  router.push("/quotes");
                }}
              >
                Delete
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
