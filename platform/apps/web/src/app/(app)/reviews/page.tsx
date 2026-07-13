import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { APEX_CAMPAIGNS, APEX_ONGOING_ASKS, APEX_REVIEW_FEED } from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { GatedState } from "@/components/app/GatedState";
import { ReviewsHome } from "@/components/reviews/ReviewsHome";
import { MODULES } from "@/lib/data/registry";

export const metadata = { title: "Reviews — Lead Answered" };

export default async function ReviewsPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "reviews", demo);

  if (status === "coming_soon") {
    return <GatedState label="Reviews" promise={MODULES.reviews.promise ?? ""} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Reviews" description="Your first win — the reviews you never asked for." />
      <ReviewsHome campaigns={APEX_CAMPAIGNS} ongoing={APEX_ONGOING_ASKS} feed={APEX_REVIEW_FEED} />
    </div>
  );
}
