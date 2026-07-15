import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
        <p className="mt-1 text-sm text-muted-foreground">Change how Lu qualifies and books your leads.</p>
      </div>

      {/* the availability editor moved to Schedule (07-schedule §2) — this is the promised cross-link */}
      <p className="text-sm text-muted-foreground">
        Looking for your hours?{" "}
        <Link href="/schedule?tab=availability" className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-2 hover:underline">
          Availability lives in Schedule <ArrowRight className="size-3.5" />
        </Link>
      </p>
      <CalendarCard />
      <SettingsForm initial={initialFromOrganization(organization)} />
    </div>
  );
}
