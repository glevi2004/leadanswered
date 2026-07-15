import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { organizationTz, requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import {
  APEX,
  APEX_CAMPAIGNS,
  APEX_ONGOING_ASKS,
  APEX_REVIEW_FEED,
  APEX_POSTS,
  APEX_SOCIAL_POSTS,
  APEX_CHASES,
  APEX_CHASE_LOG,
  APEX_CHASE_STATS,
  APEX_FOLLOWUP_RULES,
} from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { ReviewsHome } from "@/components/reviews/ReviewsHome";
import { ContentHome } from "@/components/content/ContentHome";
import { FollowupsClient } from "@/components/followups/FollowupsClient";
import { SarahPageClient } from "../../sarah/SarahPageClient";
import { getAgentPreset } from "@/lib/workspace/agent-presets";

/**
 * Agent detail dispatch — each hired agent's own surface, reached via the Agents
 * grid or the legacy /reviews · /content · /followups redirects. Reuses the
 * existing module homes, fed the same data the old index pages did: Mature = Apex
 * fixtures, New = honest-empty. Receptionist = the Lu assistant surface.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preset = getAgentPreset(id);
  return { title: `${preset?.label ?? "Agents"} — Lead Answered` };
}

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const isNew = organization.demoProfile === "new";
  const tz = demo ? APEX.timezone : organizationTz(organization);

  switch (id) {
    case "reviews":
      return (
        <div className="flex flex-col gap-4">
          <PageHeader title="Reviews" description="Your first win — the reviews you never asked for." />
          <ReviewsHome
            campaigns={isNew ? [] : APEX_CAMPAIGNS}
            ongoing={isNew ? [] : APEX_ONGOING_ASKS}
            feed={isNew ? [] : APEX_REVIEW_FEED}
          />
        </div>
      );

    case "content": {
      const { tab } = await searchParams;
      return (
        <div className="flex flex-col gap-4">
          <PageHeader
            title="Content"
            description="Text Lu the photos — she writes the post, you say go."
            actions={
              <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <span
                  aria-hidden
                  className="flex size-4 items-center justify-center rounded-full bg-muted font-serif text-[10px] font-bold"
                >
                  f
                </span>
                Facebook — Apex Roofing
                <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              </span>
            }
          />
          <ContentHome
            posts={isNew ? [] : APEX_POSTS}
            socials={isNew ? [] : APEX_SOCIAL_POSTS}
            timezone={tz}
            defaultTab={tab}
          />
        </div>
      );
    }

    case "followups":
      return (
        <div className="flex flex-col gap-4">
          <PageHeader
            title="Follow-ups"
            description="What Lu's chasing, when she'll act next — and why she's silent when she is."
          />
          <FollowupsClient
            chases={isNew ? [] : APEX_CHASES}
            rules={isNew ? [] : APEX_FOLLOWUP_RULES}
            log={isNew ? [] : APEX_CHASE_LOG}
            stats={isNew ? { nudges30d: 0, replies30d: 0 } : APEX_CHASE_STATS}
            timezone={tz}
          />
        </div>
      );

    case "receptionist":
      return (
        <div className="flex min-h-[480px] flex-1 flex-col">
          <SarahPageClient />
        </div>
      );

    default:
      redirect("/agents");
  }
}
