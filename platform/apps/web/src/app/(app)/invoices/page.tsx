import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { PageHeader } from "@/components/app/PageHeader";
import { InvoicesIndex } from "@/components/invoices/InvoicesIndex";

export const metadata = { title: "Invoices — Lead Answered" };

/** 08-invoices: who owes me money. Preview on fixtures; teaser for real partners. */
export default async function InvoicesPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "invoices", demo);

  if (status === "coming_soon") {
    return <GatedState label="Invoices" promise={MODULES.invoices.promise ?? ""} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Invoices" description="Send and track invoices by text — and see who owes you money." />
      <InvoicesIndex />
    </div>
  );
}
