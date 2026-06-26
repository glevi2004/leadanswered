import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ResetPasswordPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>For {user.email}.</CardDescription>
        </CardHeader>
        <CardContent>
          <SetPasswordForm cta="Update password" />
        </CardContent>
      </Card>
    </main>
  );
}
