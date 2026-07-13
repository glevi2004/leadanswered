/**
 * The branded no-auth page frame shared by /q/[token] and /i/[token] (00 §8).
 * Always light (it opens from a customer's text), org-branded, no app chrome.
 */
export function PublicDocLayout({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-100 px-4 py-10 font-sans text-zinc-900">
      <div className="mx-auto max-w-md">
        <p className="mb-4 flex items-center justify-center gap-1.5">
          <span aria-hidden className="text-base text-amber-600">▲</span>
          <span className="text-sm font-bold uppercase tracking-widest">{businessName}</span>
        </p>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">{children}</div>
        <p className="mt-4 text-center text-[11px] text-zinc-400">Sent via Lead Answered</p>
      </div>
    </div>
  );
}
