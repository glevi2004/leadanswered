import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { PageHeader } from "@/components/app/PageHeader";
import { NeedsYou } from "@/components/dashboard/NeedsYou";

function greeting(tz: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

/**
 * Dashboard home — a greeting over the cross-agent "Needs you" rollup. Honest-empty
 * by construction: it reads no lead/appointment/escalation tables, only the mock
 * agent-work rollup that fronts the Workspace canvas.
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

      {/* Cross-agent "Needs you" rollup (compiles every agent's workplace). */}
      <NeedsYou />
    </div>
  );
}
