import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { NewInvoiceClient } from "./NewInvoiceClient";

export const metadata = { title: "New invoice — Lead Answered" };

/** 08 compose model: "From scratch" lands you IN the composer. */
export default async function NewInvoicePage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "invoices", demo);

  if (status === "coming_soon") {
    return <GatedState label="Invoices" promise={MODULES.invoices.promise ?? ""} />;
  }

  return <NewInvoiceClient />;
}
