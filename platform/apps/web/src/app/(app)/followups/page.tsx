import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { APEX, APEX_CHASES, APEX_CHASE_LOG, APEX_CHASE_STATS, APEX_FOLLOWUP_RULES } from "@/lib/data/fixtures/apex";
import { MODULES } from "@/lib/data/registry";
import { PageHeader } from "@/components/app/PageHeader";
import { GatedState } from "@/components/app/GatedState";
import { FollowupsClient } from "@/components/followups/FollowupsClient";

export const metadata = { title: "Follow-ups — Lead Answered" };

export default async function FollowupsPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "followups", demo);

  if (status === "coming_soon") {
    return <GatedState label="Follow-ups" promise={MODULES.followups.promise ?? ""} />;
  }

  const tz = demo ? APEX.timezone : organizationTz(organization);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Follow-ups"
        description="What Sarah's chasing, when she'll act next — and why she's silent when she is."
      />
      <FollowupsClient
        chases={APEX_CHASES}
        rules={APEX_FOLLOWUP_RULES}
        log={APEX_CHASE_LOG}
        stats={APEX_CHASE_STATS}
        timezone={tz}
      />
    </div>
  );
}
