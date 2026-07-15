"use client";

/** DEV-ONLY harness for the flagship "boot up your company" onboarding (ONBOARDING.md). Public in development. */
import { OnboardingSketch } from "@/components/onboarding/OnboardingSketch";

export default function DevOnboarding() {
  return (
    <div className="min-h-svh bg-sidebar">
      <OnboardingSketch />
    </div>
  );
}
