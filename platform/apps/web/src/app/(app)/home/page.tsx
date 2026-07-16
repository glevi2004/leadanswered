import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { PageHeader } from "@/components/app/PageHeader";
import { NeedsYou } from "@/components/dashboard/NeedsYou";
import { EngineeringHome } from "./EngineeringHome";
import { loadEngineeringHome } from "@/lib/dashboard/engineering-home";

function greeting(tz: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/**
 * Dashboard home — a greeting over the "Needs you" rollup.
 *
 * REAL orgs see ONLY the Engineering agent, sourced from the org's real tasks / approvals /
 * sites off the dock seam (`loadEngineeringHome`). Honest-empty when the Engineer has no
 * work — never the old Apex fixtures. DEMO mode (the mature Apex profile / `la_demo`) is the
 * ONLY place the mock multi-agent rollup (`NeedsYou` → agent-work fixtures) renders.
 */
export default async function HomePage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const tz = organizationTz(organization);
  const ownerFirst = (organization.name as string)?.split(" ")[0] ?? "";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title={
          <>
            {greeting(tz)}, <span className="text-gradient-green">{ownerFirst}</span>
          </>
        }
        description="Here's where things stand."
      />

      {demo ? (
        /* Demo (Apex): the living multi-agent company rollup — fixtures, demo-only. */
        <NeedsYou />
      ) : (
        /* Real org: only the Engineering agent, driven by the real dock proxies. */
        <EngineeringHome data={await loadEngineeringHome(organization.id as string)} />
      )}
    </div>
  );
}
