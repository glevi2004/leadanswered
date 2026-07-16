import { E2bSandbox } from "./e2b.js";
import type { Sandbox } from "./types.js";

export type { Sandbox, SpawnOpts, ExecOpts, ExecResult, FileWrite, PtyHandle } from "./types.js";
export { SandboxTimeoutError } from "./types.js";
export { E2bSandbox } from "./e2b.js";

/**
 * The sandbox factory. e2b is the LOCKED provider (AGENTS-BACKEND §11); the port keeps
 * Daytona/Fly swappable behind a future `SANDBOX_PROVIDER` switch.
 *
 * One shared instance so the in-process sandbox cache is reused across callers (the Engineering
 * agent's autonomous tasks and the interactive terminal share the same live sandboxes).
 */
let instance: Sandbox | undefined;

export function getSandbox(): Sandbox {
  if (!instance) instance = new E2bSandbox();
  return instance;
}
