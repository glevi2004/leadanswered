import { MODULES } from "./registry";
import type { ModuleKey, ModuleStatus } from "./shared";

/**
 * Module gating (00-foundation §4). Status resolves per organization:
 * Organization.modules JSON column when present, else the registry default.
 */

export function resolveModuleStatus(organization: Record<string, any>, key: ModuleKey): ModuleStatus {
  const stored = organization?.modules?.[key] as ModuleStatus | undefined;
  return stored ?? MODULES[key].defaultStatus ?? "coming_soon";
}
