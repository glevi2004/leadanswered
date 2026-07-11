import { cookies } from "next/headers";
import { MODULES } from "./registry";
import type { ModuleKey, ModuleStatus } from "./shared";

/**
 * Module gating (00-foundation §4). Status resolves per organization:
 * Organization.modules JSON column when present, else the registry default.
 * Demo mode (la_demo cookie, toggled via /demo) forces every non-live module
 * to `preview` — the full-app walkthrough for design-partner calls.
 */

export const DEMO_COOKIE = "la_demo";

export async function isDemoMode(): Promise<boolean> {
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value === "1";
}

export function resolveModuleStatus(
  organization: Record<string, any>,
  key: ModuleKey,
  demo: boolean,
): ModuleStatus {
  const stored = organization?.modules?.[key] as ModuleStatus | undefined;
  const status = stored ?? MODULES[key].defaultStatus ?? "coming_soon";
  if (demo && status !== "live" && status !== "hidden") return "preview";
  return status;
}
