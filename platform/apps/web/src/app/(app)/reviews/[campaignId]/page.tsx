import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { APEX_CAMPAIGNS, APEX_REVIEW_REQUESTS } from "@/lib/data/fixtures/apex";
import { CampaignDetail } from "@/components/reviews/CampaignDetail";
import { LocalCampaignDetail } from "@/components/reviews/LocalCampaignDetail";

export default async function CampaignPage({ params }: { params: Promise<{ campaignId: string }> }) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const { campaignId } = await params;
  if (resolveModuleStatus(organization, "reviews", demo) === "coming_soon") notFound();
  const fixture = APEX_CAMPAIGNS.find((c) => c.id === campaignId);
  // wizard-launched campaigns live client-side (localStorage seam) — the bridge resolves them
  if (!fixture && !campaignId.startsWith("camp_local_")) notFound();

  return (
    <div className="flex flex-col gap-4">
      {fixture ? (
        <CampaignDetail campaign={fixture} requests={fixture.id === "camp_react_1" ? APEX_REVIEW_REQUESTS : []} />
      ) : (
        <LocalCampaignDetail campaignId={campaignId} />
      )}
    </div>
  );
}
