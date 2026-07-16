"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronLeft, Maximize2, PanelRight, PictureInPicture2, Plus, X } from "lucide-react";
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
import { AgentDockPanel } from "@/components/canvas/AgentDockPanel";
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
      AI Assistant
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

type DockTab = "home" | "lu" | "company" | "tasks" | "library";
const DOCK_TABS: DockTab[] = ["home", "lu", "company", "tasks", "library"];
const STUB_COPY: Record<string, string> = {
  company: "Your company profile, connections, and the knowledge Lu shares across every department.",
  tasks: "Every task across all departments, and what needs your approval.",
  library: "Reusable agents, spaces, and artifact templates to install into a department.",
};

/**
 * The dock body. When an agent is selected on the canvas it shows that agent's
 * panel (with a Back); otherwise a tab row (Home · Lu · Company · Tasks · Library)
 * switches the view — default "lu" so today's chat is the out-of-the-box behavior.
 */
function PanelBody() {
  const { selectedAgent, setSelectedAgent } = useSarah();
  const [dockTab, setDockTab] = React.useState<DockTab>("lu");

  return (
    <>
      <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
        {selectedAgent ? (
          <button
            type="button"
            onClick={() => setSelectedAgent(null)}
            className="flex items-center gap-0.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="size-3.5" /> Back
          </button>
        ) : (
          DOCK_TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setDockTab(t)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                dockTab === t ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))
        )}
      </div>

      {selectedAgent ? (
        <AgentDockPanel dept={selectedAgent} />
      ) : dockTab === "lu" ? (
        <ChatTab />
      ) : dockTab === "home" ? (
        <HomeTab />
      ) : (
        <StubTab tab={dockTab} />
      )}
    </>
  );
}

/** The Lu chat — the existing thread (escalations + approvals + thread + composer). */
function ChatTab() {
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

/** Home glance — a greeting, the "needs you" count, and suggested next moves. */
function HomeTab() {
  const { ownerName, pendingCount, approvals, escalations } = useSarah();
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
      <h2 className="text-lg font-semibold text-foreground">Good day, {ownerName}</h2>
      <p className="mt-1 text-sm text-muted-foreground">Here&rsquo;s what&rsquo;s on your plate.</p>

      <div className="mt-4 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Needs you</p>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{pendingCount}</span>
        </div>
        {pendingCount === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">All clear — nothing waiting on you.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {escalations.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-sm">
                <span className="size-1.5 shrink-0 rounded-full bg-orange-500" />
                <span className="min-w-0 flex-1 truncate text-foreground">{e.contactName} asked a question</span>
              </div>
            ))}
            {approvals.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
                <span className="min-w-0 flex-1 truncate text-foreground">{a.summary}</span>
                <span className="shrink-0 text-xs text-muted-foreground">approve</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-6 text-sm font-medium text-foreground">Suggested next</p>
      <div className="mt-2.5 space-y-2.5 text-sm text-muted-foreground">
        {["Connect your payment rail", "Launch the review wave", "Put your booking page live"].map((s) => (
          <div key={s} className="flex items-center gap-2.5">
            <span className="size-4 rounded-full border" /> {s}
          </div>
        ))}
      </div>
    </div>
  );
}

/** One-line stub for the Company / Tasks / Library tabs. */
function StubTab({ tab }: { tab: DockTab }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <h2 className="text-base font-semibold capitalize text-foreground">{tab}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{STUB_COPY[tab] ?? ""}</p>
    </div>
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

  // Stay mounted while this is the docked surface so open/close animates its WIDTH like the
  // left sidebar (return null only when the dock isn't the active surface at all).
  if (pathname?.startsWith("/sarah")) return null;
  if (widgetMode !== "docked") return null;

  const clamp = (x: number) => Math.min(DOCK_MAX, Math.max(DOCK_MIN, x));
  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    const el = ref.current;
    if (!el) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    el.style.transition = "none"; // no width easing while actively dragging
    const move = (ev: PointerEvent) => {
      const right = el.getBoundingClientRect().right;
      el.style.setProperty("--sarah-dock", `${clamp(right - ev.clientX)}px`);
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      el.style.removeProperty("transition");
      const right = el.getBoundingClientRect().right;
      window.localStorage.setItem("sarah_dock_width", String(Math.round(clamp(right - ev.clientX))));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    // Outside the rounded frame, on the shell background — the website chat lane's twin. Width
    // animates 0 <-> --sarah-dock (matches ui/sidebar: transition-[width] duration-200 ease-linear);
    // the frame compresses beside it. The inner panel is fixed-width + pinned right so its content
    // doesn't reflow while the width animates — it's simply revealed/hidden.
    <aside
      ref={ref}
      data-open={widgetOpen}
      className={cn(
        "relative hidden shrink-0 overflow-hidden [--bubble-surface:var(--sidebar)] [--sarah-dock:380px] transition-[width] duration-200 ease-linear md:block md:h-svh",
        widgetOpen ? "w-(--sarah-dock)" : "w-0",
      )}
    >
      <div
        inert={!widgetOpen}
        className={cn(
          "absolute inset-y-0 right-0 flex w-(--sarah-dock) flex-col py-2 pl-1 pr-2 transition-transform duration-200 ease-linear",
          widgetOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Same handle anatomy as SidebarResizer: full-height 3px pill at the dock's left edge. */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize Sarah panel"
          className={cn(
            "group absolute inset-y-0 left-0 z-30 w-2 cursor-col-resize",
            !widgetOpen && "pointer-events-none",
          )}
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
      </div>
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
        "widget-in elev-4 fixed inset-x-3 bottom-4 z-50 flex-col overflow-hidden rounded-3xl border bg-card text-card-foreground [--bubble-surface:var(--card)] sm:inset-x-auto sm:right-5 sm:w-[380px]",
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
