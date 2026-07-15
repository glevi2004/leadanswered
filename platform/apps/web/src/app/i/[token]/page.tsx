import type { Metadata } from "next";
import { publicInvoiceMock } from "@/lib/data/invoices";
import { formatCents } from "@/lib/dashboard-ui";
import { PublicDocLayout } from "@/components/app/PublicDocLayout";

/**
 * The customer pay page (08 §2) — public, no auth, opened from a text.
 * v1 rail: instructions-only (check/Zelle); the pay button is a placeholder
 * until a rail is chosen (08 §8 Q2). The route never reveals whether a token
 * existed. GET is side-effect-free.
 */

export const metadata: Metadata = { title: "Your invoice", robots: { index: false, follow: false } };

export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = publicInvoiceMock(token);

  if (!invoice || invoice.state === "void") {
    return (
      <PublicDocLayout businessName="Apex Roofing">
        <p className="text-center text-sm text-zinc-600">This invoice link is no longer active.</p>
      </PublicDocLayout>
    );
  }

  return (
    <PublicDocLayout businessName={invoice.businessName}>
      <p className="text-sm font-semibold">
        Invoice {invoice.invoiceNumber} for {invoice.contactFirstName}
      </p>

      <div className="mt-4 divide-y divide-zinc-100">
        {invoice.lineItems.map((item, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-2">
            <span className="text-sm text-zinc-700">{item.description}</span>
            <span className="shrink-0 text-sm tabular-nums text-zinc-900">{formatCents(item.totalCents)}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-zinc-200 pt-3">
        <div className="flex items-center justify-between py-0.5">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-sm font-semibold tabular-nums">{formatCents(invoice.totalCents)}</span>
        </div>
        {invoice.paidCents > 0 && (
          <>
            <div className="flex items-center justify-between py-0.5 text-sm text-zinc-500">
              <span>Already paid</span>
              <span className="tabular-nums">−{formatCents(invoice.paidCents)}</span>
            </div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-sm font-bold">Balance due</span>
              <span className="text-base font-bold tabular-nums">{formatCents(invoice.balanceCents)}</span>
            </div>
          </>
        )}
      </div>
      {invoice.dueAt && invoice.state === "open" && (
        <p className="mt-1 text-xs text-zinc-500">
          Due {new Date(invoice.dueAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
        </p>
      )}

      {invoice.state === "paid" ? (
        <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-800">Paid — thank you ✓</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2.5">
          <div className="w-full rounded-xl bg-zinc-100 py-3.5 text-center text-sm font-semibold text-zinc-400">
            Card payments coming soon
          </div>
          {invoice.payInstructions && (
            <p className="text-xs leading-relaxed text-zinc-600">
              <span className="font-semibold text-zinc-700">How to pay: </span>
              {invoice.payInstructions}
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-center text-xs text-zinc-500">
        Questions?{" "}
        <a href={`sms:${invoice.businessPhone.replace(/[^+\d]/g, "")}`} className="font-medium text-zinc-700 underline-offset-2 hover:underline">
          Text {invoice.businessPhone}
        </a>
      </p>
    </PublicDocLayout>
  );
}
