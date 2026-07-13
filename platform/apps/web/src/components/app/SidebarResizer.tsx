"use client";

import * as React from "react";
import { useSidebar } from "@/components/ui/sidebar";

const MIN = 192;
const MAX = 336;
const DEFAULT = 256;

/**
 * Drag handle on the sidebar's edge — the rail resizes instead of collapsing
 * (no trigger on desktop). Updates --sidebar-width live on the wrapper (no
 * re-render), persists to the sidebar_width cookie, double-click resets.
 */
export function SidebarResizer() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { state } = useSidebar();

  const wrapper = () => ref.current?.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
  const clamp = (x: number) => Math.min(MAX, Math.max(MIN, x));
  const persist = (w: number) => {
    document.cookie = `sidebar_width=${Math.round(w)};path=/;max-age=31536000;samesite=lax`;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = wrapper();
    if (!el) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    el.setAttribute("data-resizing", "true"); // suspends the width transition (globals.css)
    const move = (ev: PointerEvent) => {
      el.style.setProperty("--sidebar-width", `${clamp(ev.clientX)}px`);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      el.removeAttribute("data-resizing");
      persist(clamp(ev.clientX));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const reset = () => {
    wrapper()?.style.setProperty("--sidebar-width", `${DEFAULT}px`);
    persist(DEFAULT);
  };

  if (state === "collapsed") return null; // hidden ⌘B off-canvas state — nothing to resize

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onPointerDown={onPointerDown}
      onDoubleClick={reset}
      className="group fixed inset-y-0 z-30 hidden w-2 cursor-col-resize md:block"
      style={{ left: "calc(var(--sidebar-width) - 4px)" }}
    >
      <div className="mx-auto h-full w-[3px] rounded-full bg-transparent transition-colors duration-150 group-hover:bg-primary/25 group-active:bg-primary/40" />
    </div>
  );
}
