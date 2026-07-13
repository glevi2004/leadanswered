import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { InvoiceDetail } from "@/components/invoices/InvoiceDetail";

export const metadata = { title: "Invoices — Lead Answered" };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "invoices", demo);

  if (status === "coming_soon") {
    return <GatedState label="Invoices" promise={MODULES.invoices.promise ?? ""} />;
  }

  const { invoiceId } = await params;
  // Lookup happens client-side (mock seam includes converted drafts).
  return <InvoiceDetail invoiceId={invoiceId} />;
}
