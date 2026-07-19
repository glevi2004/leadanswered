"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSarah, type DockTab } from "./sarah-context";
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

const DOCK_TABS: DockTab[] = ["home", "lu", "company", "tasks", "library"];

/**
 * The dock body. When an agent is selected on the canvas it shows that agent's panel (with a
 * Back); otherwise a tab row (Home · Lu · Company · Tasks · Library — the cofounder structure
 * from canvas.md) switches the view. `dockTab` lives in context so any tab can navigate (e.g.
 * a Home clarification → Lu); default "lu" so today's chat is the out-of-the-box behavior.
 */
function PanelBody() {
  const { selectedAgent, setSelectedAgent, dockTab, setDockTab } = useSarah();

  return (
    // The header is NOT a card — it's the segmented tab bar sitting directly on the frame. The
    // content is ONE full-width card (same width as the frame) stacked right below it, so the
    // two read as two cards stacked on top of each other (the frame's top + the content card).
    <div className="flex min-h-0 flex-1 flex-col [--bubble-surface:var(--card)]">
      <div className="shrink-0 px-3 py-3">
        {selectedAgent ? (
          <button
            type="button"
            onClick={() => setSelectedAgent(null)}
            className="press flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> Back
          </button>
        ) : (
          <SegmentedTabs items={DOCK_TABS} active={dockTab} onChange={setDockTab} fill />
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

/**
 * THE chat sidebar — a SINGLE floating card inside the canvas (no docked/floating modes, no
 * maximize/close). It floats with a margin all around, overlaying the canvas on the right; the
 * dark frame holds the tab header, and a lighter body card nested inside reads as the second
 * card. Desktop only; on mobile SarahWidget shows the same card as a bottom sheet.
 */
export function SarahDock() {
  const { widgetOpen } = useSarah();
  const pathname = usePathname();
  if (pathname?.startsWith("/sarah")) return null;
  if (!widgetOpen) return null;

  return (
    <div className="widget-in elev-4 fixed inset-y-3 right-3 z-40 hidden w-[380px] flex-col overflow-hidden rounded-[26px] border bg-background text-foreground md:flex">
      <PanelBody />
    </div>
  );
}

/** Mobile: the same sidebar card as a bottom sheet (desktop uses SarahDock). */
export function SarahWidget() {
  const { widgetOpen } = useSarah();
  const pathname = usePathname();
  if (pathname?.startsWith("/sarah")) return null;
  if (!widgetOpen) return null;

  return (
    <div className="widget-in elev-4 fixed inset-x-3 top-16 bottom-4 z-50 flex flex-col overflow-hidden rounded-[26px] border bg-background text-foreground md:hidden">
      <PanelBody />
    </div>
  );
}
