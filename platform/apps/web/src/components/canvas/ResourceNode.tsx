"use client";

import * as React from "react";
import {
  Check, ExternalLink, Eye, File as FileIcon, FolderOpen, GripVertical, Link2,
  Pencil, SquareTerminal, Upload, X,
} from "lucide-react";
import { BrowserChrome } from "@/components/canvas/BrowserChrome";
import { renderMarkdown } from "@/components/canvas/MarkdownNote";
import type { CanvasNode, CanvasNodeType } from "@/lib/canvas/api";

/**
 * A COMPOSABLE canvas node (COCKPIT Part C) — the real, persisted, connectable resources the
 * ＋ menu creates: a note, a file, a folder (library boundary), a site (pasted URL), or a
 * terminal. Each lives in the RZPP transformed layer at a WORLD top-left, drags by its grip,
 * and exposes a CONNECT handle: dragging that handle to an agent draws an Edge (a capability
 * grant). Carries `lu-node` so react-zoom-pan-pinch never pans from it and the marquee/tool
 * handlers ignore presses on it.
 *
 * The spoke lifecycle (canvas.md step 4): create → position → CONNECT to an agent → shows as
 * connected. `connected` flips the plug to a solid "linked" state on every type, so a wired
 * spoke reads as part of an agent's working set at a glance.
 */

/** Default world dimensions per type (also the edge-anchor box until a node is resized).
 *  Sized to ~75-90% of a department depth-card (DESK_CARD_W = 1200) so a note/site/terminal
 *  reads at the same scale as the dept cards — not as a tiny chip. `agent` stays small: it's an
 *  invisible position-carrier for edge anchoring, never rendered as a card. */
