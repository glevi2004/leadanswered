"use client";

import * as React from "react";
import { Database } from "lucide-react";

/**
 * Slot for the department's **Database console** — the mirror of the company's one shared
 * Supabase project (canvas.md "Database view"). The console itself is built separately as
 * `./console` (a default-exported React component that takes no required props and resolves
 * its own data). We load it lazily behind a non-literal specifier so this shell TYPECHECKS
 * and never crashes whether or not the console module exists yet: while it's absent we render
 * an honest placeholder; once it lands it renders live in its place.
 */

/** Honest placeholder shown until the console module is present (or if it fails to load). */
function ConsolePlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-muted text-muted-foreground">
        <Database className="size-5" />
      </span>
      <p className="text-sm font-medium text-foreground">Database view</p>
      <p className="max-w-xs text-sm text-muted-foreground">
        The Supabase console — tables, migrations, storage, auth, and secrets — loads here once
        it&rsquo;s wired up.
      </p>
    </div>
  );
}

// The console is authored by another agent as `./console`. Keeping the import specifier
// non-literal means tsc doesn't hard-resolve a module we don't own (so this frame typechecks
// on its own) and the bundler's context stays scoped to the (always-present) `./console/`
// directory — a missing/empty console rejects at runtime and falls back to the placeholder.
const ENTRY: string = "index";
const DatabaseConsole = React.lazy(async () => {
  try {
    const mod = (await import(`./console/${ENTRY}`)) as { default?: React.ComponentType };
    return { default: mod.default ?? ConsolePlaceholder };
  } catch {
    return { default: ConsolePlaceholder };
  }
});

export function DatabaseConsoleSlot() {
  return (
    <React.Suspense fallback={<ConsolePlaceholder />}>
      <DatabaseConsole />
    </React.Suspense>
  );
}
