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
          <CardTitle className="text-2xl">Welcome to Lu Computer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 text-sm text-muted-foreground">
          <p className="text-center">
            You're all set, <strong className="text-foreground">{organization.companyName}</strong>.{" "}
            {sarah} — your AI cofounder — is ready: tell her a goal and she plans it, gets it built,
            and brings you the result to approve.
          </p>
          <ul className="mx-auto flex max-w-sm flex-col gap-2">
            <li>
              • <strong className="text-foreground">Workspace</strong> — the canvas: {sarah}, your
              agents, and everything they build.
            </li>
            <li>
              • <strong className="text-foreground">The dock</strong> — talk to {sarah}, approve
              plans and publishes, watch builds live.
            </li>
            <li>
              • <strong className="text-foreground">Settings</strong> — connect your GitHub, Vercel,
              and Supabase so builds land in your own accounts.
            </li>
          </ul>
          <Button nativeButton={false} render={<Link href="/canvas" />} className="mx-auto">
            Open my workspace
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
