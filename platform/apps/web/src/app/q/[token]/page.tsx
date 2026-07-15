import type { Metadata } from "next";
import { publicQuoteMock } from "@/lib/data/quotes";
import { formatCents } from "@/lib/dashboard-ui";
import { PublicDocLayout } from "@/components/app/PublicDocLayout";
import { PhotoStrip } from "@/components/app/PhotoStrip";
import { AcceptQuote } from "./AcceptQuote";

/**
 * The customer accept page (06 §2) — public, no auth, opened from a text.
 * Mobile-first; never a raw 404, never the app's sign-in. GET is side-effect-free.
 */

export const metadata: Metadata = { title: "Your quote", robots: { index: false, follow: false } };

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = publicQuoteMock(token);

  if (!quote) {
    return (
      <PublicDocLayout businessName="Apex Roofing">
        <p className="text-center text-sm text-zinc-600">
          This quote link isn't active — text us and we'll send a fresh one.
        </p>
      </PublicDocLayout>
    );
  }

  const expired = quote.status === "expired";

  return (
    <PublicDocLayout businessName={quote.businessName}>
      <p className="text-sm font-semibold">Quote for {quote.contactFirstName}</p>
      <p className="text-sm text-zinc-500">{quote.title}</p>

      {(quote.photos?.length ?? 0) > 0 && !expired && (
        <PhotoStrip photos={quote.photos!} size="sm" className="mt-3" />
      )}

      {expired ? (
        <>
          <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-center">
            <p className="text-sm text-zinc-600">This quote has expired — text us for an updated price.</p>
          </div>
          <a
            href={`sms:${quote.businessPhone.replace(/[^+\d]/g, "")}`}
            className="mt-3 block w-full rounded-xl border border-zinc-300 py-3 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            💬 Text us for an updated price
          </a>
        </>
      ) : quote.status === "accepted" ? (
        <>
          <div className="mt-4 divide-y divide-zinc-100">
            {quote.lineItems
              .filter((l) => !l.optional)
              .map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 py-2">
                  <span className="text-sm text-zinc-700">{item.description}</span>
                  <span className="shrink-0 text-sm tabular-nums text-zinc-900">{formatCents(item.totalCents)}</span>
                </div>
              ))}
          </div>
          <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
            <span className="text-sm font-bold">Total</span>
            <span className="text-base font-bold tabular-nums">{formatCents(quote.totalCents)}</span>
          </div>
          <div className="mt-4">
            <AcceptQuote quote={quote} />
          </div>
        </>
      ) : (
        <div className="mt-4">
          <AcceptQuote quote={quote} />
        </div>
      )}
    </PublicDocLayout>
  );
}
