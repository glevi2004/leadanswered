import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { getSiteMock, siteStoreKey } from "@/lib/data/website";
import { WebsiteClient } from "@/components/website/WebsiteClient";

export const metadata = { title: "Site builder — Lead Answered" };

/**
 * The per-site Lovable-style takeover builder (03 §2, multi-site). Loads ONE
 * site's bundle from the mock store and hands it to the reused WebsiteClient.
 * Unknown/deleted site ids 404 back through the browse grid.
 */
export default async function SiteBuilderPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const bundle = getSiteMock(siteStoreKey(organization, demo), siteId);
  if (!bundle) notFound();

  return (
    <WebsiteClient
      site={bundle.site}
      pages={bundle.pages}
      versions={bundle.versions}
      seo={bundle.seo}
      chat={bundle.chat}
    />
  );
}
