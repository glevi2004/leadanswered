"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelAppointmentAction } from "./actions";

export function CancelButton({ appointmentId }: { appointmentId: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);

  if (done) return <span className="text-xs text-muted-foreground">Cancelled</span>;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this appointment? Sarah will ask you before texting the customer.")) return;
        start(async () => {
          await cancelAppointmentAction(appointmentId);
          setDone(true);
        });
      }}
    >
      {pending ? "…" : "Cancel"}
    </Button>
  );
}
