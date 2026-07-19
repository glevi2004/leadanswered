"use client";

import { useLu } from "@/components/lu/lu-context";
import { Button } from "@/components/ui/button";
import { LuIcon } from "@/components/icons/lu";

/**
 * The coming-soon teaser (00 §4): the module's sales promise, verbatim,
 * plus Ask Lu. Never a broken or empty screen.
 */
export function GatedState({ label, promise }: { label: string; promise: string }) {
  const { openDock } = useLu();
  return (
    <div className="green-wash flex min-h-[55vh] flex-col items-center justify-center gap-4 rounded-3xl border px-6 py-16 text-center">
      <span className="btn-glow flex size-12 items-center justify-center rounded-2xl">
        <LuIcon className="size-6" />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-primary">Coming to your OS</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{label}</h2>
        <p className="mx-auto mt-2 max-w-md text-lg text-muted-foreground">“{promise}”</p>
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">
        We build the OS with you, module by module. This one's on the map — tell Lu if you want it
        pulled forward.
      </p>
      <Button className="btn-glow gap-1.5" onClick={() => openDock()}>
        <LuIcon className="size-4" /> Ask Lu about it
      </Button>
    </div>
  );
}
