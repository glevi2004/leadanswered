"use client";

import { useActionState } from "react";
import { joinWaitlistAction, type JoinState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function WaitlistForm() {
  const [state, action, pending] = useActionState<JoinState, FormData>(joinWaitlistAction, {});

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3 text-center">
        <p className="text-lg font-medium">You&apos;re on the list.</p>
        <p className="text-sm text-muted-foreground">
          We&apos;re onboarding new companies in small batches. When it&apos;s your turn, you&apos;ll get an
          invite email to set up your account.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@company.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">
          Name <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="name" name="name" placeholder="Jane Doe" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="company">
          Company <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Input id="company" name="company" placeholder="Acme Services" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="note">
          Anything we should know? <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea id="note" name="note" rows={3} placeholder="What are you hoping Lu can do for you?" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Joining…" : "Join the waitlist"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
