"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildConfig,
  stateFromInitial,
  type OnboardingInitial,
} from "@/lib/onboarding-state";
import { SECTIONS, ReviewSummary } from "@/components/config/sections";
import { saveOnboardingAction } from "./actions";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const STEPS = [
  ...SECTIONS.map((s) => ({ key: s.key, title: s.title, subtitle: s.subtitle, Component: s.Component })),
  { key: "review", title: "Review & finish", subtitle: "Confirm your setup", Component: null },
];

type DotState = "completed" | "active" | "upcoming";

function StepDot({ state }: { state: DotState }) {
  if (state === "completed")
    return (
      <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="size-3" />
      </div>
    );
  if (state === "active")
    return (
      <div className="flex size-5 items-center justify-center rounded-full border-2 border-primary">
        <div className="size-2 rounded-full bg-primary" />
      </div>
    );
  return <div className="size-3.5 rounded-full border border-muted-foreground/40" />;
}

function StepRail({ current }: { current: number }) {
  return (
    <nav>
      {STEPS.map((s, idx) => {
        const n = idx + 1;
        const dot: DotState = current > n ? "completed" : current === n ? "active" : "upcoming";
        return (
          <div key={s.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-0.5">
              <StepDot state={dot} />
              {idx < STEPS.length - 1 && (
                <div className={cn("my-1 h-7 w-px", current > n ? "bg-primary" : "bg-border")} />
              )}
            </div>
            <span
              className={cn(
                "pb-7 text-sm leading-tight",
                dot === "active"
                  ? "font-semibold text-foreground"
                  : dot === "completed"
                    ? "font-medium text-primary"
                    : "text-muted-foreground",
              )}
            >
              {s.title}
            </span>
          </div>
        );
      })}
    </nav>
  );
}

type SaveResult = { error?: string; ok?: boolean; warning?: string };

export function OnboardingWizard({
  initial,
  save = saveOnboardingAction,
  afterHref = "/home",
  finishLabel = "Finish setup",
}: {
  initial: OnboardingInitial;
  /** Persists the config. Defaults to the organization self-save; admin passes a organization-scoped action. */
  save?: (raw: unknown) => Promise<SaveResult>;
  /** Where to go after a successful finish (organization → /dashboard; admin → /admin/[id]). */
  afterHref?: string;
  finishLabel?: string;
}) {
  const router = useRouter();
  const [state, setState] = useState(() => stateFromInitial(initial));
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<typeof state>) => setState((s) => ({ ...s, ...patch }));

  const current = STEPS[step - 1];
  const isReview = current.key === "review";
  const Section = current.Component;

  // Light per-step gating so people can't skip the essentials.
  const canContinue =
    step === 1 ? state.company.trim().length > 0 : step === 2 ? state.baseZip.trim().length > 0 : true;

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }

  async function next() {
    setError(null);
    if (step < STEPS.length) {
      setStep((s) => s + 1);
      if (typeof window !== "undefined") window.scrollTo(0, 0);
      return;
    }
    setSaving(true);
    const res = await save(buildConfig(state));
    setSaving(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    // On success we redirect; if an invite failed (admin flow), the organization's status will read
    // "Onboarded" with a Send-invite action, so no data is lost.
    router.push(afterHref);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <span className="font-semibold tracking-tight">Set up {state.company || "your account"}</span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Button render={<a href="/auth/signout" />} variant="ghost" size="sm">
            Sign out
          </Button>
        </div>
      </header>

      {/* Mobile progress */}
      <div className="border-b px-6 py-3 lg:hidden">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium">{current.title}</span>
          <span className="text-muted-foreground">Step {step} of {STEPS.length}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-64 shrink-0 overflow-y-auto border-r px-6 pt-8 lg:block">
          <StepRail current={step} />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-2xl px-6 py-10">
            <h1 className="text-2xl font-semibold tracking-tight">{current.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{current.subtitle}</p>
            <div className="mt-8">
              {isReview || !Section ? (
                <ReviewSummary state={state} />
              ) : (
                <Section state={state} update={update} />
              )}
            </div>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          </div>
        </main>
      </div>

      <footer className="flex items-center justify-between border-t px-6 py-4">
        <Button variant="outline" onClick={back} className={cn(step === 1 && "invisible")}>
          Back
        </Button>
        <span className="text-xs tabular-nums text-muted-foreground">
          Step {step} of {STEPS.length}
        </span>
        <Button onClick={next} disabled={!canContinue || saving}>
          {saving ? "Saving…" : isReview ? finishLabel : "Continue"}
        </Button>
      </footer>
    </div>
  );
}
