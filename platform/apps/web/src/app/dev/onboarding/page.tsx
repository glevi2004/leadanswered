"use client";

/** DEV-ONLY sketch of the self-onboarding first-run (VISION-LU §3). Public in development. */
import { OnboardingSketch } from "@/components/onboarding/OnboardingSketch";

export default function DevOnboarding() {
  return (
    <div className="min-h-svh bg-sidebar">
      <OnboardingSketch />
    </div>
  );
}
