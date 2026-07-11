import { requireOrganization } from "@/lib/dashboard-auth";
import { GatedState } from "./GatedState";
import { MODULES } from "@/lib/data/registry";
import type { ModuleKey } from "@/lib/data/shared";

/**
 * Placeholder page for a module whose UI hasn't been built yet — always the
 * sales-promise teaser (00 §4), never a broken screen. Replaced module by
 * module as each spec (platform/app-ui/03–12) gets implemented.
 */
export async function ModuleStub({ moduleKey }: { moduleKey: ModuleKey }) {
  await requireOrganization();
  const entry = MODULES[moduleKey];
  return <GatedState label={entry.label} promise={entry.promise ?? ""} />;
}
