import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { QuoteDetail } from "@/components/quotes/QuoteDetail";

export const metadata = { title: "Quotes — Lead Answered" };

export default async function QuoteDetailPage({ params }: { params: Promise<{ quoteId: string }> }) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "quotes", demo);

  if (status === "coming_soon") {
    return <GatedState label="Quotes" promise={MODULES.quotes.promise ?? ""} />;
  }

  const { quoteId } = await params;
  // Lookup happens client-side (mock seam includes locally-created drafts).
  return <QuoteDetail quoteId={quoteId} />;
}
