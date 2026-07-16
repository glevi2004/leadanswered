import { WaitlistForm } from "./WaitlistForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Join the waitlist — Lu Computer",
  description: "Lu Computer is invite-only. Join the waitlist and we'll reach out when a spot opens.",
};

export default function WaitlistPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Join the waitlist</CardTitle>
          <CardDescription>
            Lu Computer is invite-only while we onboard companies one at a time. Leave your details and
            we&apos;ll reach out when a spot opens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WaitlistForm />
        </CardContent>
      </Card>
    </main>
  );
}
