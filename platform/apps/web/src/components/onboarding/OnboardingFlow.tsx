"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Check, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PixelIcon, PixelTile } from "@/components/ds/PixelIcon";
import { finishSignup } from "@/app/onboarding/actions";

/**
 * Phase-1 static sign-up onboarding (pixel/editorial, modeled on cofounder.co).
 * A five-screen wizard: name → role → idea stage → "create your company" intro →
 * company name. No AI and no backend calls until the very last Continue, which
 * hands the collected answers to the single server action `finishSignup` and,
 * on success, drops the owner onto their canvas. Every screen keeps the same
 * chrome: a Log out pill top-left, the ASCII wordmark on the left, one question
 * centered on the right, and a slim progress bar across the top.
 */

// "Welcome to Lu Computer" — figlet "small", rendered LEFT in light gray. String.raw
// keeps the backslashes literal so the art lands exactly as drawn.
const WORDMARK = String.raw`__      __   _                    _
\ \    / /__| |__ ___ _ __  ___  | |_ ___
 \ \/\/ / -_) / _/ _ \ '  \/ -_) |  _/ _ \
  \_/\_/\___|_\__\___/_|_|_\___|  \__\___/

 _           ___                     _
| |  _  _   / __|___ _ __  _ __ _  _| |_ ___ _ _
| |_| || | | (__/ _ \ '  \| '_ \ || |  _/ -_) '_|
|____\_,_|  \___\___/_|_|_| .__/\_,_|\__\___|_|
                          |_|`;

const TOTAL = 5;

// Screen 2 — single-select, numbered 01–08.
const ROLES = [
  "Product",
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Operations",
  "Founder / Executive",
  "Other",
] as const;

// Screen 3 — the idea-stage track, left → right.
const STAGES = ["Pre-idea", "Idea", "Pre-MVP", "MVP", "Customers", "Revenue", "Public"] as const;

