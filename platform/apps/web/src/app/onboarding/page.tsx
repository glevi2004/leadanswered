import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getContractorByOwnerEmail } from "@/lib/contractors";
import { initialFromContractor } from "@/lib/onboarding-state";
import { OnboardingWizard } from "./OnboardingWizard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return <OnboardingWizard initial={initialFromContractor(contractor as Record<string, any>)} />;
}
