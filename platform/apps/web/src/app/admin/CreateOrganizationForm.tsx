"use client";

import { useActionState } from "react";
import { createOrganizationAction, type ActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CreateOrganizationForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createOrganizationAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New organization</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input id="companyName" name="companyName" required placeholder="Acme Services" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ownerEmail">Owner email</Label>
            <Input id="ownerEmail" name="ownerEmail" type="email" required placeholder="owner@company.com" />
            <p className="text-xs text-muted-foreground">They're invited after you finish onboarding them.</p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="twilioNumber">Twilio number</Label>
            <Input id="twilioNumber" name="twilioNumber" required placeholder="+18334567890" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">Lead-email slug (optional)</Label>
            <Input id="slug" name="slug" placeholder="auto from company name" />
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create organization"}</Button>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.ok && <p className="text-sm text-primary">{state.ok}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
