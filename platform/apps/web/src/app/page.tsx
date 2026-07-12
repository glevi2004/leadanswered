import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationByOwnerEmail } from "@/lib/organizations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Route the visitor to the right place by role + onboarding state. */
export default async function Home() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  if (isAdminEmail(user.email)) redirect("/admin");

  const organization = await getOrganizationByOwnerEmail(user.email ?? "");
  // Onboarding is admin-led, so a signed-in organization is normally already set up. The two cards
  // below are defensive (no linked organization, or setup not finished) — never route to the wizard.
  if (!organization || !organization.onboardingComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>You're almost set</CardTitle>
            <CardDescription>
              {organization
                ? "Your KiwiOS contact is finishing your setup — you'll be up and running shortly."
                : `We don't have an account linked to ${user.email} yet. Your KiwiOS contact will get you set up shortly.`}
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

  redirect("/home");
}
