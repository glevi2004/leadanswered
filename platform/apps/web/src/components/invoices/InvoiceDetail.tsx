"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import type { Invoice, InvoiceEvent } from "@/lib/data/invoices/types";
import { getInvoiceMock, invoicesStore } from "@/lib/data/invoices";
import { getQuoteMock } from "@/lib/data/quotes";
import { formatCents, formatWhen, statusChip, statusDot } from "@/lib/dashboard-ui";
import { LineItemsEditor, LineItemsTable } from "@/components/app/LineItems";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** 08 §2 detail: line items · Linked card · status rail · per-status actions. */

const EVENT_LABEL: Record<InvoiceEvent["type"], string> = {
  created: "Created",
  converted: "Created from quote",
  sent: "Sent",
  viewed: "Viewed",
  reminder: "Reminder sent",
  paid: "Paid",
  voided: "Voided",
};
const EVENT_STATUS: Record<InvoiceEvent["type"], string> = {
  created: "draft",
  converted: "draft",
  sent: "sent",
  viewed: "viewed",
  reminder: "no_response",
  paid: "paid",
  voided: "void",
};

const METHODS: NonNullable<Invoice["paidMethod"]>[] = ["check", "cash", "zelle", "card", "other"];

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const [editing, setEditing] = React.useState(false);
  const [confirm, setConfirm] = React.useState<null | "send" | "paid" | "void">(null);
  const [method, setMethod] = React.useState<NonNullable<Invoice["paidMethod"]>>("check");

  const invoice = getInvoiceMock(invoiceId);
  if (!invoice) {
    return <EmptyState title="This invoice isn't here." body="Head back to Invoices." />;
  }
  const quote = invoice.quoteId ? getQuoteMock(invoice.quoteId) : null;
  const chip = statusChip(invoice.derived);
  const isDraft = invoice.derived === "draft";
  const unpaid = ["sent", "viewed", "overdue"].includes(invoice.derived);
  // Path only for display (SSR-stable); the copy handler resolves the origin on click.
  const publicPath = `/i/${invoice.token}`;

  const record = (patch: Partial<Invoice>, event?: InvoiceEvent) => {
    const history = event ? [...invoice.history, event] : invoice.history;
    invoicesStore.patch(invoice.id, { ...patch, history });
    bump();
  };

  const send = () => {
    const now = new Date();
    const due = new Date(now.getTime() + 14 * 86_400_000);
    record(
      { status: "sent", issuedAt: now.toISOString(), dueAt: due.toISOString() },
      { at: now.toISOString(), type: "sent", via: "sms" },
    );
    setConfirm(null);
    setEditing(false);
    toast.success(`Texted the pay link to ${invoice.contactName}.`, {
      description: `${invoice.number} · ${formatCents(invoice.totalCents)} · due in 14 days`,
    });
  };

  const markPaid = () => {
    record(
      { status: "paid", paidAt: new Date().toISOString(), paidMethod: method },
      { at: new Date().toISOString(), type: "paid", note: `${method} — recorded by you` },
    );
    setConfirm(null);
    toast.success(`${invoice.number} paid — ${formatCents(invoice.totalCents)}.`);
  };

  return (
    <div className="flex flex-col gap-4 pb-16 lg:pb-4">
      <div>
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Invoices
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.number}</h1>
          <span className="text-sm text-muted-foreground">
            <Link href={`/crm/${invoice.contactId}`} className="underline-offset-2 hover:underline">
              {invoice.contactName}
            </Link>
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip.chip)}>{chip.label}</span>
        </div>
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
          {unpaid && (
            <>
              <Button size="sm" className="text-xs" onClick={() => setConfirm("paid")}>
                Mark paid
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => toast.success(`Resent to ${invoice.contactName}.`)}
              >
                Resend
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() =>
                  toast("Sarah's drafting the reminder.", {
                    description: "It lands in Follow-ups for your OK before it texts out.",
                  })
                }
              >
                Remind
              </Button>
            </>
          )}
          {invoice.derived !== "void" && invoice.derived !== "paid" && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" variant="ghost" className="text-xs text-muted-foreground" />}>
                More
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem variant="destructive" onClick={() => setConfirm("void")}>
                  Void invoice
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Line items</p>
            {editing && isDraft ? (
              <LineItemsEditor
                items={invoice.lineItems}
                onChange={(items) => record({ lineItems: items, totalCents: items.reduce((s, l) => s + l.totalCents, 0) })}
                className="mt-3"
              />
            ) : (
              <LineItemsTable items={invoice.lineItems} totalCents={invoice.totalCents} className="mt-2" />
            )}
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Linked</p>
            <div className="mt-2 flex flex-col gap-1.5 text-sm">
              {quote && (
                <Link href={`/quotes/${quote.id}`} className="underline-offset-2 hover:underline">
                  Quote {quote.number} ({quote.status}) →
                </Link>
              )}
              <Link href={`/crm/${invoice.contactId}`} className="underline-offset-2 hover:underline">
                Contact: {invoice.contactName} →
              </Link>
              {!isDraft && (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="truncate text-xs">{publicPath}</span>
                  <button
                    type="button"
                    aria-label="Copy pay link"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
                      toast.success("Pay link copied.");
                    }}
                  >
                    <Copy className="size-3" />
                  </button>
                  <button
                    type="button"
                    className="text-xs underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => window.open(`/i/${invoice.token}`, "_blank", "noopener")}
                  >
                    Open ↗
                  </button>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-fit rounded-2xl border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <ol className="mt-3 flex flex-col gap-2.5">
            {[...invoice.history].reverse().map((h, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={cn("mt-1 size-2 shrink-0 rounded-full", statusDot(EVENT_STATUS[h.type]))} />
                <div>
                  <p className="text-sm leading-tight">
                    {EVENT_LABEL[h.type]}
                    {h.via === "sms" ? " (SMS)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(h.at)}
                    {h.note ? ` · ${h.note}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {invoice.dueAt && unpaid && (
            <p className="mt-3 border-t pt-2.5 text-xs text-muted-foreground">
              Due {formatWhen(invoice.dueAt)}
              {invoice.derived === "overdue" && (
                <>
                  {" — "}
                  <Link href="/followups" className="font-medium text-amber-700 underline-offset-2 hover:underline dark:text-amber-300">
                    Sarah's chasing it
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <Dialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirm === "send" && `Text ${invoice.contactName} the pay link?`}
              {confirm === "paid" && `Mark ${invoice.number} paid?`}
              {confirm === "void" && "Void this invoice?"}
            </DialogTitle>
            <DialogDescription>
              {confirm === "send" && `${formatCents(invoice.totalCents)} · due 14 days from now. Goes out from your line.`}
              {confirm === "paid" && "Record how the money arrived — Sarah stops any chase."}
              {confirm === "void" && "The pay link goes dead and the amount leaves your outstanding total."}
            </DialogDescription>
          </DialogHeader>
          {confirm === "paid" && (
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger className="w-40" aria-label="Payment method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m[0].toUpperCase() + m.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            {confirm === "send" && (
              <Button size="sm" onClick={send}>
                Send it
              </Button>
            )}
            {confirm === "paid" && (
              <Button size="sm" onClick={markPaid}>
                Mark paid
              </Button>
            )}
            {confirm === "void" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  record({ status: "void" }, { at: new Date().toISOString(), type: "voided" });
                  setConfirm(null);
                  toast(`${invoice.number} voided.`);
                }}
              >
                Void
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
