"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * /home is a one-shot server render — without this it goes stale the moment a build moves
 * (docs/product.md §7). Re-fetch the server payload on an interval while the tab is
 * visible; `router.refresh()` re-runs the server component without losing client state.
 */
export function AutoRefresh({ everyMs = 15_000 }: { everyMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const iv = window.setInterval(tick, everyMs);
    return () => window.clearInterval(iv);
  }, [router, everyMs]);
  return null;
}
