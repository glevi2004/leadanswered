import { requireOrganization } from "@/lib/dashboard-auth";
import { initialFromOrganization } from "@/lib/onboarding-state";
import { SettingsForm } from "./SettingsForm";
import { CalendarCard } from "./CalendarCard";

export default async function SettingsPage() {
  const organization = await requireOrganization();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Change how Sarah qualifies and books your leads.</p>
      </div>
      <CalendarCard />
      <SettingsForm initial={initialFromOrganization(organization)} />
    </div>
  );
}
