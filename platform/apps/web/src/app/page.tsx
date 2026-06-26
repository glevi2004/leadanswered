import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getContractorByOwnerEmail } from "@/lib/contractors";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Route the visitor to the right place by role + onboarding state. */
export default async function Home() {
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
            <CardDescription>
              We don't have an account linked to {user.email} yet. Your Lead Answered contact will get
              you set up shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/auth/signout" className="text-sm text-primary hover:underline">
              Sign out
            </a>
          </CardContent>
        </Card>
      </main>
    );
  }

  redirect(contractor.onboardingComplete ? "/status" : "/onboarding");
}
