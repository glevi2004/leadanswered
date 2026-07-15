/**
 * The Sandbox PORT (Ports & Adapters) — an ephemeral cloud coding sandbox the Engineering agent
 * drives. The agent + the canvas terminal only ever talk to this interface, never a provider, so
 * e2b (the LOCKED default) can be swapped for Daytona/Fly with ZERO caller changes.
 *
 * Spec: AGENTS-BACKEND.md §6 (the Engineering agent + sandbox runtime),
 * ENGINEERING-AGENT.md §4 (the ports), CANVAS-TOOLS.md §4 (the interactive terminal / PTY).
 */

/** Options for spawning a sandbox. All optional — a bare `spawn()` boots the provider's base image. */
export interface SpawnOpts {
  /** Provider template id/name (the prebuilt e2b template = node + git + Claude Code + Codex). */
  template?: string;
  /** Repo to clone into the sandbox — `owner/name` or a full https URL. */
  repo?: string;
  /** Scoped token used to clone a private `repo` (e.g. a GitHub-App installation token). */
  token?: string;
}

/** Result of a one-shot command. A non-zero `exitCode` is a value, not a thrown error. */
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/** A single file to materialise in the sandbox filesystem. */
export interface FileWrite {
  path: string;
  content: string;
}

/**
 * A live pseudo-terminal handle — the duplex stream behind the canvas terminal node (xterm.js ⇄
 * websocket ⇄ this). `onData` may be registered after spawn; early output is buffered until the
 * first subscriber attaches so the shell banner/prompt is never lost.
 */
export interface PtyHandle {
  /** Send keystrokes/input to the PTY. */
  write(data: string): void;
  /** Subscribe to PTY output (decoded to a string). Multiple subscribers are allowed. */
  onData(cb: (d: string) => void): void;
  /** Notify the PTY the terminal was resized. */
  resize(cols: number, rows: number): void;
  /** Kill the PTY process. */
  kill(): void;
}

/** Provider-agnostic sandbox port. Implemented by `E2bSandbox` (and a `LocalSandbox` stub later). */
export interface Sandbox {
  /** Boot a sandbox (optionally from a template, optionally cloning a repo). Returns its id. */
  spawn(opts?: SpawnOpts): Promise<{ id: string }>;
  /** Run a command to completion. Returns stdout/stderr/exitCode (never throws on non-zero exit). */
  exec(id: string, cmd: string): Promise<ExecResult>;
  /** Open an interactive PTY in the sandbox (for the terminal tool). */
  pty(id: string): Promise<PtyHandle>;
  /** Write files into the sandbox filesystem (create/overwrite). */
  writeFiles(id: string, files: FileWrite[]): Promise<void>;
  /** Read a file's UTF-8 content from the sandbox. */
  readFile(id: string, path: string): Promise<string>;
  /** Terminate the sandbox and release its resources. */
  kill(id: string): Promise<void>;
}