export function OnboardingFlow({ preview = false }: { preview?: boolean }) {
  const [screen, setScreen] = React.useState(1);
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [ideaStage, setIdeaStage] = React.useState<string>("Idea");
  const [companyName, setCompanyName] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Design-board preview only (default false → production behavior unchanged).
  const [previewDone, setPreviewDone] = React.useState(false);

  const next = () => setScreen((s) => Math.min(TOTAL, s + 1));

  const finish = async () => {
    setError(null);
    // In preview we never touch the backend or navigate — just show an end state.
    if (preview) {
      setPreviewDone(true);
      return;
    }
    setSubmitting(true);
    try {
      const result = await finishSignup({
        ownerName: name.trim(),
        role,
        ideaStage,
        companyName: companyName.trim(),
      });
      if (result?.error) {
        setError(result.error);
        setSubmitting(false);
        return;
      }
      window.location.href = "/canvas";
    } catch {
      setError("Something went wrong finishing your sign-up. Please try again.");
      setSubmitting(false);
    }
  };

  const cta = "h-11 gap-2 rounded-xl px-6";
  const progress = (screen / TOTAL) * 100;

  return (
    <div className="relative flex min-h-svh w-full flex-col overflow-hidden bg-sidebar">
      {/* progress bar */}
      <div className="absolute inset-x-0 top-0 z-20 h-1 bg-border/60">
        <div
          className="h-full bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* persistent Log out — wired to the existing Supabase sign-out route */}
      <a
        href="/auth/signout"
        onClick={preview ? (e) => e.preventDefault() : undefined}
        className="absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:bg-card hover:text-foreground"
      >
        <LogOut className="size-3.5" />
        Log out
      </a>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-2">
        {/* LEFT — ASCII wordmark */}
        <div className="relative hidden items-center justify-center overflow-hidden border-r border-border/60 p-10 md:flex">
          <div className="select-none">
            <pre className="font-mono text-[10px] leading-[1.15] text-muted-foreground/40 sm:text-[11px]">
              {WORDMARK}
            </pre>
            <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground/50">
              // the AI-native computer
            </p>
          </div>
        </div>

        {/* RIGHT — one question at a time */}
        <div className="flex flex-1 items-center justify-center px-6 py-20 md:px-12">
          <div className="w-full max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={previewDone ? "preview-done" : screen}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {previewDone ? (
                  <PreviewComplete
                    onReset={() => {
                      setPreviewDone(false);
                      setScreen(1);
                    }}
                  />
                ) : (
                <>
                {screen === 1 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (name.trim()) next();
                    }}
                  >
                    <StepCaption n={1} />
                    <h1 className="t-h1 mt-3">What should we call you?</h1>
                    <div className="mt-8">
                      <label htmlFor="ob-name" className="t-label mb-2 block text-muted-foreground">
                        Your name
                      </label>
                      <Input
                        id="ob-name"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 rounded-xl bg-card text-base"
                      />
                    </div>
                    <Button type="submit" className={cn(cta, "mt-8")} disabled={!name.trim()}>
                      Continue <ArrowRight className="size-4" />
                    </Button>
                  </form>
                )}

                {screen === 2 && (
                  <div>
                    <StepCaption n={2} />
                    <h1 className="t-h1 mt-3">Which best describes you?</h1>
                    <div className="mt-6 flex flex-col gap-2">
                      {ROLES.map((r, i) => {
                        const selected = role === r;
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            className={cn(
                              "flex w-full items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors",
                              selected
                                ? "border-foreground bg-card"
                                : "border-border bg-card/40 hover:border-foreground/40 hover:bg-card/70",
                            )}
                          >
                            <span
                              className={cn(
                                "font-mono text-xs tabular-nums",
                                selected ? "text-foreground" : "text-muted-foreground",
                              )}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span
                              className={cn(
                                "flex-1 text-sm font-medium",
                                selected ? "text-foreground" : "text-foreground/80",
                              )}
                            >
                              {r}
                            </span>
                            <span
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full border transition-all",
                                selected
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border text-transparent",
                              )}
                            >
                              <Check className="size-3.5" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <Button className={cn(cta, "mt-8")} disabled={!role} onClick={next}>
                      Continue <ArrowRight className="size-4" />
                    </Button>
                  </div>
                )}

                {screen === 3 && (
                  <div>
                    <StepCaption n={3} />
                    <h1 className="t-h1 mt-3">What stage is your idea?</h1>
                    <div className="mt-12">
                      <StageSlider value={ideaStage} onChange={setIdeaStage} />
                    </div>
                    <Button className={cn(cta, "mt-12")} onClick={next}>
                      Next <ArrowRight className="size-4" />
                    </Button>
                  </div>
                )}

                {screen === 4 && (
                  <div className="flex items-center gap-6">
                    <PixelTile size={92} className="shrink-0">
                      <PixelIcon glyph="app" color="blue" size={54} />
                    </PixelTile>
                    <div>
                      <StepCaption n={4} />
                      <h1 className="t-h1 mt-2">Create your company</h1>
                      <p className="t-body mt-2 text-muted-foreground">
                        One more step — let&apos;s give it a name and boot it up.
                      </p>
                      <Button className={cn(cta, "mt-6")} onClick={next}>
                        Continue <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {screen === 5 && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (companyName.trim() && !submitting) void finish();
                    }}
                  >
                    <StepCaption n={5} />
                    <h1 className="t-h1 mt-3">Create your company</h1>
                    <div className="mt-8">
                      <label htmlFor="ob-company" className="t-label mb-2 block text-muted-foreground">
                        Company name
                      </label>
                      <Input
                        id="ob-company"
                        autoFocus
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Your company"
                        className="h-11 rounded-xl bg-card text-base"
                      />
                    </div>
                    {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                    <div className="mt-8 flex items-center gap-4">
                      <Button type="submit" className={cta} disabled={!companyName.trim() || submitting}>
                        {submitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" /> Creating…
                          </>
                        ) : (
                          <>
                            Continue <ArrowRight className="size-4" />
                          </>
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setScreen(4)}
                        disabled={submitting}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
                </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Preview-only end state (design board). Stands in for the real finish, which would
 * call `finishSignup` and redirect to /canvas — neither happens here.
 */
function PreviewComplete({ onReset }: { onReset: () => void }) {
  return (
    <div>
      <p className="t-caption">Preview</p>
      <div className="mt-3 flex items-center gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full border border-foreground bg-foreground text-background">
          <Check className="size-5" />
        </span>
        <h1 className="t-h1">Preview complete</h1>
      </div>
      <p className="t-body mt-3 text-muted-foreground">
        Sign-up would run here — the real flow creates your company and opens the canvas.
      </p>
      <Button variant="outline" className="mt-8 h-11 gap-2 rounded-xl px-6" onClick={onReset}>
        Restart preview <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/** The small editorial step marker above each question. */
function StepCaption({ n }: { n: number }) {
  return (
    <p className="t-caption">
      Step {n} of {TOTAL}
    </p>
  );
}

/**
 * Horizontal idea-stage slider — a track with a dot per stage, the filled portion
 * running up to the selection. Columns are equal width so the labels sit directly
 * under their dots and the fill lands on dot centers.
 */
function StageSlider({ value, onChange }: { value: string; onChange: (s: string) => void }) {
  const n = STAGES.length;
  const idx = Math.max(0, STAGES.indexOf(value as (typeof STAGES)[number]));
  const edge = (0.5 / n) * 100; // first/last dot center, in %
  const fillW = (idx / n) * 100; // from first dot center to the selected dot

  return (
    <div>
      <div className="relative h-3">
        {/* track */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-border"
          style={{ left: `${edge}%`, right: `${edge}%` }}
        />
        {/* filled portion */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-foreground transition-[width] duration-300 ease-out"
          style={{ left: `${edge}%`, width: `${fillW}%` }}
        />
        {/* dots */}
        <div className="absolute inset-0 flex">
          {STAGES.map((s, i) => (
            <button
              key={s}
              type="button"
              aria-label={s}
              onClick={() => onChange(s)}
              className="flex flex-1 items-center justify-center"
            >
              <span
                className={cn(
                  "rounded-full border transition-all duration-200",
                  i === idx
                    ? "size-3.5 border-foreground bg-foreground"
                    : i < idx
                      ? "size-2.5 border-foreground bg-foreground"
                      : "size-2.5 border-border bg-card",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex">
        {STAGES.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={cn(
              "flex-1 text-center text-[11px] transition-colors",
              i === idx ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground/70",
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
