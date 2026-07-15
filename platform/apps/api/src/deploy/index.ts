import { VercelDeploy } from "./vercel.js";
import type { Deploy } from "./types.js";

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
