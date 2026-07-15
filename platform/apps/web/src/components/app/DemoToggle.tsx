"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { ORG_MODE_COOKIE, readOnboardedProfileClient, resetWorkspace, setActiveProfile } from "@/lib/org-cookie";
import { cn } from "@/lib/utils";

/**
 * Demo-profile selector (VISION-LU): preview the app as one of two orgs.
 * Off = real data · Mature = the Apex Roofing fixtures · New = a freshly
 * onboarded, honest-empty org (its config injected, its data the real empty
 * path). Cookie-backed via `la_org` (with the legacy `la_demo` kept consistent).
 */

type Mode = "off" | "mature" | "new";

const SEGMENTS: { value: Mode; label: string; title: string }[] = [
  { value: "off", label: "Off", title: "Real data — demo off" },
  { value: "mature", label: "Mature", title: "Mature — the Apex Roofing fixtures" },
  { value: "new", label: "New", title: "New — a freshly onboarded org" },
];

function readMode(fallback: Mode): Mode {
  if (typeof document === "undefined") return fallback;
  const m = document.cookie.match(new RegExp(`(?:^|; )${ORG_MODE_COOKIE}=([^;]*)`));
  const v = m?.[1];
  return v === "mature" || v === "new" || v === "off" ? v : fallback;
}

export function DemoToggle({ demo }: { demo: boolean }) {
  const router = useRouter();
  // demo=true is the legacy Apex path → treat as "mature" until the cookie says otherwise.
  const [mode, setMode] = React.useState<Mode>(demo ? "mature" : "off");

  React.useEffect(() => {
    setMode(readMode(demo ? "mature" : "off"));
  }, [demo]);

  const select = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setActiveProfile(next);
    if (next === "new" && !readOnboardedProfileClient()) {
      // Nothing to show yet — send them to build a New org first.
      window.location.href = "/dev/onboarding";
      return;
    }
    router.refresh();
  };

  return (
    <div className="flex items-center gap-1">
    <div
      role="radiogroup"
      aria-label="Demo profile"
      className="flex items-center rounded-full border p-0.5 text-[11px] font-medium"
    >
      {SEGMENTS.map((s) => {
        const active = s.value === mode;
        return (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={s.title}
            onClick={() => select(s.value)}
            className={cn(
              "rounded-full px-2 py-0.5 transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
      {mode === "new" && (
        <button
          type="button"
          title="Reset workspace — start onboarding over"
          onClick={() => resetWorkspace()}
          className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="size-3" />
        </button>
      )}
    </div>
  );
}
