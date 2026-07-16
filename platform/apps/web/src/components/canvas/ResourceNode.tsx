"use client";

import * as React from "react";
import {
  ExternalLink, File as FileIcon, FolderOpen, GripVertical, Link2, SquareTerminal, X,
} from "lucide-react";
import { BrowserChrome } from "@/components/canvas/BrowserChrome";
import type { CanvasNode, CanvasNodeType } from "@/lib/canvas/api";

/**
 * A COMPOSABLE canvas node (COCKPIT Part C) — the real, persisted, connectable resources the
 * ＋ menu creates: a note, a file, a folder (library boundary), a site (pasted URL), or a
 * terminal. Each lives in the RZPP transformed layer at a WORLD top-left, drags by its grip,
 * and exposes a CONNECT handle: dragging that handle to an agent draws an Edge (a capability
 * grant). Carries `lu-node` so react-zoom-pan-pinch never pans from it and the marquee/tool
 * handlers ignore presses on it.
 *
 * MVP by design: create → position → connect is the point. Node internals stay light (a note
 * is a textarea, a file is a labeled clip, a site is a read-only preview) — the real work is
 * that they PERSIST and MEAN something once wired to an agent.
 */

/** Default world dimensions per type (also the edge-anchor box until a node is resized). */
export const DEFAULT_NODE_DIMS: Record<CanvasNodeType, { w: number; h: number }> = {
  note: { w: 260, h: 168 },
  file: { w: 210, h: 104 },
  site: { w: 340, h: 234 },
  folder: { w: 440, h: 300 },
  terminal: { w: 250, h: 138 },
  agent: { w: 300, h: 120 },
};

export function nodeDims(node: CanvasNode): { w: number; h: number } {
  const d = DEFAULT_NODE_DIMS[node.type];
  return { w: node.w ?? d.w, h: node.h ?? d.h };
}

/** World-space CENTER of a node (the edge anchor point). */
export function nodeCenter(node: CanvasNode): { x: number; y: number } {
  const { w, h } = nodeDims(node);
  return { x: node.x + w / 2, y: node.y + h / 2 };
}

const DRAG_CLASS = "lu-node";
const SITE_IFRAME_W = 1280;

