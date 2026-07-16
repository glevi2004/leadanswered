import type { Server as HttpServer } from "node:http";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import type { Store } from "../store/types.js";
import { getSandbox, type PtyHandle } from "../sandbox/index.js";
import { getGit } from "../git/index.js";
import { ENV_FILE, renderEnvFile } from "../agent/engineeringTools.js";

/**
 * The CLOUD TERMINAL — a WebSocket ⇄ PTY bridge (CANVAS-TOOLS §4, ENGINEER-ACTIVATION §D).
 * The canvas terminal node opens `ws://…/api/terminal?orgId=…&agentKind=…&repo=…`; this
 * spawns a real e2b sandbox (optionally cloning `repo`), records a Session, and bridges the
 * sandbox PTY to the socket so the owner watches + types into Claude Code / Codex / a shell.
 *
 * Bridge:  pty.onData → ws.send  |  ws.message → (JSON {type:"resize"} → pty.resize) else pty.write.
 * Teardown (ws close/error, or a spawn failure): pty.kill() → sandbox.kill() → Session → "killed".
 * Provider keys reach the sandbox via the SAME sourced env file run_coding_agent uses (never inline),
 * so the coding CLI has its ANTHROPIC/OPENAI key.
 *
 * Attached with `{ server, path }` so `ws` only claims the `/api/terminal` upgrade and leaves every
 * other HTTP request (and any other upgrade) untouched — the REST routes keep working.
 */
export interface TerminalRouteDeps {
  store: Store;
}

/** The control frames the client may send (everything else is raw PTY input). */
type ControlMessage = { type: "resize"; cols: number; rows: number };

/** Parse a client frame as a resize control; returns null for raw keystroke input. */
function parseResize(raw: RawData): ControlMessage | null {
  const text = raw.toString();
  if (text.length === 0 || text[0] !== "{") return null; // fast path: keystrokes aren't JSON objects
  try {
    const msg = JSON.parse(text) as Partial<ControlMessage>;
    if (msg && msg.type === "resize" && typeof msg.cols === "number" && typeof msg.rows === "number") {
      return { type: "resize", cols: msg.cols, rows: msg.rows };
    }
  } catch {
    // not JSON — fall through to raw input
  }
  return null;
}

export function attachTerminalWs(server: HttpServer, deps: TerminalRouteDeps): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/api/terminal" });

  wss.on("connection", (ws: WebSocket, req) => {
    void handleConnection(ws, req.url ?? "", deps);
  });

  return wss;
}

async function handleConnection(ws: WebSocket, reqUrl: string, deps: TerminalRouteDeps): Promise<void> {
  const url = new URL(reqUrl, "http://localhost");
  const orgId = url.searchParams.get("orgId") ?? "";
  const agentKind = url.searchParams.get("agentKind") ?? "shell";
  const repo = url.searchParams.get("repo") ?? undefined;

  const send = (data: string) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  };
  const sendControl = (obj: unknown) => send(JSON.stringify(obj));

  if (orgId.trim() === "") {
    sendControl({ type: "error", error: "orgId query param is required" });
    ws.close();
    return;
  }

  const sandbox = getSandbox();
  let sandboxId: string | undefined;
  let sessionId: string | undefined;
  let pty: PtyHandle | undefined;
  let torndown = false;

  const teardown = async (): Promise<void> => {
    if (torndown) return;
    torndown = true;
    try {
      pty?.kill();
    } catch (e) {
      console.error("[/api/terminal] pty.kill failed:", e);
    }
    try {
      if (sandboxId) await sandbox.kill(sandboxId);
    } catch (e) {
      console.error("[/api/terminal] sandbox.kill failed:", e);
    }
    try {
      if (sessionId) await deps.store.updateSession(sessionId, { status: "killed" });
    } catch (e) {
      console.error("[/api/terminal] updateSession failed:", e);
    }
  };

  // Tear down as soon as the socket goes away, even mid-boot.
  ws.on("close", () => void teardown());
  ws.on("error", (err) => {
    console.error("[/api/terminal] ws error:", err);
    void teardown();
  });

  try {
    // A scoped token lets us clone a private repo into the sandbox (v0: the authed gh user).
    const token = repo ? await getGit().installationToken() : undefined;
    const spawned = await sandbox.spawn({ repo, token });
    sandboxId = spawned.id;

    const session = await deps.store.createSession({
      orgId,
      agentKind,
      sandboxId,
      repo: repo ?? null,
      status: "running",
    });
    sessionId = session.id;

    // Keys reach the sandbox via a sourced env file (same as run_coding_agent) — never inline.
    await sandbox.writeFiles(sandboxId, [{ path: ENV_FILE, content: renderEnvFile() }]);

    pty = await sandbox.pty(sandboxId);
    pty.onData((d) => send(d));

    // Source the provider keys into the interactive shell so the coding CLI can authenticate.
    pty.write(`set -a; . ${ENV_FILE} 2>/dev/null || true; set +a; clear\n`);

    sendControl({ type: "ready", sessionId, sandboxId, agentKind, repo: repo ?? null });
  } catch (err) {
    console.error("[/api/terminal] failed to start session:", err);
    sendControl({ type: "error", error: "failed to start terminal session" });
    await teardown();
    ws.close();
    return;
  }

  // Bridge client → PTY: resize controls drive resize, everything else is raw input.
  ws.on("message", (raw: RawData) => {
    const resize = parseResize(raw);
    if (resize) {
      try {
        pty?.resize(resize.cols, resize.rows);
      } catch (e) {
        console.error("[/api/terminal] resize failed:", e);
      }
      return;
    }
    try {
      pty?.write(raw.toString());
    } catch (e) {
      console.error("[/api/terminal] pty.write failed:", e);
    }
  });
}
