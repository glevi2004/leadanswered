"use client";

import * as React from "react";
import {
  Hand, MousePointer2, SquareTerminal, FileText, Paperclip,
  Folder, Globe, Type, Pencil, Plus,
} from "lucide-react";

export type CanvasTool =
  | "hand" | "select" | "terminal" | "md" | "files" | "folder" | "site" | "text" | "draw";

const TOOLS: { id: CanvasTool; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: "hand", icon: Hand, label: "Hand — pan the canvas" },
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "terminal", icon: SquareTerminal, label: "Spawn a terminal agent (Claude Code, Codex…)" },
  { id: "md", icon: FileText, label: "Add a markdown doc" },
  { id: "files", icon: Paperclip, label: "Add files" },
  { id: "folder", icon: Folder, label: "Add a folder (library)" },
  { id: "site", icon: Globe, label: "Add a site" },
  { id: "text", icon: Type, label: "Add text" },
  { id: "draw", icon: Pencil, label: "Draw" },
];

/**
 * Canvas toolbar (Cofounder-style, bottom-center). A normal app-style button showing "+";
 * hover it and it EXPANDS — the bar grows wider and the tools cascade in. Leaves collapse
 * it back. Select is the default (cursor).
 */
export function CanvasToolbar({ active, onPick }: { active: CanvasTool; onPick: (t: CanvasTool) => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      data-canvas-toolbar
      className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={`gloss-ink relative flex h-11 items-center overflow-hidden rounded-xl transition-[width,padding-left,padding-right] duration-200 ease-out ${
          open ? "w-[334px] px-1.5" : "w-11 px-0"
        }`}
      >
        {/* + shown when collapsed */}
        <Plus
          className={`pointer-events-none absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary-foreground transition-opacity duration-100 ${
            open ? "opacity-0" : "opacity-100"
          }`}
        />

        {/* tools — cascade in as the bar expands */}
        <div className={`flex items-center gap-0.5 whitespace-nowrap ${open ? "" : "pointer-events-none"}`}>
          {TOOLS.map((t, i) => (
            <React.Fragment key={t.id}>
              {i === 1 && (
                <span
                  className={`mx-1 h-6 w-px shrink-0 bg-primary-foreground/15 transition-opacity duration-150 ${open ? "opacity-100" : "opacity-0"}`}
                  style={{ transitionDelay: open ? "60ms" : "0ms" }}
                />
              )}
              <button
                type="button"
                title={t.label}
                aria-label={t.label}
                onClick={() => onPick(t.id)}
                style={{ transitionDelay: open ? `${40 + i * 22}ms` : "0ms" }}
                className={`grid size-9 shrink-0 place-items-center rounded-lg transition-all duration-150 ${
                  open ? "translate-x-0 opacity-100" : "translate-x-1.5 opacity-0"
                } ${
                  active === t.id
                    ? "bg-primary-foreground text-primary"
                    : "text-primary-foreground/55 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                }`}
              >
                <t.icon className="size-[17px]" />
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
