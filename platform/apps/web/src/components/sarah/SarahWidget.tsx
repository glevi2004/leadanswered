"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, Maximize2, PanelRight, PictureInPicture2, Plus, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "next/navigation";
import { useSarah } from "./sarah-context";
import { SarahThread } from "./SarahThread";
import { SarahComposer } from "./SarahComposer";
import { ApprovalCard } from "@/components/app/ApprovalCard";
import { SarahIcon } from "@/components/icons/sarah";
import { cn } from "@/lib/utils";

/**
 * The global Sarah surface, Apollo-style (Levi, 2026-07-12): a top-right
 * trigger pill opens a full-height DOCKED lane beside the rounded frame, on
 * the shell background (the frame compresses); a header toggle switches to a
 * FLOATING corner card. Same thread
 * as SMS and /sarah. Hidden on /sarah itself — that page IS the full-screen
 * version. ⌘/ still toggles.
 */

/** The top-right "✦ Sarah" pill — the one entry point (sits with the corner controls). */
export function SarahTrigger() {
  const { widgetOpen, setWidgetOpen, pendingCount } = useSarah();
  const pathname = usePathname();
  if (pathname?.startsWith("/sarah")) return null;

  return (
    // Apollo's "AI Assistant" button: a real tonal button, not a skinny pill (Levi 2026-07-13).
    <button
      type="button"
      aria-pressed={widgetOpen}
      aria-label={widgetOpen ? "Close Sarah" : "Open Sarah (⌘/)"}
      onClick={() => setWidgetOpen(!widgetOpen)}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium shadow-xs transition-colors",
        widgetOpen ? "border-foreground/25 bg-muted text-foreground" : "border-border bg-background hover:bg-muted",
      )}
    >
      <SarahIcon className="size-4" />
      Sarah
      {pendingCount > 0 && !widgetOpen && (
        <span className="flex size-4 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
          {pendingCount}
        </span>
      )}
    </button>
  );
}

