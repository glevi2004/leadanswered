import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { NewQuoteClient } from "./NewQuoteClient";

export const metadata = { title: "New quote — Lead Answered" };

/** 06 compose model: "New quote" lands you IN the composer, not on a blank record. */
export default async function NewQuotePage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "quotes", demo);

  if (status === "coming_soon") {
    return <GatedState label="Quotes" promise={MODULES.quotes.promise ?? ""} />;
  }

  return <NewQuoteClient />;
}
