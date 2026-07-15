"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { Quote, QuoteEvent } from "@/lib/data/quotes/types";
import { duplicateQuote, getQuoteMock, quotesStore } from "@/lib/data/quotes";
import { createInvoiceFromQuote } from "@/lib/data/invoices";
import { APEX_CHASES } from "@/lib/data/fixtures/apex";
import { formatCents, formatWhen, statusChip, statusDot } from "@/lib/dashboard-ui";
import { LineItemsTable, TotalsBlock } from "@/components/app/LineItems";
import { PhotoStrip } from "@/components/app/PhotoStrip";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
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
import { QuoteComposer } from "./QuoteComposer";
import { cn } from "@/lib/utils";

/**
 * 06 §2 detail — SENT documents only (the compose model): drafts open as the
 * composer; ink never gets a pencil. Read view + per-status actions.
 */

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
  const [confirm, setConfirm] = React.useState<null | "accept" | "decline">(null);

  const quote = getQuoteMock(quoteId);
  if (!quote) {
    return <EmptyState title="This quote isn't here." body="It may have been deleted — head back to Quotes." />;
  }
  // The compose model: a draft's natural state IS the editor.
  if (quote.status === "draft") return <QuoteComposer quoteId={quoteId} />;

  const chip = statusChip(quote.status);
  const publicPath = `/q/${quote.token}`;
  const chase = APEX_CHASES.find((c) => c.targetId === quote.id && c.status !== "resolved");

  const markStatus = (status: "accepted" | "declined") => {
    quotesStore.patch(quote.id, {
      status,
      respondedAt: new Date().toISOString(),
      history: [...quote.history, { at: new Date().toISOString(), event: status, actor: "owner" as const }],
      updatedAt: new Date().toISOString(),
    });
    bump();
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
    const draft = duplicateQuote(quote);
    toast.success(`Duplicated as ${draft.number}.`);
    router.push(`/quotes/${draft.id}`);
  };

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
            <Link href={`/customers/${quote.contactId}`} className="underline-offset-2 hover:underline">
              {quote.contactName}
            </Link>
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line items</p>
            <LineItemsTable items={quote.lineItems} className="mt-2" />
            <TotalsBlock
              subtotalCents={quote.subtotalCents}
              discountCents={quote.discountCents}
              totalCents={quote.totalCents}
              depositCents={quote.depositCents}
              className="mt-2"
            />
          </div>
          {(quote.photos?.length ?? 0) > 0 && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Job photos</p>
              <PhotoStrip photos={quote.photos!} size="sm" className="mt-3" />
            </div>
          )}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes &amp; terms</p>
            <p className="mt-2 text-sm text-muted-foreground">{quote.notes ?? "—"}</p>
          </div>
        </div>

        <div className="flex h-fit flex-col gap-4">
          {chase && (quote.status === "sent" || quote.status === "viewed") && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sarah's on it</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {chase.status === "held" && chase.holdReason
                  ? `Holding the nudge — ${chase.holdReason}`
                  : chase.nextNudgeAt
                    ? `Next nudge ${formatWhen(chase.nextNudgeAt)}${chase.deferredForHours ? " — she waits for business hours" : ""}`
                    : "Watching for a reply."}
              </p>
              <Link href="/followups" className="mt-1.5 inline-block text-xs font-medium underline-offset-2 hover:underline">
                See the chase →
              </Link>
            </div>
          )}
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status history</p>
            {quote.acceptedBy && (
              <p className="mt-2 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                Accepted by “{quote.acceptedBy}” (typed signature)
              </p>
            )}
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
              <Button size="sm" variant="ghost" className="text-xs" onClick={() => window.open(publicPath, "_blank", "noopener")}>
                Preview ↗
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</p>
            <p className="mt-2 text-sm font-medium">{quote.contactName}</p>
            <Link href={`/customers/${quote.contactId}`} className="mt-0.5 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              View in CRM →
            </Link>
          </div>
        </div>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm === "accept" ? "Mark this quote accepted?" : "Mark this quote declined?"}</DialogTitle>
            <DialogDescription>For when they answered by phone — this just records it.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => markStatus(confirm === "accept" ? "accepted" : "declined")}>
              {confirm === "accept" ? "Mark accepted" : "Mark declined"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
