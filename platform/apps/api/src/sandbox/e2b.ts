import { Sandbox as E2bClient, CommandExitError, TimeoutError as E2bTimeoutError } from "e2b";
import { SandboxTimeoutError } from "./types.js";
import type { ExecOpts, ExecResult, FileWrite, PtyHandle, Sandbox, SpawnOpts } from "./types.js";

/** Default sandbox LIFETIME when a caller passes none (env override). Well over the e2b 5-min default. */
const DEFAULT_SANDBOX_LIFETIME_MS = Number(process.env.SANDBOX_LIFETIME_MS) || 900_000; // 15 min
/** Wall-clock budget for spawn (create + optional clone) — a hung boot must fail, not stall. */
const SPAWN_TIMEOUT_MS = Number(process.env.SANDBOX_SPAWN_TIMEOUT_MS) || 180_000; // 3 min
/** Extra grace over a command's own `timeoutMs` before the JS backstop fires (lets e2b kill first). */
const EXEC_DEADLINE_GRACE_MS = 15_000;

/**
 * Race a promise against a wall-clock deadline. On expiry, reject with a clear
 * {@link SandboxTimeoutError} — the JS-level backstop that guarantees a provider call can
 * never hang the pipeline even if the SDK's own timeout fails to fire. The underlying work
 * keeps running until the caller kills the sandbox (its `finally`), so no state is corrupted.
 */