export const DEFAULT_NODE_DIMS: Record<CanvasNodeType, { w: number; h: number }> = {
  note: { w: 760, h: 520 },
  file: { w: 520, h: 320 },
  site: { w: 1000, h: 640 },
  folder: { w: 1100, h: 720 },
  terminal: { w: 900, h: 560 },
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
const HEADER_H = 24;   // h-6 top drag bar
const FOOTER_H = 20;   // h-5 bottom drag bar (both drag + double-click to frame)
// the capability-grant color a node's edge takes (matches EDGE_COLOR in CompanyCanvas): a
// terminal is a tool the agent USES (amber); everything else is context it READS (blue).
const READS = "#5b9bff";
const USES = "#f59e0b";

export function ResourceNode({
  node,
  getScale,
  selected,
  connected = false,
  memberCount = 0,
  onMove,
  onSelect,
  onDelete,
  onContent,
  onConnectStart,
  onOpenTerminal,
  onZoomTo,
}: {
  node: CanvasNode;
  getScale: () => number;
  selected: boolean;
  /** has at least one edge to an agent — flips the plug to a solid "linked" state */
  connected?: boolean;
  /** (folders) how many resource nodes sit inside the boundary — shown in the tab */
  memberCount?: number;
  onMove: (id: string, x: number, y: number) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onContent: (id: string, content: string) => void;
  onConnectStart: (id: string, e: React.PointerEvent) => void;
  onOpenTerminal: (id: string) => void;
  /** double-click any drag surface (top bar / bottom bar / folder edge) → fit into frame */
  onZoomTo?: (node: CanvasNode) => void;
}) {
  const drag = React.useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const { w, h } = nodeDims(node);
  const ring = selected ? "ring-2 ring-[#5b9bff]" : "";
  const grant = node.type === "terminal" ? USES : READS; // the plug's grant color

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

  // every drag surface (top bar, bottom bar, folder edges) carries the SAME handlers: press to
  // drag, double-click to fit the node into the frame. Spread with {...gripHandlers}.
  const gripHandlers = {
    onPointerDown: onGripDown,
    onPointerMove: onGripMove,
    onPointerUp: onGripUp,
    onDoubleClick: () => onZoomTo?.(node),
  };
  // a control that lives INSIDE a drag surface (delete/toggle/upload button, an input): swallow
  // the double-click so grabbing/editing it never also flies the camera.
  const stopDbl = (e: React.MouseEvent) => e.stopPropagation();

  // the bottom drag bar — mirrors the header so a node is grabbable (and framable) from top OR
  // bottom, not just the thin top strip.
  const footer = (
    <div
      className="flex h-5 shrink-0 cursor-grab items-center justify-center border-t border-black/5 bg-black/[0.03] active:cursor-grabbing dark:border-white/10"
      title="Drag to move · double-click to frame"
      {...gripHandlers}
    >
      <div className="h-1 w-10 rounded-full bg-foreground/15" />
    </div>
  );

  // the connect handle — a small plug on the right edge; drag it to an agent to grant it this
  // node. Solid + a check once connected, so a wired spoke reads as "part of the working set".
  const connectHandle = (
    <button
      type="button"
      aria-label={connected ? "Connected — drag to connect to another agent" : "Connect to an agent"}
      title={connected ? "Connected to an agent — drag to add another" : "Drag to an agent to connect"}
      onPointerDown={(e) => { e.stopPropagation(); onConnectStart(node.id, e); }}
      className="absolute -right-3 top-1/2 z-10 grid size-6 -translate-y-1/2 cursor-crosshair place-items-center rounded-full border-2 elev-2 transition-colors"
      style={
        connected
          ? { background: grant, borderColor: grant, color: "#fff" }
          : { background: "var(--card)", borderColor: grant, color: grant }
      }
    >
      {connected ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
    </button>
  );

  // shared grip header — the WHOLE bar drags (press anywhere) + double-click frames it. Optional
  // extra action + delete sit at the right and swallow the double-click so they don't also fly.
  const header = (title: React.ReactNode, extra?: React.ReactNode) => (
    <div
      className="flex h-6 shrink-0 cursor-grab items-center gap-1 border-b border-black/5 bg-black/[0.03] px-1.5 active:cursor-grabbing dark:border-white/10"
      title="Drag to move · double-click to frame"
      {...gripHandlers}
    >
      <GripVertical className="size-3.5 shrink-0 opacity-40" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
      {extra}
      <button
        type="button"
        aria-label="Delete"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={stopDbl}
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
        className={`${DRAG_CLASS} group absolute rounded-[20px] border-2 border-dashed border-[#5b9bff]/40 bg-[#5b9bff]/[0.04] ${selected ? "border-[#5b9bff]" : ""}`}
        style={{ left: node.x, top: node.y, width: w, height: h }}
      >
        {/* draggable FRAME edges — grab anywhere on the border (top/bottom/left/right) to move the
            whole library, or double-click an edge to fit it. Members float above these strips, so
            grabbing a member inside the boundary still moves just that member. */}
        {(["top", "bottom"] as const).map((edge) => (
          <div
            key={edge}
            className={`absolute inset-x-0 ${edge === "top" ? "top-0" : "bottom-0"} h-7 cursor-grab active:cursor-grabbing`}
            title="Drag to move · double-click to frame"
            {...gripHandlers}
          />
        ))}
        {(["left", "right"] as const).map((edge) => (
          <div
            key={edge}
            className={`absolute inset-y-0 ${edge === "left" ? "left-0" : "right-0"} w-7 cursor-grab active:cursor-grabbing`}
            title="Drag to move · double-click to frame"
            {...gripHandlers}
          />
        ))}
        {/* label tab (drag handle) top-left, sits above members */}
        <div
          className="absolute -top-3 left-3 z-10 flex cursor-grab items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium elev-2 active:cursor-grabbing"
          title="Drag to move · double-click to frame"
          {...gripHandlers}
        >
          <FolderOpen className="size-3.5 text-[#5b9bff]" />
          <input
            value={node.content ?? "Library"}
            onChange={(e) => onContent(node.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={stopDbl}
            className="w-24 bg-transparent text-foreground outline-none"
            spellCheck={false}
          />
          {/* member count — the boundary's contents; connecting the folder grants all of them */}
          <span className="rounded-full bg-[#5b9bff]/15 px-1.5 text-[10px] font-semibold text-[#5b9bff]">{memberCount}</span>
          <button
            type="button"
            aria-label="Delete folder"
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={stopDbl}
            onClick={() => onDelete(node.id)}
            className="grid size-4 place-items-center rounded text-muted-foreground hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
          >
            <X className="size-3" />
          </button>
        </div>
        {connected && (
          <span className="absolute -top-3 right-8 flex items-center gap-1 rounded-full bg-[#5b9bff] px-2 py-0.5 text-[10px] font-medium text-white elev-2">
            <Check className="size-3" /> Library shared
          </span>
        )}
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
    const innerH = Math.round((h - HEADER_H - FOOTER_H) / scale);
    title = (
      <input
        value={url}
        placeholder="paste a URL…"
        onChange={(e) => onContent(node.id, e.target.value)}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={stopDbl}
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
    return <NoteCard node={node} ring={ring} header={header} footer={footer} connectHandle={connectHandle} onContent={onContent} />;
  } else if (node.type === "file") {
    return <FileCard node={node} ring={ring} header={header} footer={footer} connectHandle={connectHandle} onContent={onContent} />;
  } else {
    // terminal — "hand the agent a machine": open a live session; connect = the agent drives it
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
        {connected && (
          <span className="text-[10px] text-amber-400/90">Agent can drive this</span>
        )}
      </div>
    );
  }

  return (
    <div
      data-node={node.id}
      className={`${DRAG_CLASS} group absolute`}
      style={{ left: node.x, top: node.y, width: w, height: h }}
    >
      <div className={`flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-black/10 bg-card text-foreground elev-3 dark:border-white/10 ${ring}`}>
        {header(title)}
        {body}
        {footer}
      </div>
      {connectHandle}
    </div>
  );
}

/* ================================ NOTE ================================
   A markdown note edited inline: a textarea in EDIT mode, rendered markdown in
   VIEW mode (reuses the dependency-free renderer from MarkdownNote). A fresh,
   empty note opens in edit mode so you can type immediately. */
function NoteCard({
  node, ring, header, footer, connectHandle, onContent,
}: {
  node: CanvasNode;
  ring: string;
  header: (title: React.ReactNode, extra?: React.ReactNode) => React.ReactNode;
  footer: React.ReactNode;
  connectHandle: React.ReactNode;
  onContent: (id: string, content: string) => void;
}) {
  const { w, h } = nodeDims(node);
  const [editing, setEditing] = React.useState(() => !(node.content ?? "").trim());
  const html = React.useMemo(() => renderMarkdown((node.content ?? "").trim() || "*Empty note — click edit*"), [node.content]);
  const toggle = (
    <button
      type="button"
      aria-label={editing ? "Preview" : "Edit"}
      title={editing ? "Preview" : "Edit"}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={() => setEditing((v) => !v)}
      className="grid size-4 shrink-0 place-items-center rounded text-muted-foreground hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
    >
      {editing ? <Eye className="size-3" /> : <Pencil className="size-3" />}
    </button>
  );
  return (
    <div data-node={node.id} className="lu-node group absolute" style={{ left: node.x, top: node.y, width: w, height: h }}>
      <style>{`.lu-note-md{font-size:12px;line-height:1.5}.lu-note-md h1{font-size:15px;font-weight:600;margin:1px 0 5px}.lu-note-md h2{font-size:13px;font-weight:600;margin:1px 0 4px}.lu-note-md h3{font-size:12px;font-weight:600;margin:1px 0 3px}.lu-note-md p{margin:0 0 5px}.lu-note-md ul,.lu-note-md ol{margin:0 0 5px;padding-left:16px}.lu-note-md li{margin:1px 0}.lu-note-md a{color:#2563eb;text-decoration:underline}.lu-note-md code{background:rgba(0,0,0,0.06);border-radius:4px;padding:0 4px;font-family:var(--font-mono,monospace);font-size:11px}.lu-note-md strong{font-weight:600}`}</style>
      <div className={`flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-black/10 bg-card text-foreground elev-3 dark:border-white/10 ${ring}`}>
        {header("Note", toggle)}
        {editing ? (
          <textarea
            value={node.content ?? ""}
            placeholder={"# Title\nWrite **markdown**…"}
            spellCheck={false}
            autoFocus
            onChange={(e) => onContent(node.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            className="min-h-0 flex-1 resize-none bg-transparent px-3 py-2 font-[var(--font-mono,monospace)] text-[12px] leading-relaxed outline-none placeholder:text-muted-foreground/50"
          />
        ) : (
          <div
            className="lu-note-md min-h-0 flex-1 overflow-auto px-3 py-2"
            onDoubleClick={() => setEditing(true)}
            onPointerDown={(e) => e.stopPropagation()}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
        {footer}
      </div>
      {connectHandle}
    </div>
  );
}

/* ================================ FILE ================================
   Upload or name an asset (the clip). Picking a file names it and, for images,
   shows a live thumbnail (an object URL for the session — the name persists as
   the node's content; a real Artifact upload lands later). */
function FileCard({
  node, ring, header, footer, connectHandle, onContent,
}: {
  node: CanvasNode;
  ring: string;
  header: (title: React.ReactNode, extra?: React.ReactNode) => React.ReactNode;
  footer: React.ReactNode;
  connectHandle: React.ReactNode;
  onContent: (id: string, content: string) => void;
}) {
  const { w, h } = nodeDims(node);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  React.useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onContent(node.id, f.name);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };
  const upload = (
    <button
      type="button"
      aria-label="Upload a file"
      title="Upload a file"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onClick={() => inputRef.current?.click()}
      className="grid size-4 shrink-0 place-items-center rounded text-muted-foreground hover:bg-black/10 hover:text-foreground dark:hover:bg-white/10"
    >
      <Upload className="size-3" />
    </button>
  );
  return (
    <div data-node={node.id} className="lu-node group absolute" style={{ left: node.x, top: node.y, width: w, height: h }}>
      <div className={`flex h-full w-full flex-col overflow-hidden rounded-[16px] border border-black/10 bg-card text-foreground elev-3 dark:border-white/10 ${ring}`}>
        {header("File", upload)}
        <input ref={inputRef} type="file" className="hidden" onChange={pick} />
        <div className="flex min-h-0 flex-1 items-center gap-2.5 px-3">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => inputRef.current?.click()}
            className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted text-muted-foreground hover:text-foreground"
            title="Upload a file"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={node.content ?? "file"} className="size-full object-cover" />
            ) : (
              <FileIcon className="size-5" />
            )}
          </button>
          <input
            value={node.content ?? ""}
            placeholder="file name…"
            onChange={(e) => onContent(node.id, e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            spellCheck={false}
          />
        </div>
        {footer}
      </div>
      {connectHandle}
    </div>
  );
}
