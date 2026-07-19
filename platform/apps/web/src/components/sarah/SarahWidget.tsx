"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useSarah, type DockTab } from "./sarah-context";
import { DashboardIcon } from "@/components/icons/dashboard";
import { ScheduleIcon } from "@/components/icons/schedule";
import { ContentIcon, TeamIcon, type IconState } from "@/components/icons/nav-icons";
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
      <div className="flex shrink-0 items-center gap-1.5 px-3 py-3">
        {/* the small collapse control, left of the tabs — collapses the dock to its icon rail */}
        {!selectedAgent && (
          <button
            type="button"
            aria-label="Collapse"
            title="Collapse (⌘/)"
            onClick={() => setWidgetOpen(false)}
            className="press grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronsRight className="size-3.5" />
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

      {tasks.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {loaded ? "No tasks yet. Ask Lu to get a department working." : "Loading…"}
        </p>
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
 * The collapsed dock — a vertical icon rail (like the canvas toolbar, turned vertical): the
 * expand control on top, then each tab's animated icon. Tapping an icon expands to that tab.
 */
function DockRail() {
  const { dockTab, setDockTab, setWidgetOpen } = useSarah();
  const [hovered, setHovered] = React.useState<DockTab | null>(null);
  return (
    <div className="flex h-full w-[60px] flex-col items-center gap-1 py-3">
      <button
        type="button"
        aria-label="Expand Lu"
        title="Expand (⌘/)"
        onClick={() => setWidgetOpen(true)}
        className="press grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ChevronsLeft className="size-4" />
      </button>
      <div className="mt-1 flex flex-col items-center gap-1">
        {DOCK_TABS.map((t) => {
          const Icon = TAB_ICONS[t];
          const active = dockTab === t;
          return (
            <button
              key={t}
              type="button"
              aria-label={t}
              title={t[0].toUpperCase() + t.slice(1)}
              onMouseEnter={() => setHovered(t)}
              onMouseLeave={() => setHovered((h) => (h === t ? null : h))}
              onClick={() => {
                setDockTab(t);
                setWidgetOpen(true);
              }}
              className={cn(
                "grid size-9 place-items-center rounded-lg transition-colors [&>svg]:size-[18px]",
                active ? "gloss text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon state={active ? "active" : hovered === t ? "hover" : "idle"} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * THE chat sidebar — a single floating card on the right of the canvas, always present. The «
 * button in its header collapses it SMOOTHLY (width transition) to a vertical icon rail; it
 * never disappears. Desktop only; mobile uses SarahWidget.
 */
export function SarahDock() {
  const { widgetOpen } = useSarah();
  return (
    <div
      className={cn(
        "elev-4 fixed inset-y-3 right-3 z-40 hidden overflow-hidden rounded-[26px] border bg-background text-foreground transition-[width] duration-300 ease-out md:block",
        widgetOpen ? "w-[380px]" : "w-[60px]",
      )}
    >
      {/* expanded content — fixed 380 width so it CLIPS (not reflows) as the frame narrows */}
      <div
        className={cn(
          "absolute inset-0 flex w-[380px] flex-col transition-opacity duration-200",
          widgetOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <PanelBody />
      </div>
      {/* collapsed icon rail */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 transition-opacity duration-200",
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
