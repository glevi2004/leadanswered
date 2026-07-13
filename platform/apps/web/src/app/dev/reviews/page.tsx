"use client";

/** DEV-ONLY visual check for the Reviews surfaces (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_CAMPAIGN, APEX_CAMPAIGNS, APEX_CAMPAIGN_TEST, APEX_ONGOING_ASKS, APEX_REVIEW_FEED, APEX_REVIEW_REQUESTS, APEX_THREAD } from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { ReviewsHome } from "@/components/reviews/ReviewsHome";
import { CampaignDetail } from "@/components/reviews/CampaignDetail";
import { ReviewsWizard } from "@/components/reviews/ReviewsWizard";

export default function DevReviews() {
  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <div className="mx-auto flex max-w-5xl flex-col gap-10 p-8">
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">/reviews home</h2>
          <div className="flex flex-col gap-4">
            <PageHeader title="Reviews" description="Your first win — the reviews you never asked for." />
                  <ReviewsHome campaigns={APEX_CAMPAIGNS} ongoing={APEX_ONGOING_ASKS} feed={APEX_REVIEW_FEED} />
          </div>
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">campaign detail</h2>
          <CampaignDetail campaign={APEX_CAMPAIGN} requests={APEX_REVIEW_REQUESTS} />
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">completed campaign detail</h2>
          <CampaignDetail campaign={APEX_CAMPAIGN_TEST} requests={[]} />
        </section>
        <section>
          <h2 className="mb-3 border-b pb-1 text-xs font-bold uppercase text-red-500">wizard</h2>
          <ReviewsWizard />
        </section>
      </div>
    </SarahProvider>
  );
}
