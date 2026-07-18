import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationById } from "@/lib/organizations";
import { saveOrganizationAction, resendInviteAction } from "../actions";
import { AccountBadge } from "../status";
import { accountMeta } from "../status-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ManageOrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminEmail(user.email)) redirect("/");

  const { organizationId } = await params;
  const c = await getOrganizationById(organizationId);
  if (!c) notFound();

  const hasAccount = c.accountStatus === "invited" || c.accountStatus === "live"; // owner has a Supabase login

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to admin
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{c.companyName}</h1>
        <AccountBadge status={c.accountStatus} />
      </div>

      {/* Status — informational; derived from invite acceptance + the owner's own onboarding. */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">Account</p>
              <p className="text-muted-foreground">{accountMeta[c.accountStatus].hint}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Derived automatically from invite acceptance + the owner&rsquo;s own onboarding — not editable.
              </p>
            </div>
            <AccountBadge status={c.accountStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Details — Save updates fields only; it never sends an email. */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveOrganizationAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={c.id} />
            <div className="grid gap-2">
              <Label htmlFor="companyName">Company name</Label>
              <Input id="companyName" name="companyName" defaultValue={c.companyName ?? ""} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ownerEmail">Owner email</Label>
              <Input id="ownerEmail" name="ownerEmail" type="email" defaultValue={c.ownerEmail ?? ""} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="twilioNumber">Phone number (optional)</Label>
                <Input id="twilioNumber" name="twilioNumber" defaultValue={c.twilioNumber ?? ""} placeholder="+1833…" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" defaultValue={c.slug ?? ""} />
              </div>
            </div>
            <div>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Invite — the ONLY admin step (self-serve model, docs/product.md §5): the owner sets a
          password from the invite and onboards THEMSELVES with Lu in the workspace. */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Invite</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-sm text-sm text-muted-foreground">
            {!c.ownerEmail
              ? "Add an owner email above, then send the invite."
              : hasAccount
                ? "Invite already sent. Resend only if the owner needs a fresh link."
                : "Send the invite — they set a password and Lu onboards them in the workspace. Nothing else to do on your side."}
          </p>
          <form action={resendInviteAction}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="ownerEmail" value={c.ownerEmail ?? ""} />
            <Button type="submit" variant="secondary" disabled={!c.ownerEmail}>
              {hasAccount ? "Resend invite" : "Send invite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