function PanelHeader() {
  const { setWidgetOpen, widgetMode, setWidgetMode, startNewChat, chats, activeChatId, switchChat } = useSarah();
  const activeTitle = chats.find((c) => c.id === activeChatId)?.title ?? "New chat";
  const docked = widgetMode === "docked";
  const ModeIcon = docked ? PictureInPicture2 : PanelRight;
  const iconBtn =
    "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <header className="flex shrink-0 items-center justify-between px-3 py-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <SarahIcon className="size-5 shrink-0" />
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-semibold outline-none hover:bg-muted">
            <span className="min-w-0 truncate">{activeTitle}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuItem onClick={startNewChat}>
              <Plus className="size-3.5" /> New chat
            </DropdownMenuItem>
            {chats.map((c) => (
              <DropdownMenuItem key={c.id} onClick={() => switchChat(c.id)}>
                <Check className={c.id === activeChatId ? "size-3.5" : "size-3.5 opacity-0"} />
                <span className="truncate">{c.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button type="button" aria-label="New chat" title="New chat" className={iconBtn} onClick={startNewChat}>
          <Plus className="size-4" />
        </button>
        <button
          type="button"
          aria-label={docked ? "Switch to floating" : "Dock to the side"}
          title={docked ? "Float" : "Dock"}
          className={cn(iconBtn, "hidden md:block")}
          onClick={() => setWidgetMode(docked ? "floating" : "docked")}
        >
          <ModeIcon className="size-4" />
        </button>
        <Link
          href="/sarah"
          aria-label="Open the full Sarah page"
          title="Full page"
          className={iconBtn}
          onClick={() => setWidgetOpen(false)}
        >
          <Maximize2 className="size-4" />
        </Link>
        <button type="button" aria-label="Close" className={iconBtn} onClick={() => setWidgetOpen(false)}>
          <X className="size-4" />
        </button>
      </div>
    </header>
  );
}

function PanelBody() {
  const { approvals, escalations, beginEscalationAnswer, messages, typing } = useSarah();
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {escalations.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {escalations.map((e) => (
              <div key={e.id} className="rounded-xl border bg-background p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-orange-700 dark:text-orange-300">
                  Question · {e.contactName}
                </p>
                <p className="mt-1 text-sm">“{e.question}”</p>
                <button
                  type="button"
                  onClick={() => beginEscalationAnswer(e)}
                  className="mt-2 rounded-full border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  Answer — Sarah passes it along
                </button>
              </div>
            ))}
          </div>
        )}
        {approvals.length > 0 && (
          <div className="mb-3 flex flex-col gap-2">
            {approvals.map((a) => (
              <ApprovalCard key={a.id} approval={a} compact />
            ))}
          </div>
        )}
        <SarahThread messages={messages} typing={typing} />
      </div>
      <div className="shrink-0 px-3 pb-3 pt-1">
        <SarahComposer showContext />
      </div>
    </>
  );
}

// Dock resize bounds (mirrors the website chat lane / SidebarResizer pattern).
const DOCK_MIN = 320;
const DOCK_MAX = 560;
const DOCK_DEFAULT = 380;

/**
 * The docked panel — a flex sibling of the ROUNDED FRAME itself, sitting on
 * the shell background like the website builder's chat lane; the frame
 * compresses beside it (Apollo behavior). Drag the left edge to resize
 * (persisted); double-click resets. Desktop only; on mobile the floating
 * card takes over.
 */
export function SarahDock() {
  const { widgetOpen, widgetMode } = useSarah();
  const pathname = usePathname();
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const saved = Number(window.localStorage.getItem("sarah_dock_width"));
    if (saved >= DOCK_MIN && saved <= DOCK_MAX) ref.current?.style.setProperty("--sarah-dock", `${saved}px`);
  });

  if (pathname?.startsWith("/sarah")) return null;
  if (!widgetOpen || widgetMode !== "docked") return null;

  const clamp = (x: number) => Math.min(DOCK_MAX, Math.max(DOCK_MIN, x));
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => {
      const right = el.getBoundingClientRect().right;
      el.style.setProperty("--sarah-dock", `${clamp(right - ev.clientX)}px`);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      const right = el.getBoundingClientRect().right;
      window.localStorage.setItem("sarah_dock_width", String(Math.round(clamp(right - ev.clientX))));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    // Outside the rounded frame, on the shell background — the website chat lane's twin.
    <aside
      ref={ref}
      className="relative hidden w-(--sarah-dock) shrink-0 flex-col py-2 pl-1 pr-2 [--bubble-surface:var(--sidebar)] [--sarah-dock:380px] md:flex md:h-svh"
    >
      {/* Same handle anatomy as SidebarResizer: full-height 3px pill sitting IN the gutter,
          hugging the frame's edge — not floating inside the dock. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize Sarah panel"
        className="group absolute inset-y-0 -left-3 z-30 w-2 cursor-col-resize"
        onPointerDown={onResizeStart}
        onDoubleClick={() => {
          ref.current?.style.setProperty("--sarah-dock", `${DOCK_DEFAULT}px`);
          window.localStorage.setItem("sarah_dock_width", String(DOCK_DEFAULT));
        }}
      >
        <div className="mx-auto h-full w-[3px] rounded-full bg-transparent transition-colors duration-150 group-hover:bg-primary/25 group-active:bg-primary/40" />
      </div>
      <PanelHeader />
      <PanelBody />
    </aside>
  );
}

/** The floating corner card (Apollo's float mode) — also the mobile fallback for docked mode. */
export function SarahWidget() {
  const { widgetOpen, widgetMode } = useSarah();
  const pathname = usePathname();
  if (pathname?.startsWith("/sarah")) return null;
  if (!widgetOpen) return null;

  return (
    <div
      className={cn(
        "widget-in fixed inset-x-3 bottom-4 z-50 flex-col overflow-hidden rounded-3xl border bg-card text-card-foreground shadow-[0_12px_48px_rgba(16,24,40,0.22)] [--bubble-surface:var(--card)] sm:inset-x-auto sm:right-5 sm:w-[380px]",
        // docked mode renders the dock on md+; this card covers small screens only
        widgetMode === "docked" ? "flex md:hidden" : "flex",
      )}
      style={{ maxHeight: "min(640px, calc(100dvh - 6rem))", height: "min(640px, calc(100dvh - 6rem))" }}
    >
      <PanelHeader />
      <PanelBody />
    </div>
  );
}
