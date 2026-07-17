import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { PageHeader } from "@/components/app/PageHeader";
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
 * The org sees ONLY the Engineering agent, sourced from the org's real tasks / approvals /
 * sites off the dock seam (`loadEngineeringHome`). Honest-empty when the Engineer has no work.
 */
export default async function HomePage() {
  const organization = await requireOrganization();
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

      {/* Only the Engineering agent, driven by the real dock proxies. */}
      <EngineeringHome data={await loadEngineeringHome(organization.id as string)} />
    </div>
  );
}
