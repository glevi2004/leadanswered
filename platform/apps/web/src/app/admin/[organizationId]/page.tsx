import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { getOrganizationById } from "@/lib/organizations";
import { saveOrganizationAction, resendInviteAction } from "../actions";
import { AccountBadge, LineBadge } from "../status";
import { accountMeta } from "../status-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectCls =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none";

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

  const onboarded = Boolean(c.onboardingComplete);
  const hasAccount = c.accountStatus === "invited" || c.accountStatus === "live"; // owner has a Supabase login

  return (
    <main className="mx-auto max-w-2xl p-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to admin
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{c.companyName}</h1>
        <AccountBadge status={c.accountStatus} />
        <LineBadge status={c.verificationStatus} />
      </div>

      {/* Status panel — both statuses are informational; neither gates the agent. */}
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
                Derived automatically from invite acceptance + onboarding — not editable.
              </p>
            </div>
            <AccountBadge status={c.accountStatus} />
          </div>
          <div className="flex items-start justify-between gap-4 border-t pt-3">
            <div>
              <p className="font-medium">Line — Twilio toll-free verification</p>
              <p className="text-muted-foreground">
                Set manually to mirror Twilio. Informational; it doesn't gate Sarah's texting.
              </p>
            </div>
            <LineBadge status={c.verificationStatus} />
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
                <Label htmlFor="twilioNumber">Twilio number</Label>
                <Input id="twilioNumber" name="twilioNumber" defaultValue={c.twilioNumber ?? ""} placeholder="+1833…" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Lead-email slug</Label>
                <Input id="slug" name="slug" defaultValue={c.slug ?? ""} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="verificationStatus">Line verification (Twilio toll-free)</Label>
              <select id="verificationStatus" name="verificationStatus" defaultValue={c.verificationStatus} className={selectCls}>
                <option value="pending">pending</option>
                <option value="verified">verified</option>
                <option value="failed">failed</option>
              </select>
            </div>
            <div>
              <Button type="submit">Save changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Invite — normally sent automatically on onboarding finish; this is manual send/resend. */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Invite</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-sm text-sm text-muted-foreground">
            {!onboarded
              ? "The invite is sent automatically when you finish onboarding — onboard them first."
              : hasAccount
                ? "Invite already sent. Resend only if the owner needs a fresh link."
                : "Onboarded, but the invite hasn't gone out yet — send it now."}
          </p>
          <form action={resendInviteAction}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="ownerEmail" value={c.ownerEmail ?? ""} />
            <Button type="submit" variant="secondary" disabled={!c.ownerEmail || !onboarded}>
              {hasAccount ? "Resend invite" : "Send invite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
