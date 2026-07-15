import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULES } from "@/lib/data/registry";
import { GatedState } from "@/components/app/GatedState";
import { TeamRoster } from "@/components/team/TeamRoster";

export const metadata = { title: "Team — Lead Answered" };

/** The human roster of the company canvas — teammates grouped by the department they work with. */
export default async function TeamPage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const status = resolveModuleStatus(organization, "team", demo);

  if (status === "coming_soon") {
    return <GatedState label="Team" promise={MODULES.team.promise ?? ""} />;
  }

  // The roster of teammates sitting alongside each department's agent on the Workspace.
  // (The conversational "Lu builds your team" flow — TeamSetupPersisted — still lives in
  // the codebase and in onboarding; the Team page itself is now the roster for everyone.)
  return <TeamRoster />;
}
