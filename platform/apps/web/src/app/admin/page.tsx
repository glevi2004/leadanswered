import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { listOrganizationsWithStatus } from "@/lib/organizations";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { WaitlistCard } from "./WaitlistCard";
import { AccountBadge, LineBadge } from "./status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminEmail(user.email)) redirect("/");

  const organizations = await listOrganizationsWithStatus();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy + configure the number in Twilio yourself, then create the organization here and invite
            the owner to finish their setup. Open a organization to edit details or resend the invite.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ThemeToggle />
          <span className="hidden sm:inline">{user.email}</span>
          <Button render={<a href="/auth/signout" />} variant="ghost" size="sm">
            Sign out
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.5fr]">
        <CreateOrganizationForm />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organizations ({organizations.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {organizations.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
            {organizations.map((c) => (
              <Link
                key={c.id}
                href={`/admin/${c.id}`}
                className="block rounded-lg border p-3 transition hover:border-ring hover:bg-accent/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.companyName}</span>
                  <div className="flex items-center gap-1.5">
                    <AccountBadge status={c.accountStatus} />
                    <LineBadge status={c.verificationStatus} />
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.ownerEmail ?? <span className="text-destructive">no owner assigned</span>} · slug{" "}
                  <code className="rounded bg-muted px-1">{c.slug ?? "—"}</code> ·{" "}
                  {c.twilioNumber ?? "no number"}
                </div>
                <span className="mt-2 inline-block text-xs font-medium text-primary">Manage →</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <WaitlistCard />
    </main>
  );
}
