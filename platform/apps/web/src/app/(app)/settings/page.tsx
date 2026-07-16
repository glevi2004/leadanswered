import { requireOrganization } from "@/lib/dashboard-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Settings — pared back to the essentials while the department-level config moves
 * onto the Workspace canvas. For now it just reflects the organization identity;
 * the old lead-qualification / service-area / calendar config was retired with the
 * legacy dashboard surfaces.
 */
export default async function SettingsPage() {
  const organization = await requireOrganization();
  const companyName = (organization.companyName as string) || (organization.name as string) || "Your organization";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{companyName}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask Lu to change anything about how your departments run.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
