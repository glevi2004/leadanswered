import { VercelDeploy } from "./vercel.js";
import type { Deploy } from "./types.js";
import type { Store } from "../store/types.js";

export type { Deploy, CreateProjectOpts, PreviewDeployment } from "./types.js";
export { VercelDeploy } from "./vercel.js";

/**
 * The deploy factory. Vercel is the LOCKED host (AGENTS-BACKEND §11); the port keeps the
 * provider swappable behind a future `DEPLOY_PROVIDER` switch (mirrors `getSandbox`).
 *
 * One shared instance — `VercelDeploy` is stateless (auth + team scope are read from env per
 * call), so a singleton is purely to avoid re-allocating.
 */
let instance: Deploy | undefined;

export function getDeploy(): Deploy {
  if (!instance) instance = new VercelDeploy();
  return instance;
}

/**
 * Org-scoped Deploy (BYO connect — docs/system.md �6). When `orgId` is given AND the
 * org has a stored Vercel connection with an access token, return a `VercelDeploy`
 * bound to THAT token (+ team scope), so the Engineer deploys into the org's OWN
 * Vercel. Otherwise fall back to the env-based `getDeploy()` (dogfood path — unchanged).
 */
export async function getDeployForOrg(store: Store, orgId?: string): Promise<Deploy> {
  if (orgId) {
    const conn = await store.getVercelConnection(orgId);
    if (conn?.accessToken) {
      return new VercelDeploy({ token: conn.accessToken, teamId: conn.teamId ?? undefined });
    }
  }
  return getDeploy();
}
