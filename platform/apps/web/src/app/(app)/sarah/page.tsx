import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { listOpenEscalations } from "@/lib/data/home";
import { APEX_ESCALATIONS } from "@/lib/data/fixtures/apex";
import { SarahPageClient } from "./SarahPageClient";

export const metadata = { title: "Sarah — Lead Answered" };

const TABS = new Set(["chat", "activity", "approvals"]);

export default async function SarahPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const { tab } = await searchParams;
  const escalations = demo ? APEX_ESCALATIONS : await listOpenEscalations(organization.id);
  return (
    // Fills the frame's scroll area (the layout wrapper is a min-h-full flex column).
    <div className="flex min-h-[480px] flex-1 flex-col">
      <SarahPageClient defaultTab={tab && TABS.has(tab) ? tab : "chat"} escalations={escalations} />
    </div>
  );
}
