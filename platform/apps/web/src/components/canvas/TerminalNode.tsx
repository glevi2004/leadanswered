"use client";

import * as React from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { X, SquareTerminal } from "lucide-react";

/** The three coding backends the sandbox PTY can boot (CANVAS-TOOLS.md §4). */
export type AgentKind = "claude_code" | "codex" | "shell";

const AGENT_LABEL: Record<AgentKind, string> = {
  claude_code: "Claude Code",
  codex: "Codex",
  shell: "Shell",
};

/**
 * The wss:// URL of the backend PTY. `NEXT_PUBLIC_API_URL` is the api's https origin on
 * Railway; the browser connects DIRECTLY (ws is cross-origin-safe), so we just swap the
 * scheme (https→wss, http→ws) and append the query the server expects.
 */
function terminalUrl(orgId: string, agentKind: AgentKind, repo?: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "https://leadanswered-production.up.railway.app").replace(/\/$/, "");
  const ws = base.replace(/^http/i, "ws"); // https→wss, http→ws
  const params = new URLSearchParams({ orgId, agentKind });
  if (repo) params.set("repo", repo);
  return `${ws}/api/terminal?${params.toString()}`;
}

// dark terminal theme (matches the editorial dark surfaces; readable on the light canvas too)
const TERM_THEME = {
  background: "#0b0c0e",
  foreground: "#e6e6e6",
  cursor: "#e6e6e6",
  selectionBackground: "rgba(120,170,255,0.35)",
};

/**
 * A live cloud terminal, floating on the canvas. Renders an xterm.js instance wired to the
 * backend websocket PTY: server → ws messages → `term.write`; keystrokes → `term.onData` →
 * `ws.send`; container resize → `FitAddon.fit()` + a `{type:"resize"}` control frame. It is a
 * plain absolute panel (NOT a react-zoom-pan-pinch node) — draggable by its header, resizable
 * via the native bottom-right handle. Switching the backend picker reconnects (fresh session).
 */
export function TerminalNode({
  orgId,
  agentKind,
  repo,
  onClose,
  initialX = 80,
  initialY = 80,
}: {
  orgId: string;
  agentKind: AgentKind;
  repo?: string;
  onClose: () => void;
  initialX?: number;
  initialY?: number;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<Terminal | null>(null);
  const fitRef = React.useRef<FitAddon | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);

  const [kind, setKind] = React.useState<AgentKind>(agentKind);
  const [pos, setPos] = React.useState({ x: initialX, y: initialY });
  const dragRef = React.useRef<{ dx: number; dy: number } | null>(null);

  /* ---- terminal + websocket lifecycle. Keyed on {orgId,kind,repo}: changing the backend
        picker tears everything down and reconnects a fresh session. ---- */
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
      theme: TERM_THEME,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    fitRef.current = fit;

    // measure the host, then tell the PTY the size (only once the socket is up)
    const sendResize = () => {
      try {
        fit.fit();
      } catch {
        /* host not laid out yet */
      }
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "resize", cols: term.cols, rows: term.rows }));
      }
    };
    // fit after the panel has real dimensions
    const raf = requestAnimationFrame(sendResize);

    const url = terminalUrl(orgId, kind, repo);
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln(`\x1b[90m— connected to ${AGENT_LABEL[kind]} —\x1b[0m`);
      sendResize();
    };
    // server OUTPUT → xterm (text frames are strings; binary frames arrive as ArrayBuffer)
    ws.onmessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (typeof data === "string") term.write(data);
      else if (data instanceof ArrayBuffer) term.write(new Uint8Array(data));
      else if (data instanceof Blob) data.arrayBuffer().then((b) => term.write(new Uint8Array(b)));
    };
    ws.onerror = () => term.writeln("\r\n\x1b[31m[connection error]\x1b[0m");
    ws.onclose = () => term.writeln("\r\n\x1b[31m[disconnected]\x1b[0m");

    // xterm input → server
    const dataSub = term.onData((d) => {
      const s = wsRef.current;
      if (s && s.readyState === WebSocket.OPEN) s.send(d);
    });

    // container resize (native resize handle / layout) → refit + tell the PTY
    const ro = new ResizeObserver(() => sendResize());
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      dataSub.dispose();
      wsRef.current = null;
      // avoid the onclose handler writing into a disposed terminal
      ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
      try {
        ws.close();
      } catch {
        /* already closing */
      }
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, [orgId, kind, repo]);

  /* ---- header drag (move the panel within the overlay) ---- */
  const onHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, select")) return; // let controls work
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const onHeaderPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setPos({ x: e.clientX - d.dx, y: e.clientY - d.dy });
  };
  const onHeaderPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      className="absolute z-40 flex flex-col overflow-hidden rounded-xl border border-black/10 bg-[#0b0c0e] shadow-2xl dark:border-white/10"
      style={{ left: pos.x, top: pos.y, width: 560, height: 360, resize: "both" }}
      // keep canvas wheel-zoom / pan from firing when interacting with the terminal
      onWheel={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* header — label + backend picker + close (also the drag handle) */}
      <div
        className="flex h-8 shrink-0 cursor-grab items-center gap-2 border-b border-white/10 bg-white/5 px-2.5 text-[11px] text-neutral-300 active:cursor-grabbing"
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={onHeaderPointerUp}
      >
        <SquareTerminal className="size-3.5 text-neutral-400" />
        <span className="font-medium text-neutral-200">Terminal</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as AgentKind)}
          title="Backend"
          className="ml-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-200 outline-none hover:bg-white/10"
        >
          <option value="claude_code">Claude Code</option>
          <option value="codex">Codex</option>
          <option value="shell">Shell</option>
        </select>
        <button
          type="button"
          onClick={onClose}
          title="Close terminal"
          aria-label="Close terminal"
          className="ml-auto grid size-5 place-items-center rounded-md text-neutral-400 hover:bg-white/10 hover:text-neutral-100"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* the xterm mounts here; fills the panel below the header */}
      <div ref={hostRef} className="min-h-0 flex-1 overflow-hidden p-1.5" />
    </div>
  );
}
