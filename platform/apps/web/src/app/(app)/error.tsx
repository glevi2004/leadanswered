"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-lg font-semibold">Something hiccuped.</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Your data is fine and Lu is still answering. Try again — if it keeps happening, we're on it.
      </p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
