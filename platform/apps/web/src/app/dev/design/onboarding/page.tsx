import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

/**
 * /dev/design/onboarding — DEV design-board preview of the Phase-1 sign-up flow.
 * Renders the real <OnboardingFlow> in `preview` mode: every screen is clickable for
 * design review, but the final "Continue" neither calls the `finishSignup` server action
 * nor navigates to /canvas — it shows a "Preview complete" end state instead. The Log out
 * pill is inert here too. (The production flow lives at /onboarding.)
 */
export default function OnboardingPreviewPage() {
  return (
    <div className="relative min-h-svh bg-sidebar">
      {/* back to the board — bottom-left, clear of the flow's top-left Log out pill */}
      <Link
        href="/dev/design"
        className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:bg-card hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to board
      </Link>

      <OnboardingFlow preview />
    </div>
  );
}
