import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { listSitesMock, siteStoreKey } from "@/lib/data/website";
import { PageHeader } from "@/components/app/PageHeader";
import { SitesBrowser } from "./SitesBrowser";

export const metadata = { title: "Sites — Lead Answered" };

/** Sites — every website and landing page the org runs; each opens its own builder. */
export default async function SitesPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const sites = listSitesMock(siteStoreKey(organization, demo));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Sites" description="Your websites and landing pages — every lead flows to Lu." />
      <SitesBrowser sites={sites} />
    </div>
  );
}
