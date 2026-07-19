"use client";

import {
  Hand, MousePointer2, SquareTerminal, FileText, Paperclip,
  Folder, Globe, Type, Pencil, Plus,
} from "lucide-react";
import { Toolbar, type ToolbarItem } from "@/components/ds/Toolbar";

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
 * Canvas toolbar (Cofounder-style, bottom-center) — an instance of the reusable `Toolbar`:
 * hover the "+" and it expands, the tools cascade in. Select is the default (cursor).
 */
export function CanvasToolbar({ active, onPick }: { active: CanvasTool; onPick: (t: CanvasTool) => void }) {
  const items: ToolbarItem[] = TOOLS.map((t, i) => ({
    key: t.id,
    label: t.label,
    active: active === t.id,
    onClick: () => onPick(t.id),
    dividerBefore: i === 1,
    render: () => <t.icon className="size-[17px]" />,
  }));
  return (
    <div data-canvas-toolbar className="absolute bottom-5 left-1/2 z-30 -translate-x-1/2">
      <Toolbar
        items={items}
        orientation="horizontal"
        variant="ink"
        expandOnHover
        expandedSize={334}
        collapsed={<Plus className="size-5 text-primary-foreground" />}
      />
    </div>
  );
}
