import { notFound } from "next/navigation";
import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { ReviewsWizard } from "@/components/reviews/ReviewsWizard";

export default async function NewCampaignPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  if (resolveModuleStatus(organization, "reviews", demo) === "coming_soon") notFound();

  return (
    <div className="flex flex-col gap-4">
      <ReviewsWizard />
    </div>
  );
}
