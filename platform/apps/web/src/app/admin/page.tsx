import { redirect } from "next/navigation";
import { currentUser, isAdminEmail } from "@/lib/auth";
import { listContractors } from "@/lib/contractors";
import { CreateContractorForm } from "./CreateContractorForm";
import { updateContractorAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";

const badgeVariant: Record<string, "default" | "secondary" | "destructive"> = {
  verified: "default",
  pending: "secondary",
  failed: "destructive",
};

const selectCls =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none";

export default async function AdminPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!isAdminEmail(user.email)) redirect("/");

  const contractors = await listContractors();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buy + configure the number in Twilio yourself, then create the contractor here and invite
            the owner to finish their setup.
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
        <CreateContractorForm />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contractors ({contractors.length})</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {contractors.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
            {contractors.map((c) => (
              <div key={c.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.companyName}</span>
                  <Badge variant={badgeVariant[c.verificationStatus] ?? "secondary"}>
                    {c.verificationStatus}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.ownerEmail ?? <span className="text-destructive">no owner assigned</span>} · slug{" "}
                  <code className="rounded bg-muted px-1">{c.slug ?? "—"}</code> ·{" "}
                  {c.onboardingComplete ? "onboarded" : "awaiting onboarding"}
                </div>
                <form action={updateContractorAction} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <Input name="ownerEmail" type="email" defaultValue={c.ownerEmail ?? ""} placeholder="owner email" className="h-9 w-52" />
                  <Input name="twilioNumber" defaultValue={c.twilioNumber ?? ""} placeholder="+1833…" className="h-9 w-36" />
                  <select name="verificationStatus" defaultValue={c.verificationStatus} className={selectCls}>
                    <option value="pending">pending</option>
                    <option value="verified">verified</option>
                    <option value="failed">failed</option>
                  </select>
                  <Button type="submit" variant="secondary" size="sm">Save &amp; invite</Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
