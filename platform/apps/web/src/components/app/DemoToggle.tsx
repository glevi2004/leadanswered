"use client";

import { useRouter } from "next/navigation";

/**
 * Demo-data switch (00 §4): swaps the whole app onto the Apex Roofing fixtures
 * for walkthroughs. Cookie-backed via /demo; visible to every signed-in owner
 * for now (they only ever demo to themselves).
 */
export function DemoToggle({ demo }: { demo: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={demo}
      onClick={() => {
        document.cookie = `la_demo=${demo ? "0" : "1"};path=/;max-age=31536000;samesite=lax`;
        router.refresh();
      }}
      className="flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <span
        className={`relative h-4 w-7 rounded-full transition-colors ${demo ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-white shadow transition-all ${demo ? "left-3.5" : "left-0.5"}`}
        />
      </span>
      Demo data
    </button>
  );
}
