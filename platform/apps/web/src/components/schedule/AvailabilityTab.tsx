"use client";

import * as React from "react";
import { toast } from "sonner";
import { AvailabilitySection } from "@/components/config/sections";
import { saveAvailabilityAction } from "@/app/(app)/schedule/availability-actions";
import { cellsToWindows, windowsToCells, type AvailabilityWindow, type OnboardingState } from "@/lib/onboarding-state";
import { Button } from "@/components/ui/button";

/**
 * The Availability tab (07-schedule §2): the drag-to-paint grid REUSED from
 * onboarding (same component, same windows JSON), saving straight to
 * Organization.standingAvailability. This editor moved here from Settings.
 */
export function AvailabilityTab({ timezone, windows }: { timezone: string; windows: AvailabilityWindow[] }) {
  const [slots, setSlots] = React.useState<Set<string>>(() => windowsToCells(windows));
  const [tz, setTz] = React.useState(timezone);
  const [saving, setSaving] = React.useState(false);

  // Minimal OnboardingState facade — AvailabilitySection only touches slots + timezone.
  const state = { slots, timezone: tz } as unknown as OnboardingState;
  const update = (patch: Partial<OnboardingState>) => {
    if (patch.slots) setSlots(patch.slots as Set<string>);
    if (patch.timezone) setTz(patch.timezone);
  };

  const save = async () => {
    const next = cellsToWindows(slots);
    if (next.length === 0) {
      toast.error("Keep at least one window open — Sarah needs somewhere to book.");
      return;
    }
    setSaving(true);
    const res = await saveAvailabilityAction(tz, next);
    setSaving(false);
    res.ok ? toast.success("Availability saved — Sarah books inside these windows.") : toast.error("Couldn't save — try again.");
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        When Sarah can book you. 60-minute visits are offered inside these windows.
      </p>
      <AvailabilitySection state={state} update={update} />
      <div>
        <Button className="btn-glow" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save availability"}
        </Button>
      </div>
    </div>
  );
}
