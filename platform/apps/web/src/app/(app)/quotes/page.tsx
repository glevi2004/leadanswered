import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { PageHeader } from "@/components/app/PageHeader";
import { QuotesIndex } from "@/components/quotes/QuotesIndex";

export const metadata = { title: "Quotes — Lead Answered" };

/** 06-quotes: draft, send, track, accept. Preview on fixtures; teaser for real partners. */
export default async function QuotesPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "quotes", demo);

  if (status === "coming_soon") {
    return <GatedState label="Quotes" promise={MODULES.quotes.promise ?? ""} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Quotes" description="Draft and send quotes by text — “Quote the Miller job.”" />
      <QuotesIndex />
    </div>
  );
}
