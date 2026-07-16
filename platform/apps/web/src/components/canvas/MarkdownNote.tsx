"use client";

import * as React from "react";
import { Eye, GripVertical, Pencil, X } from "lucide-react";

/**
 * A small markdown NOTE card (CANVAS-TOOLS.md §5) — a paper frame on the plane with a view/edit
 * toggle. Edit = a textarea; View = rendered markdown. Lives in the RZPP transformed layer at a
 * WORLD top-left so it pans/zooms with the plane; draggable by the grip header. Carries `lu-node`
 * so RZPP never pans from it and the marquee/tool handlers ignore it.
 *
 * DEPENDENCY-FREE renderer: a tiny line-based markdown → HTML pass (headings, bold, italic,
 * inline code, links, ul/ol). No react-markdown / no new deps. v0: local state, no persistence.
 */

export interface MarkdownNoteData {
  id: string;
  x: number; // world top-left
  y: number;
  text: string;
}

const DRAG_CLASS = "lu-node"; // pan-exclusion marker (see CompanyCanvas)
const NOTE_W = 300; // world units

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** only allow safe link targets (this is the user's own note, but keep javascript: out) */
function safeHref(url: string): string | null {
  return /^(https?:|mailto:|\/|#)/i.test(url) ? url : null;
}

function inline(s: string): string {
  // links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, t: string, u: string) => {
    const href = safeHref(u);
    return href
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${t}</a>`
      : t;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

/** Minimal line-based markdown → HTML. Escapes first, then applies block + inline rules. */
export function renderMarkdown(src: string): string {
  const lines = escapeHtml(src).split(/\r?\n/);
  const out: string[] = [];
  let list: "ul" | "ol" | null = null;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };
  for (const line of lines) {
    if (/^\s*$/.test(line)) {
      closeList();
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
      closeList();
      const lvl = m[1].length;
      out.push(`<h${lvl}>${inline(m[2])}</h${lvl}>`);
      continue;
    }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    if ((m = /^\s*\d+\.\s+(.*)$/.exec(line))) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(m[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join("");
}

export function MarkdownNote({
  note,
  getScale,
  onMove,
  onChange,
  onRemove,
  autoFocus,
}: {
  note: MarkdownNoteData;
  getScale: () => number;
  onMove: (id: string, x: number, y: number) => void;
  onChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  autoFocus?: boolean;
}) {
  const [editing, setEditing] = React.useState(!!autoFocus);
  const drag = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const onGripDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, ox: note.x, oy: note.y };
  };
  const onGripMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const s = getScale();
    onMove(note.id, d.ox + (e.clientX - d.sx) / s, d.oy + (e.clientY - d.sy) / s);
  };
  const onGripUp = (e: React.PointerEvent) => {
    drag.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const html = React.useMemo(() => renderMarkdown(note.text || "*Empty note*"), [note.text]);

  return (
    <div
      data-md-note={note.id}
      className={`${DRAG_CLASS} group absolute overflow-hidden rounded-[10px] border border-black/10 bg-white text-neutral-800 elev-3 dark:border-white/10`}
      style={{ left: note.x, top: note.y, width: NOTE_W }}
    >
      {/* the tiny scoped stylesheet for rendered markdown — keeps the parser output clean */}
      <style>{`
        .lu-md{font-size:13px;line-height:1.5}
        .lu-md h1{font-size:16px;font-weight:600;margin:2px 0 6px}
        .lu-md h2{font-size:14px;font-weight:600;margin:2px 0 4px}
        .lu-md h3{font-size:13px;font-weight:600;margin:2px 0 4px}
        .lu-md p{margin:0 0 6px}
        .lu-md ul,.lu-md ol{margin:0 0 6px;padding-left:18px}
        .lu-md li{margin:1px 0}
        .lu-md a{color:#2563eb;text-decoration:underline}
        .lu-md code{background:rgba(0,0,0,0.06);border-radius:4px;padding:0 4px;font-family:var(--font-mono,monospace);font-size:12px}
        .lu-md strong{font-weight:600}
      `}</style>

      {/* grip header — drag handle, view/edit toggle, delete */}
      <div
        className="flex h-6 cursor-grab items-center justify-between border-b border-black/5 bg-black/[0.03] px-1 active:cursor-grabbing dark:border-white/10"
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
      >
        <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
          <GripVertical className="size-3.5 opacity-40" /> md
        </span>
        <span className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={editing ? "Preview" : "Edit"}
            title={editing ? "Preview" : "Edit"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setEditing((v) => !v)}
            className="grid size-5 place-items-center rounded text-neutral-400 hover:bg-black/10 hover:text-neutral-700"
          >
            {editing ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
          </button>
          <button
            type="button"
            aria-label="Delete note"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => onRemove(note.id)}
            className="grid size-5 place-items-center rounded text-neutral-400 opacity-0 transition-opacity hover:bg-black/10 hover:text-neutral-700 group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        </span>
      </div>

      {editing ? (
        <textarea
          ref={taRef}
          value={note.text}
          placeholder={"# Title\n\nWrite **markdown** — lists, [links](https://…), `code`."}
          spellCheck={false}
          onChange={(e) => onChange(note.id, e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          className="block max-h-[280px] w-full resize-none bg-transparent px-3 py-2.5 font-[var(--font-mono,monospace)] text-[12px] leading-relaxed outline-none placeholder:text-neutral-300"
          style={{ minHeight: 120 }}
          rows={7}
        />
      ) : (
        <div
          className="lu-md max-h-[280px] overflow-auto px-3 py-2.5"
          onDoubleClick={() => setEditing(true)}
          onPointerDown={(e) => e.stopPropagation()}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
