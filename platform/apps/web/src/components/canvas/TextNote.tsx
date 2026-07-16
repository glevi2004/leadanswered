"use client";

import * as React from "react";
import { GripVertical, X } from "lucide-react";

/**
 * A sticky/text note on the plane (CANVAS-TOOLS.md §8). It lives in the RZPP transformed layer
 * (positioned at a WORLD top-left), so it pans/zooms with everything. Drag it by the grip
 * header; type in the textarea. Carries `lu-node` so react-zoom-pan-pinch never pans from it
 * and the marquee/tool handlers ignore presses on it (matching the other canvas nodes).
 *
 * v0: local React state only — no persistence. The parent (CompanyCanvas) owns the array and
 * gets moves/edits/removes via callbacks.
 */

export interface TextNoteData {
  id: string;
  x: number; // world top-left
  y: number;
  text: string;
}

const DRAG_CLASS = "lu-node"; // pan-exclusion marker (see CompanyCanvas)
const NOTE_W = 200; // world units

export function TextNote({
  note,
  getScale,
  onMove,
  onChange,
  onRemove,
  autoFocus,
}: {
  note: TextNoteData;
  getScale: () => number;
  onMove: (id: string, x: number, y: number) => void;
  onChange: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  autoFocus?: boolean;
}) {
  const drag = React.useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  // grow the textarea to fit its content
  const autosize = React.useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, []);
  React.useEffect(() => {
    autosize();
    if (autoFocus) taRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <div
      data-text-note={note.id}
      className={`${DRAG_CLASS} group absolute overflow-hidden rounded-lg border border-black/10 elev-3`}
      style={{ left: note.x, top: note.y, width: NOTE_W, background: "#fef3c7", color: "#3f3a1e" }}
    >
      {/* grip header — drag handle + delete (matches the node drag idiom, own pointer capture) */}
      <div
        className="flex h-6 cursor-grab items-center justify-between px-1 active:cursor-grabbing"
        style={{ background: "rgba(0,0,0,0.05)" }}
        onPointerDown={onGripDown}
        onPointerMove={onGripMove}
        onPointerUp={onGripUp}
      >
        <GripVertical className="size-3.5 opacity-40" />
        <button
          type="button"
          aria-label="Delete note"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onRemove(note.id)}
          className="grid size-4 place-items-center rounded opacity-0 transition-opacity hover:bg-black/10 group-hover:opacity-60"
        >
          <X className="size-3" />
        </button>
      </div>
      <textarea
        ref={taRef}
        value={note.text}
        placeholder="Type a note…"
        spellCheck={false}
        onChange={(e) => {
          onChange(note.id, e.target.value);
          autosize();
        }}
        onBlur={() => {
          if (note.text.trim() === "") onRemove(note.id); // discard an empty note
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="block w-full resize-none bg-transparent px-2.5 py-2 text-[13px] leading-snug outline-none placeholder:text-black/30"
        style={{ minHeight: 44 }}
        rows={2}
      />
    </div>
  );
}
