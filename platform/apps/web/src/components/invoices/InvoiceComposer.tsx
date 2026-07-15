"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Invoice } from "@/lib/data/invoices/types";
import { getInvoiceMock, invoicesStore, paidCentsOf } from "@/lib/data/invoices";
import { getQuoteMock } from "@/lib/data/quotes";
import { APEX_CONTACTS } from "@/lib/data/fixtures/apex";
import { formatCents } from "@/lib/dashboard-ui";
import { LineItemsEditor, MoneyInput, TotalsBlock } from "@/components/app/LineItems";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The invoice compose surface (08, compose model). From-a-quote drafts arrive
 * PRE-FILLED (line items, deposit applied, terms defaulted) — you're
 * confirming, not composing. Drafts open here; only sent invoices get the
 * read-only detail.
 */

const PICKER_CONTACTS = APEX_CONTACTS.filter((c) => !c.id.startsWith("ct_imp_") || ["ct_imp_0", "ct_imp_1"].includes(c.id));
// Base UI resolves selected-item labels from `items` (the popup isn't mounted until opened).
const CONTACT_ITEMS = Object.fromEntries(PICKER_CONTACTS.map((c) => [c.id, c.name]));
const NET_TERMS = [7, 14, 30] as const;
const TERM_ITEMS = Object.fromEntries(NET_TERMS.map((d) => [String(d), `${d} days after sending`]));

export function InvoiceComposer({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const [confirmSend, setConfirmSend] = React.useState(false);
  const [netDays, setNetDays] = React.useState<number>(14);

  const invoice = getInvoiceMock(invoiceId);
  if (!invoice || invoice.derived !== "draft") {
    return <EmptyState title="This draft isn't here." body="It may have been sent — head back to Invoices." />;
  }
  const quote = invoice.quoteId ? getQuoteMock(invoice.quoteId) : null;
  const paidCents = paidCentsOf(invoice);

  const patch = (p: Partial<Invoice>) => {
    invoicesStore.patch(invoice.id, p);
    bump();
  };
  const recompute = (p: { lineItems?: Invoice["lineItems"]; discountCents?: number }) => {
    const items = p.lineItems ?? invoice.lineItems;
    const discount = p.discountCents ?? invoice.discountCents ?? 0;
    const subtotal = items.filter((l) => !l.optional).reduce((s, l) => s + l.totalCents, 0);
    patch({ ...p, subtotalCents: subtotal, totalCents: Math.max(0, subtotal - discount) });
  };

  const contactName = APEX_CONTACTS.find((c) => c.id === invoice.contactId)?.name;
  const hasPricedWork = invoice.lineItems.some((l) => l.description.trim() && l.totalCents > 0);
  const canSend = Boolean(invoice.contactId) && hasPricedWork;
  const missing = !invoice.contactId ? "pick the customer" : !hasPricedWork ? "add at least one priced line item" : null;
  const balance = Math.max(0, invoice.totalCents - paidCents);

  const send = () => {
    const now = new Date();
    const due = new Date(now.getTime() + netDays * 86_400_000);
    invoicesStore.patch(invoice.id, {
      status: "sent",
      issuedAt: now.toISOString(),
      dueAt: due.toISOString(),
      history: [...invoice.history, { at: now.toISOString(), type: "sent" as const, via: "sms" as const }],
    });
    setConfirmSend(false);
    toast.success(`Texted the pay link to ${contactName}.`, {
      description: `${invoice.number} · ${formatCents(balance)} due in ${netDays} days`,
    });
    router.push(`/invoices/${invoice.id}`);
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Invoices
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.number}</h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Draft</span>
          {quote && (
            <span className="text-xs text-muted-foreground">
              From quote{" "}
              <Link href={`/quotes/${quote.id}`} className="underline-offset-2 hover:underline">
                {quote.number}
              </Link>{" "}
              — everything carried over; look it over and send.
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Customer</p>
            {quote ? (
              <p className="flex h-9 items-center text-sm font-medium">{contactName}</p>
            ) : (
              <Select items={CONTACT_ITEMS} value={invoice.contactId || undefined} onValueChange={(v) => v && patch({ contactId: v })}>
                <SelectTrigger aria-label="Customer">
                  <SelectValue placeholder="Who's this invoice for?" />
                </SelectTrigger>
                <SelectContent>
                  {PICKER_CONTACTS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Due</p>
            <Select items={TERM_ITEMS} value={String(netDays)} onValueChange={(v) => v && setNetDays(Number(v))}>
              <SelectTrigger aria-label="Payment terms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NET_TERMS.map((d) => (
                  <SelectItem key={d} value={String(d)}>
                    {d} days after sending
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mb-1.5 mt-5 text-xs font-medium text-muted-foreground">Line items</p>
        <LineItemsEditor items={invoice.lineItems} onChange={(items) => recompute({ lineItems: items })} autoFocusFirst={!quote} />

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3.5">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Discount
            <MoneyInput cents={invoice.discountCents ?? 0} onChange={(c) => recompute({ discountCents: c })} className="w-28" aria-label="Discount" />
          </label>
        </div>
        <TotalsBlock
          subtotalCents={invoice.subtotalCents}
          discountCents={invoice.discountCents}
          totalCents={invoice.totalCents}
          paidCents={paidCents > 0 ? paidCents : undefined}
          className="mt-3"
        />
        {paidCents > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            The {formatCents(paidCents)} deposit from {quote?.number ?? "the quote"} is already applied — the text asks for the
            balance.
          </p>
        )}
      </div>

      {/* sticky compose footer */}
      <div className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border bg-card p-3 shadow-lg md:inset-x-auto md:left-1/2 md:w-[min(680px,90vw)] md:-translate-x-1/2">
        <button
          type="button"
          aria-label="Delete draft"
          title="Delete draft"
          onClick={() => {
            invoicesStore.patch(invoice.id, { status: "void" });
            toast("Draft discarded.");
            router.push("/invoices");
          }}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Trash2 className="size-4" />
        </button>
        <span className="ml-1 text-sm text-muted-foreground">
          {paidCents > 0 ? "Balance" : "Total"} <span className="font-semibold text-foreground">{formatCents(balance)}</span>
        </span>
        {!canSend && missing && <span className="hidden text-xs text-muted-foreground sm:inline">— {missing} to send</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground"
            onClick={() => {
              toast("Saved as a draft — it'll be here when you're back.");
              router.push("/invoices");
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
            <DialogTitle>Text {contactName} the pay link?</DialogTitle>
            <DialogDescription>
              {invoice.number} · {formatCents(balance)} due {netDays} days from now — goes out from your line.
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
    </div>
  );
}
