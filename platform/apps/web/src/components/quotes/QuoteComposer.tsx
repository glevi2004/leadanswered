"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Quote } from "@/lib/data/quotes/types";
import { deletedQuoteIds, getQuoteMock, quotesStore } from "@/lib/data/quotes";
import { APEX_CONTACTS } from "@/lib/data/fixtures/apex";
import { formatCents } from "@/lib/dashboard-ui";
import { LineItemsEditor, MoneyInput, TotalsBlock } from "@/components/app/LineItems";
import { PhotoStrip } from "@/components/app/PhotoStrip";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The compose surface (06 compose model): a draft's natural state IS this
 * editor — everything live, running total in a sticky footer, [Send by text]
 * primary. Drafts are a byproduct: edits write through to the mock store, so
 * leaving loses nothing. No Edit toggle exists anywhere.
 */

const PICKER_CONTACTS = APEX_CONTACTS.filter((c) => !c.id.startsWith("ct_imp_") || ["ct_imp_0", "ct_imp_1"].includes(c.id));
// Base UI resolves selected-item labels from `items` (the popup isn't mounted until opened).
const CONTACT_ITEMS = Object.fromEntries(PICKER_CONTACTS.map((c) => [c.id, c.name]));

export function QuoteComposer({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const [confirmSend, setConfirmSend] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const quote = getQuoteMock(quoteId);
  if (!quote || quote.status !== "draft") {
    return <EmptyState title="This draft isn't here." body="It may have been sent or deleted — head back to Quotes." />;
  }

  const patch = (p: Partial<Quote>) => {
    quotesStore.patch(quote.id, { ...p, updatedAt: new Date().toISOString() });
    bump();
  };
  const recompute = (p: { lineItems?: Quote["lineItems"]; discountCents?: number; depositCents?: number }) => {
    const items = p.lineItems ?? quote.lineItems;
    const discount = p.discountCents ?? quote.discountCents ?? 0;
    const subtotal = items.filter((l) => !l.optional).reduce((s, l) => s + l.totalCents, 0);
    patch({ ...p, subtotalCents: subtotal, totalCents: Math.max(0, subtotal - discount) });
  };

  const contactName = APEX_CONTACTS.find((c) => c.id === quote.contactId)?.name;
  const hasPricedWork = quote.lineItems.some((l) => !l.optional && l.description.trim() && l.totalCents > 0);
  const canSend = Boolean(quote.contactId) && hasPricedWork;
  const missing = !quote.contactId ? "pick who it's for" : !hasPricedWork ? "add at least one priced line item" : null;

  const send = () => {
    quotesStore.patch(quote.id, {
      status: "sent",
      sentAt: new Date().toISOString(),
      history: [...quote.history, { at: new Date().toISOString(), event: "sent" as const, actor: "system" as const }],
      updatedAt: new Date().toISOString(),
    });
    setConfirmSend(false);
    toast.success(`Texted the quote link to ${contactName}.`, { description: `${quote.number} · ${formatCents(quote.totalCents)}` });
    router.push(`/quotes/${quote.id}`);
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <Link
          href="/quotes"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Quotes
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{quote.number}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Draft</span>
          {quote.source === "sarah" && (
            <span className="text-xs text-muted-foreground">Drafted by Sarah — review and send.</span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">For</p>
            <Select items={CONTACT_ITEMS} value={quote.contactId || undefined} onValueChange={(v) => v && patch({ contactId: v })}>
              <SelectTrigger aria-label="Contact">
                <SelectValue placeholder="Who's this quote for?" />
              </SelectTrigger>
              <SelectContent>
                {PICKER_CONTACTS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">The job</p>
            <Input
              value={quote.title === "New quote" ? "" : quote.title}
              onChange={(e) => patch({ title: e.target.value || "New quote" })}
              placeholder="e.g. “Roof replacement — 41 Birch St”"
              aria-label="Quote title"
            />
          </div>
        </div>

        <p className="mb-1.5 mt-5 text-xs font-medium text-muted-foreground">Line items</p>
        <LineItemsEditor items={quote.lineItems} onChange={(items) => recompute({ lineItems: items })} autoFocusFirst />

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3.5">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Discount
            <MoneyInput cents={quote.discountCents ?? 0} onChange={(c) => recompute({ discountCents: c })} className="w-28" aria-label="Discount" />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Deposit on acceptance
            <MoneyInput cents={quote.depositCents ?? 0} onChange={(c) => recompute({ depositCents: c })} className="w-28" aria-label="Deposit" />
          </label>
        </div>
        <TotalsBlock
          subtotalCents={quote.subtotalCents}
          discountCents={quote.discountCents}
          totalCents={quote.totalCents}
          depositCents={quote.depositCents}
          className="mt-3"
        />

        <p className="mb-1.5 mt-5 text-xs font-medium text-muted-foreground">Notes &amp; terms</p>
        <Textarea
          defaultValue={quote.notes}
          onBlur={(e) => patch({ notes: e.target.value })}
          placeholder="Deposit terms, exclusions, how long the price holds…"
          aria-label="Notes and terms"
          className="text-sm"
        />

        {(quote.photos?.length ?? 0) > 0 && (
          <>
            <p className="mb-1.5 mt-5 text-xs font-medium text-muted-foreground">Job photos</p>
            <PhotoStrip photos={quote.photos!} size="sm" />
          </>
        )}
      </div>

      {/* sticky compose footer: the running total + the one exit action */}
      <div className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg md:inset-x-auto md:left-1/2 md:w-[min(680px,90vw)] md:-translate-x-1/2">
        <button
          type="button"
          aria-label="Delete draft"
          title="Delete draft"
          onClick={() => setConfirmDelete(true)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="size-4" />
        </button>
        <span className="ml-1 text-sm text-muted-foreground">
          Total <span className="font-semibold text-foreground">{formatCents(quote.totalCents)}</span>
        </span>
        {!canSend && missing && <span className="hidden text-xs text-muted-foreground sm:inline">— {missing} to send</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={() => {
              toast("Saved as a draft — it'll be here when you're back.");
              router.push("/quotes");
            }}
          >
            Save draft
          </Button>
          <Button size="sm" disabled={!canSend} title={missing ?? undefined} onClick={() => setConfirmSend(true)}>
            Send by text
          </Button>
        </div>
      </div>

      <Dialog open={confirmSend} onOpenChange={setConfirmSend}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Text {contactName} the quote link?</DialogTitle>
            <DialogDescription>
              {quote.number} · {formatCents(quote.totalCents)}
              {(quote.depositCents ?? 0) > 0 ? ` · ${formatCents(quote.depositCents!)} deposit on acceptance` : ""} — goes out
              from your line with the accept link.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmSend(false)}>
              Not yet
            </Button>
            <Button size="sm" onClick={send}>
              Send it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this draft?</DialogTitle>
            <DialogDescription>Drafts delete for good; sent quotes are history and can't be.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
              Keep it
            </Button>
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