async function withDeadline<T>(op: string, ms: number, work: Promise<T>): Promise<T> {
  if (!ms || ms <= 0) return work; // 0 / unset = no JS deadline (provider limits still apply)
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new SandboxTimeoutError(op, ms)), ms);
  });
  try {
    return await Promise.race([work, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * e2b adapter for the `Sandbox` port (AGENTS-BACKEND §11 — e2b is the LOCKED provider).
 *
 * SDK: `e2b` core (`Sandbox.create` / `.commands.run` / `.pty.*` / `.files.*` / `.kill`). The
 * `E2B_API_KEY` is read from `process.env` at call time (dotenv loads it in `env.ts` at boot).
 *
 * Sandbox ids are opaque strings so callers can hand a `sandboxId` across process boundaries (a
 * worker spawns; a request handler execs). We keep an in-process instance cache and lazily
 * `.connect()` on a miss, so both the local-fast and cross-process paths work.
 */
export class E2bSandbox implements Sandbox {
  /** Live SDK instances keyed by sandboxId (populated on spawn, or lazily on reconnect). */
  private readonly live = new Map<string, E2bClient>();

  private apiKey(): string {
    const key = process.env.E2B_API_KEY;
    if (!key) throw new Error("E2B_API_KEY is not set — cannot reach the e2b sandbox provider.");
    return key;
  }

  /** Resolve a live SDK instance for an id — from cache, else reconnect to the running sandbox. */
  private async client(id: string): Promise<E2bClient> {
    const cached = this.live.get(id);
    if (cached) return cached;
    const sandbox = await E2bClient.connect(id, { apiKey: this.apiKey() });
    this.live.set(id, sandbox);
    return sandbox;
  }

  async spawn(opts: SpawnOpts = {}): Promise<{ id: string }> {
    const { template, repo, token } = opts;
    // Sandbox LIFETIME: hard cap so a sandbox can never outlive its build. The e2b default is
    // 5 min — shorter than a real coding build, so builds outran it. Set it generously.
    const lifetimeMs = opts.timeoutMs ?? DEFAULT_SANDBOX_LIFETIME_MS;
    // Make the token available inside the sandbox too (for later pushes by the coding agent).
    const envs = token ? { GITHUB_TOKEN: token } : undefined;
    const createOpts = { apiKey: this.apiKey(), envs, timeoutMs: lifetimeMs };

    // Bound the whole boot (create + clone): a hung provider boot must fail, never stall.
    return withDeadline("spawn", SPAWN_TIMEOUT_MS, this.doSpawn(template, repo, token, createOpts));
  }

  private async doSpawn(
    template: string | undefined,
    repo: string | undefined,
    token: string | undefined,
    createOpts: { apiKey: string; envs?: Record<string, string>; timeoutMs: number },
  ): Promise<{ id: string }> {
    const sandbox = template
      ? await E2bClient.create(template, createOpts)
      : await E2bClient.create(createOpts);

    this.live.set(sandbox.sandboxId, sandbox);

    if (repo) {
      // Clone into a stable working dir. GitHub-App/OAuth tokens auth as `x-access-token`.
      const httpsUrl = repo.startsWith("http") ? repo : `https://github.com/${repo}.git`;
      const cloneUrl =
        token && httpsUrl.startsWith("https://")
          ? httpsUrl.replace("https://", `https://x-access-token:${token}@`)
          : httpsUrl;
      // A clone can hang on a bad network/host; bound it so spawn can't stall on it.
      const res = await sandbox.commands.run(`git clone ${cloneUrl} /home/user/repo`, {
        timeoutMs: 120_000,
      });
      if (res.exitCode !== 0) {
        throw new Error(`git clone failed (exit ${res.exitCode}): ${res.stderr || res.stdout}`);
      }
    }

    return { id: sandbox.sandboxId };
  }

  async exec(id: string, cmd: string, opts: ExecOpts = {}): Promise<ExecResult> {
    const sandbox = await this.client(id);
    // Provider default (~60s) times out real work; default to 5min, honour an explicit override (0 = none).
    const timeoutMs = opts.timeoutMs ?? 300_000;
    const run = (async (): Promise<ExecResult> => {
      try {
        const res = await sandbox.commands.run(cmd, { timeoutMs });
        return { stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode };
      } catch (err) {
        // `commands.run` throws on a non-zero exit; surface it as a value, not an exception.
        if (err instanceof CommandExitError) {
          return { stdout: err.stdout, stderr: err.stderr, exitCode: err.exitCode ?? 1 };
        }
        // Normalise the provider's own timeout to our clear, provider-agnostic error.
        if (err instanceof E2bTimeoutError) throw new SandboxTimeoutError("exec", timeoutMs);
        throw err;
      }
    })();
    // JS-level backstop: even if the provider's `timeoutMs` fails to fire, this deadline throws
    // SandboxTimeoutError so a hung coding CLI fails the run instead of stalling forever. Grace
    // over the command's own budget lets e2b kill the process first when it works normally.
    return withDeadline("exec", timeoutMs > 0 ? timeoutMs + EXEC_DEADLINE_GRACE_MS : 0, run);
  }

  async pty(id: string): Promise<PtyHandle> {
    const sandbox = await this.client(id);
    const encoder = new TextEncoder();
    // Stream-decode so multi-byte UTF-8 split across chunks isn't corrupted.
    const decoder = new TextDecoder();
    const listeners: Array<(d: string) => void> = [];
    // Output that arrives before the first subscriber attaches is buffered, then flushed.
    let backlog = "";

    const emit = (text: string) => {
      if (listeners.length === 0) {
        backlog += text;
        return;
      }
      for (const cb of listeners) cb(text);
    };

    const handle = await sandbox.pty.create({
      cols: 80,
      rows: 24,
      onData: (data: Uint8Array) => emit(decoder.decode(data, { stream: true })),
    });
    const pid = handle.pid;

    return {
      write: (data: string) => {
        void sandbox.pty.sendInput(pid, encoder.encode(data));
      },
      onData: (cb: (d: string) => void) => {
        listeners.push(cb);
        if (backlog) {
          const pending = backlog;
          backlog = "";
          cb(pending);
        }
      },
      resize: (cols: number, rows: number) => {
        void sandbox.pty.resize(pid, { cols, rows });
      },
      kill: () => {
        void sandbox.pty.kill(pid);
      },
    };
  }

  async writeFiles(id: string, files: FileWrite[]): Promise<void> {
    if (files.length === 0) return;
    const sandbox = await this.client(id);
    await sandbox.files.write(files.map((f) => ({ path: f.path, data: f.content })));
  }

  async readFile(id: string, path: string): Promise<string> {
    const sandbox = await this.client(id);
    return sandbox.files.read(path); // default format is 'text' → string
  }

  async kill(id: string): Promise<void> {
    const sandbox = await this.client(id);
    await sandbox.kill();
    this.live.delete(id);
  }
}
