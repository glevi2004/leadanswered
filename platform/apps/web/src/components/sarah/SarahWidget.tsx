"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useSarah, type DockTab } from "./sarah-context";
import { DashboardIcon } from "@/components/icons/dashboard";
import { ScheduleIcon } from "@/components/icons/schedule";
import { ContentIcon, TeamIcon, type IconState } from "@/components/icons/nav-icons";
import { Toolbar, type ToolbarItem } from "@/components/ds/Toolbar";
import { Skeleton } from "@/components/ui/skeleton";
import { SarahThread } from "./SarahThread";
import { SarahComposer } from "./SarahComposer";
import { ApprovalCard } from "@/components/app/ApprovalCard";
import { PublishApprovals } from "./PublishApprovals";
import { StatusDot } from "./LuBuildTracker";
import { DockHome } from "./DockHome";
import { DockCompany } from "./DockCompany";
import { DockLibrary } from "./DockLibrary";
import { AgentDockPanel } from "@/components/canvas/AgentDockPanel";
import { SegmentedTabs } from "@/components/ds/SegmentedTabs";
import { SarahIcon } from "@/components/icons/sarah";
import { useDockData, useOnboardingMode, taskStatusLabel, type DockTask } from "@/lib/dock/live";
import { cn } from "@/lib/utils";

const DOCK_TABS: DockTab[] = ["home", "lu", "company", "tasks", "library"];

/**
 * The dock body. When an agent is selected on the canvas it shows that agent's panel (with a
 * Back); otherwise a tab row (Home · Lu · Company · Tasks · Library — the cofounder structure
 * from canvas.md) switches the view. `dockTab` lives in context so any tab can navigate (e.g.
 * a Home clarification → Lu); default "lu" so today's chat is the out-of-the-box behavior.
 */
function PanelBody() {
  const { selectedAgent, setSelectedAgent, dockTab, setDockTab, setWidgetOpen } = useSarah();

  return (
    // The header is NOT a card — it's the segmented tab bar sitting directly on the frame. The
    // content is ONE full-width card (same width as the frame) stacked right below it, so the
    // two read as two cards stacked on top of each other (the frame's top + the content card).
    <div className="flex min-h-0 flex-1 flex-col [--bubble-surface:var(--card)]">
      <div className="flex shrink-0 items-center gap-1 px-3 py-3">
        {/* the small collapse control, left of the tabs — collapses the dock to its icon rail */}
        {!selectedAgent && (
          <button
            type="button"
            aria-label="Collapse"
            title="Collapse (⌘/)"
            onClick={() => setWidgetOpen(false)}
            className="press shrink-0 rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
          >
            <ChevronsRight className="size-4" />
          </button>
        )}
        {selectedAgent ? (
          <button
            type="button"
            onClick={() => setSelectedAgent(null)}
            className="press flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <SegmentedTabs items={DOCK_TABS} active={dockTab} onChange={setDockTab} fill />
          </div>
        )}
      </div>

      {/* The content card — full width, flush to the frame, stacked below the header. */}
      <div className="neu-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-2xl bg-card">
        {selectedAgent ? (
          <AgentDockPanel dept={selectedAgent} />
        ) : dockTab === "lu" ? (
          <ChatTab />
        ) : dockTab === "home" ? (
          <DockHome />
        ) : dockTab === "company" ? (
          <DockCompany />
        ) : dockTab === "library" ? (
          <DockLibrary />
        ) : (
          <TasksTab />
        )}
      </div>
    </div>
  );
}

/** The Lu chat — the existing thread (escalations + approvals + thread + composer). */
function ChatTab() {
  const { approvals, escalations, beginEscalationAnswer, messages, typing, widgetOpen } = useSarah();
  // Lu speaks first (roadmap Ch.0): during onboarding her kickoff opener is already in the
  // thread, so there's no onboarding empty-state — the composer just gets a matching placeholder.
  const onboarding = useOnboardingMode(widgetOpen);
  // Post-onboarding empty thread: an honest prompt instead of a seeded template "Lu message".
  const buildIntro = !onboarding && messages.length === 0;
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {buildIntro && (
          <div className="px-2 py-6 text-center">
            <h2 className="text-lg font-semibold text-foreground">What should we build?</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Tell me the goal. I&apos;ll draft a plan for your approval, then the Engineer ships it
              to your own GitHub and Vercel.
            </p>
          </div>
        )}
        {/* Real publish gates from the Engineer (polled while the dock is open). */}
        <PublishApprovals active={widgetOpen} />
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
        <SarahComposer showContext placeholder={onboarding ? "Share what you're building…" : undefined} />
      </div>
    </>
  );
}

