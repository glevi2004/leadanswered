import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SetPasswordPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome to KiwiOS</CardTitle>
          <CardDescription>
            Set a password for <strong>{user.email}</strong> to access your dashboard — your assistant
            is already set up and ready.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm cta="Set password & continue" redirectTo="/welcome" />
        </CardContent>
      </Card>
    </main>
  );
}
