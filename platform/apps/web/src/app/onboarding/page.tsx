import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getContractorByOwnerEmail } from "@/lib/contractors";
import { OnboardingForm, type OnboardingInitial } from "./OnboardingForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (isAdminEmail(user.email)) redirect("/admin");

  const contractor = await getContractorByOwnerEmail(user.email ?? "");
  if (!contractor) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>You're almost set</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We don't have an account linked to {user.email} yet.
          </CardContent>
        </Card>
      </main>
    );
  }

  const c = contractor as Record<string, any>;
  const initial: OnboardingInitial = {
    companyName: c.companyName,
    sarahName: c.sarahName,
    personaNotes: c.sarahPersonaNotes,
    projectTypes: c.projectTypes ?? [],
    baseLocations: c.baseLocations ?? [],
    includeOverrides: c.includeOverrides ?? [],
    excludeOverrides: c.excludeOverrides ?? [],
    requireDecisionMaker: c.qualificationRules?.requireDecisionMaker ?? true,
    slots: c.standingAvailability?.slots ?? [],
    escalationTopics: c.escalationTopics ?? [],
    recipients: (c.recipients ?? []).map((r: any) => ({
      name: r.name,
      phone: r.phone,
      email: r.email,
      subscriptions: r.subscriptions ?? [],
    })),
  };

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Set up {contractor.companyName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tell Sarah how to qualify and book your leads. You can change any of this later.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button render={<a href="/auth/signout" />} variant="ghost" size="sm">
            Sign out
          </Button>
        </div>
      </div>
      <div className="mt-6">
        <OnboardingForm initial={initial} />
      </div>
    </main>
  );
}
