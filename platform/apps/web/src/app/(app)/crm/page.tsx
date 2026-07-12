import Link from "next/link";
import { Upload } from "lucide-react";
import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { listContactsMock, listContactsReal } from "@/lib/data/crm";
import { APEX } from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { CrmIndex } from "@/components/crm/CrmIndex";
import { Button } from "@/components/ui/button";

export const metadata = { title: "CRM — Lead Answered" };

export default async function CrmPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const tz = demo ? APEX.timezone : organizationTz(organization);
  const contacts = demo ? listContactsMock() : await listContactsReal(organization.id);

  // Needs-follow-up + attention markers (05-crm §2): derived from what Sarah is
  // chasing. Demo = the cast's storylines; real = quiet leads until 10 ships.
  const needsFollowupIds = demo ? ["ct_alvarez", "ct_tran"] : contacts.filter((c) => c.stage === "no_response").map((c) => c.id);
  const attentionIds = demo ? ["ct_alvarez"] : [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="CRM"
        description="Every lead and customer, organized and worked automatically."
        actions={
          <Button variant="outline" size="sm" className="gap-1.5" render={<Link href="/crm/import" />}>
            <Upload className="size-3.5" /> Import your history
          </Button>
        }
      />

      {contacts.length === 0 ? (
        <EmptyState
          title="Sarah's ready."
          body="The moment someone texts your number, misses you by phone, or fills out your site's form, they'll appear here. Or bring your history in — Sarah reads it and knows your business day one."
          askSarah
        />
      ) : (
        <CrmIndex contacts={contacts} needsFollowupIds={needsFollowupIds} attentionIds={attentionIds} timezone={tz} />
      )}
    </div>
  );
}
