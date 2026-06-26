import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getContractorByOwnerEmail } from "@/lib/contractors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

const verifyCopy: Record<string, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  verified: { text: "Verified", variant: "default" },
  pending: { text: "Verifying — your line is live and sending", variant: "secondary" },
  failed: { text: "Verification needs attention", variant: "destructive" },
};

export default async function StatusPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (isAdminEmail(user.email)) redirect("/admin");

  const contractor = await getContractorByOwnerEmail(user.email ?? "");
  if (!contractor) redirect("/onboarding");
  if (!contractor.onboardingComplete) redirect("/onboarding");

  const v = verifyCopy[contractor.verificationStatus] ?? verifyCopy.pending;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">{contractor.companyName}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Your line is live 🎉</h1>
      </div>

      <Card className="w-full max-w-md text-center">
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Your dedicated number</p>
          <p className="text-3xl font-semibold tracking-tight">{contractor.twilioNumber ?? "—"}</p>
          <Badge variant={v.variant}>{v.text}</Badge>
        </CardContent>
      </Card>

      <p className="max-w-md text-center text-sm text-muted-foreground">
        Sarah is answering and booking your leads. We'll text your team the moment a lead qualifies or
        books.
      </p>

      <div className="flex items-center gap-3">
        <Button render={<a href="/onboarding" />} variant="outline" size="sm">
          Edit your setup
        </Button>
        <Button render={<a href="/auth/signout" />} variant="ghost" size="sm">
          Sign out
        </Button>
      </div>
    </main>
  );
}
