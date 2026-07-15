import Link from "next/link";
import { requireOrganization } from "@/lib/dashboard-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * First-login welcome for a freshly-invited organization. They're already configured (admin-led
 * onboarding), so this is a warm orientation, not a setup step. Reached right after set-password.
 */
export default async function WelcomePage() {
  const organization = await requireOrganization();
  const sarah = organization.sarahName || "Sarah";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Lead Answered</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
          <p className="text-center">
            You're all set, <strong className="text-foreground">{organization.companyName}</strong>.{" "}
            {sarah} — your AI assistant — is live and ready to text your leads back in seconds:
            qualifying them, booking estimates, and looping you in.
          </p>
          <ul className="mx-auto flex max-w-sm flex-col gap-2">
            <li>
              • <strong className="text-foreground">Overview</strong> — leads, bookings, and what{" "}
              {sarah}'s been up to.
            </li>
            <li>
              • <strong className="text-foreground">Leads</strong> — every conversation, start to finish.
            </li>
            <li>
              • <strong className="text-foreground">Settings</strong> — tweak your info, hours, and
              notifications anytime.
            </li>
          </ul>
          <Button nativeButton={false} render={<Link href="/home" />} className="mx-auto">
            Go to my dashboard
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