/** The real, live task list across every department — polled while the dock is open. */
function TasksTab() {
  const { widgetOpen } = useSarah();
  const { tasks, loaded } = useDockData(widgetOpen);
  const open = tasks.filter((t) => t.status !== "done" && t.status !== "failed");
  const closed = tasks.filter((t) => t.status === "done" || t.status === "failed");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Tasks</h2>
        {tasks.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {open.length} open
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Every task across your departments, and what needs you.</p>

      {!loaded ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No tasks yet. Ask Lu to get a department working.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {open.length > 0 && (
            <div className="space-y-2">
              {open.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
          {closed.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Done</p>
              <div className="space-y-2">
                {closed.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** One row of the live task list — status dot, title, owning department, status label. */
function TaskRow({ task }: { task: DockTask }) {
  // §8b: every Row clicks through to the Task Detail — the one hub.
  return (
    <Link
      href={`/task/${task.id}`}
      className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
    >
      <StatusDot status={task.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{task.title}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">{task.departmentKey}</p>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{taskStatusLabel(task.status)}</span>
    </Link>
  );
}

/** Each tab's animated nav icon (the old sidebar's), shown on the collapsed rail. */
const TAB_ICONS: Record<DockTab, React.ComponentType<{ state?: IconState; className?: string }>> = {
  home: DashboardIcon,
  lu: SarahIcon,
  company: TeamIcon,
  tasks: ScheduleIcon,
  library: ContentIcon,
};

/**
 * The collapsed dock — the reusable `Toolbar`, vertical + `surface` variant (the canvas toolbar,
 * color-flipped): the expand control on top, then each tab's animated icon. Tapping a tab expands
 * the dock to it.
 */
function DockRail() {
  const { dockTab, setDockTab, setWidgetOpen } = useSarah();
  const items: ToolbarItem[] = [
    {
      key: "expand",
      label: "Expand (⌘/)",
      onClick: () => setWidgetOpen(true),
      render: () => <ChevronsLeft className="size-[17px]" />,
    },
    ...DOCK_TABS.map((t): ToolbarItem => {
      const Icon = TAB_ICONS[t];
      return {
        key: t,
        label: t[0].toUpperCase() + t.slice(1),
        active: dockTab === t,
        dividerBefore: t === DOCK_TABS[0],
        onClick: () => {
          setDockTab(t);
          setWidgetOpen(true);
        },
        render: () => <Icon state="idle" className="size-[17px]" />,
      };
    }),
  ];
  return <Toolbar items={items} orientation="vertical" variant="surface" />;
}

// Dock resize bounds.
const DOCK_MIN = 320;
const DOCK_MAX = 640;
const DOCK_DEFAULT = 380;

/**
 * THE chat sidebar — a single floating card on the right of the canvas, always present. The »
 * button in its header collapses it to the icon rail (the canvas-toolbar pill, vertical); it
 * never disappears, it cross-fades. Drag its left edge to resize (persisted). Desktop only.
 */
export function SarahDock() {
  const { widgetOpen } = useSarah();
  const frameRef = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(DOCK_DEFAULT);

  React.useEffect(() => {
    const saved = Number(window.localStorage.getItem("lu_dock_width"));
    if (saved >= DOCK_MIN && saved <= DOCK_MAX) setWidth(saved);
  }, []);

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const clamp = (x: number) => Math.min(DOCK_MAX, Math.max(DOCK_MIN, x));
    const move = (ev: PointerEvent) => {
      const right = frameRef.current?.getBoundingClientRect().right ?? window.innerWidth;
      setWidth(clamp(right - ev.clientX));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
      setWidth((w) => {
        window.localStorage.setItem("lu_dock_width", String(Math.round(w)));
        return w;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div className="fixed inset-y-3 right-3 z-40 hidden md:block">
      {/* expanded frame */}
      <div
        ref={frameRef}
        style={{ width }}
        className={cn(
          "elev-4 absolute inset-y-0 right-0 flex origin-right flex-col overflow-hidden rounded-[26px] border bg-background text-foreground transition-[opacity,transform] duration-200 ease-out",
          widgetOpen ? "opacity-100" : "pointer-events-none translate-x-2 scale-95 opacity-0",
        )}
      >
        {/* drag-to-resize handle on the left edge */}
        {widgetOpen && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize Lu"
            onPointerDown={onResizeStart}
            onDoubleClick={() => {
              setWidth(DOCK_DEFAULT);
              window.localStorage.setItem("lu_dock_width", String(DOCK_DEFAULT));
            }}
            className="group absolute inset-y-0 left-0 z-20 w-2 cursor-col-resize"
          >
            <div className="mx-auto h-full w-[3px] rounded-full bg-transparent transition-colors duration-150 group-hover:bg-primary/25 group-active:bg-primary/40" />
          </div>
        )}
        <PanelBody />
      </div>
      {/* collapsed rail — the gloss toolbar pill */}
      <div
        className={cn(
          "absolute right-0 top-0 transition-opacity duration-200",
          widgetOpen ? "pointer-events-none opacity-0" : "opacity-100 delay-100",
        )}
      >
        <DockRail />
      </div>
    </div>
  );
}

/** Mobile: the same sidebar card as a bottom sheet, with a FAB to reopen when collapsed. */
export function SarahWidget() {
  const { widgetOpen, setWidgetOpen } = useSarah();

  if (!widgetOpen) {
    return (
      <button
        type="button"
        aria-label="Open Lu"
        onClick={() => setWidgetOpen(true)}
        className="gloss-ink press fixed bottom-4 right-4 z-50 grid size-11 place-items-center rounded-full text-white md:hidden"
      >
        <SarahIcon className="size-5" />
      </button>
    );
  }

  return (
    <div className="widget-in elev-4 fixed inset-x-3 bottom-4 top-16 z-50 flex flex-col overflow-hidden rounded-[26px] border bg-background text-foreground md:hidden">
      {/* collapse (mobile) */}
      <button
        type="button"
        aria-label="Collapse Lu"
        onClick={() => setWidgetOpen(false)}
        className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <ChevronsRight className="size-4" />
      </button>
      <PanelBody />
    </div>
  );
}