export function ResourceNode({
  node,
  getScale,
  selected,
  onMove,
  onSelect,
  onDelete,
  onContent,
  onConnectStart,
  onOpenTerminal,
}: {
  node: CanvasNode;
  getScale: () => number;
  selected: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onContent: (id: string, content: string) => void;
  onConnectStart: (id: string, e: React.PointerEvent) => void;
  onOpenTerminal: (id: string) => void;
}) {
  const drag = React.useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const { w, h } = nodeDims(node);
  const ring = selected ? "ring-2 ring-[#5b9bff]" : "";

  const onGripDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y, moved: false };
  };
  const onGripMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
    if (!d.moved) return;
    const s = getScale();
    onMove(node.id, d.ox + dx / s, d.oy + dy / s);
  };
  const onGripUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* noop */ }
    if (d && !d.moved) onSelect(node.id);
  };

  // the connect handle — a small plug on the right edge; drag it to an agent to grant it this node
  const connectHandle = (
    <button
      type="button"
      aria-label="Connect to an agent"
      title="Drag to an agent to connect"
      onPointerDown={(e) => { e.stopPropagation(); onConnectStart(node.id, e); }}
      className="absolute -right-3 top-1/2 z-10 grid size-6 -translate-y-1/2 cursor-crosshair place-items-center rounded-full border border-[#5b9bff] bg-card text-[#5b9bff] elev-2 hover:bg-[#5b9bff] hover:text-white"
    >
      <Link2 className="size-3.5" />
    </button>
  );

  // shared grip header (drag + delete)
  const header = (title: React.ReactNode) => (
    <div
      className="flex h-6 shrink-0 cursor-grab items-center gap-1 border-b border-black/5 bg-black/[0.03] px-1.5 active:cursor-grabbing dark:border-white/10"
      onPointerDown={onGripDown}
      onPointerMove={onGripMove}
      onPointerUp={onGripUp}
    >
      <GripVertical className="size-3.5 shrink-0 opacity-40" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
      <button
        type="button"
        aria-label="Delete"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => onDelete(node.id)}
        className="grid size-4 shrink-0 place-items-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-black/10 hover:text-foreground group-hover:opacity-100 dark:hover:bg-white/10"
      >
        <X className="size-3" />
      </button>
    </div>
  );

  /* -------------------------------- FOLDER -------------------------------- */
  if (node.type === "folder") {
    return (
      <div
        data-node={node.id}
        className={`${DRAG_CLASS} group absolute rounded-2xl border-2 border-dashed border-[#5b9bff]/40 bg-[#5b9bff]/[0.04] ${selected ? "border-[#5b9bff]" : ""}`}
        style={{ left: node.x, top: node.y, width: w, height: h }}
      >
        {/* label tab (drag handle) top-left, sits above members */}
        <div
          className="absolute -top-3 left-3 flex cursor-grab items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium elev-2 active:cursor-grabbing"
          onPointerDown={onGripDown}
          onPointerMove={onGripMove}
          onPointerUp={onGripUp}
        >
          <FolderOpen className="size-3.5 text-[#5b9bff]" />
          <input
            value={node.content ?? "Library"}
            onChange={(e) => onContent(node.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-24 bg-transparent text-foreground outline-none"
            spellCheck={false}
          />
          <button
            type="button"
            aria-label="Delete folder"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onDelete(node.id)}
            className="grid size-4 place-items-center rounded text-muted-foreground hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
          >
            <X className="size-3" />
          </button>
        </div>
        {connectHandle}
      </div>
    );
  }

  /* -------------- CARD TYPES (note / file / site / terminal) --------------
     Outer wrapper is NOT clipped so the connect handle can hang off the right
     edge; the inner card clips its content (rounded corners, the scaled iframe). */
  let title: React.ReactNode = "Note";
  let body: React.ReactNode = null;

  if (node.type === "site") {
    const url = (node.content ?? "").trim();
    const src = url ? (/^https?:\/\//i.test(url) ? url : `https://${url}`) : "";
    const host = (() => {
      try { return src ? new URL(src).host : "site"; } catch { return url || "site"; }
    })();
    const scale = w / SITE_IFRAME_W;
    const innerH = Math.round((h - 24) / scale);
    title = (
      <input
        value={url}
        placeholder="paste a URL…"
        onChange={(e) => onContent(node.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="w-full bg-transparent text-[11px] normal-case tracking-normal text-foreground outline-none placeholder:text-muted-foreground/60"
        spellCheck={false}
      />
    );
    body = (
      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
        {src ? (
          <div className="flex origin-top-left flex-col" style={{ width: SITE_IFRAME_W, transform: `scale(${scale})` }}>
            <BrowserChrome host={host} page={host} />
            <iframe
              src={src}
              title={host}
              loading="lazy"
              style={{ width: SITE_IFRAME_W, height: innerH, pointerEvents: "none" }}
              className="border-0 bg-background"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-muted-foreground">
            <ExternalLink className="size-6" />
            <span className="text-xs">Paste a URL to preview</span>
          </div>
        )}
      </div>
    );
  } else if (node.type === "note") {
    title = "Note";
    body = (
      <textarea
        value={node.content ?? ""}
        placeholder={"# Title\nWrite **markdown**…"}
        spellCheck={false}
        onChange={(e) => onContent(node.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        className="min-h-0 flex-1 resize-none bg-transparent px-3 py-2 font-[var(--font-mono,monospace)] text-[12px] leading-relaxed outline-none placeholder:text-muted-foreground/50"
      />
    );
  } else if (node.type === "file") {
    title = "File";
    body = (
      <div className="flex min-h-0 flex-1 items-center gap-2.5 px-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <FileIcon className="size-5" />
        </span>
        <input
          value={node.content ?? ""}
          placeholder="file name…"
          onChange={(e) => onContent(node.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          spellCheck={false}
        />
      </div>
    );
  } else {
    // terminal
    title = "Terminal";
    body = (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 bg-[#0b0c0e] text-neutral-300">
        <SquareTerminal className="size-6 text-neutral-400" />
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenTerminal(node.id)}
          className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-neutral-100 hover:bg-white/10"
        >
          Open session
        </button>
      </div>
    );
  }

  return (
    <div
      data-node={node.id}
      className={`${DRAG_CLASS} group absolute`}
      style={{ left: node.x, top: node.y, width: w, height: h }}
    >
      <div className={`flex h-full w-full flex-col overflow-hidden rounded-[10px] border border-black/10 bg-card text-foreground elev-3 dark:border-white/10 ${ring}`}>
        {header(title)}
        {body}
      </div>
      {connectHandle}
    </div>
  );
}
