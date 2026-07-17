import { cn } from "@/lib/utils";
import { Frame, Cap, GalleryHeading, KindChip } from "../_ui";
import { TaskCard, TaskStage } from "@/components/ds/TaskCard";
import { PixelIcon, PixelTile, DeptIcon, type Dept } from "@/components/ds/PixelIcon";

const DEPTS: { dept: Dept; label: string }[] = [
  { dept: "ops", label: "Ops" }, { dept: "finance", label: "Finance" }, { dept: "legal", label: "Legal" }, { dept: "engineering", label: "Eng" },
  { dept: "design", label: "Design" }, { dept: "marketing", label: "Marketing" }, { dept: "sales", label: "Sales" }, { dept: "support", label: "Support" },
];
import { MeterBar } from "@/components/ds/MeterBar";
import { PixelMeter } from "@/components/ds/PixelMeter";

/* ApprovalCard twin — kind chip, title + Lu's proposed action, a mono preview
   snippet, and the approve / request-changes / dismiss footer row. */
function ApprovalCardDemo({
  kind,
  title,
  summary,
  preview,
  age,
}: {
  kind: string;
  title: string;
  summary: string;
  preview: string;
  age: string;
}) {
  return (
    <div className="neu-card flex flex-col gap-3 rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <KindChip kind={kind} />
        <span className="font-mono text-[11px] text-muted-foreground">{age}</span>
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-[13px] text-muted-foreground">{summary}</p>
      </div>
      <div className="neu-socket whitespace-pre-line rounded-xl px-3 py-2.5 font-mono text-[12px] leading-relaxed text-foreground/80">
        {preview}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button className="gloss-ink rounded-lg px-3 py-1.5 text-[12px] font-medium">Approve</button>
        <button className="gloss rounded-lg px-3 py-1.5 text-[12px] font-medium text-foreground/80">
          Request changes
        </button>
        <button className="gloss rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground">
          Dismiss
        </button>
      </div>
    </div>
  );
}

/* Compact vertical stepper — a column of steps with connectors; active raised
   (neu-card-active), done gets an emerald check, upcoming recessed (neu-card-in). */
const VERTICAL_STEPS = [
  { title: "Connect your tools", state: "done", note: "Done" },
  { title: "Bring your data in", state: "active", note: "In progress" },
  { title: "Turn on the agent", state: "todo", note: "Up next" },
  { title: "Invite your team", state: "locked", note: "Needs earlier steps first" },
] as const;

function VerticalStepper() {
  return (
    <div className="max-w-sm">
      {VERTICAL_STEPS.map((s, i) => {
        const done = s.state === "done";
        const active = s.state === "active";
        const locked = s.state === "locked";
        return (
          <div key={s.title} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-medium",
                  done ? "bg-emerald-500/15 text-emerald-600" : active ? "gloss-ink" : "neu-chip text-muted-foreground",
                )}
              >
                {done ? (
                  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8.5 6.5 12 13 4.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              {i < VERTICAL_STEPS.length - 1 && <span className="w-px flex-1 bg-border/70" />}
            </div>
            <div
              className={cn(
                "mb-3 flex-1 rounded-xl px-3 py-2.5 transition",
                active ? "neu-card-active" : done ? "neu-card" : "neu-card-in",
                locked && "opacity-55",
              )}
            >
              <p className="text-[13px] font-medium text-foreground">{s.title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.note}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SecCards() {
  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="ApprovalCard · RoadmapStepper · DepartmentPage · EmptyState · GatedState · ModuleStub">
        App components — cards, states &amp; roadmap
      </GalleryHeading>

      <Frame title="Approval card" tag="neu-card · kind chip · gloss-ink approve">
        <div className="grid gap-4 sm:grid-cols-2">
          <ApprovalCardDemo
            kind="quote"
            age="1h"
            title="Quote for Meridian Facilities — $4,200"
            summary="Lu drafted a quote after reviewing the loading-dock site visit notes."
            preview={`"Hi Marcus — here's the quote we discussed: dock leveler repair + seal\nreplacement, $4,200, 2-week turnaround. Let me know if you'd like to proceed."`}
          />
          <ApprovalCardDemo
            kind="site"
            age="34m"
            title="Publish updated pricing page"
            summary="Lu refreshed the pricing copy and wants to push the change live."
            preview={`$ site/pricing.md\n+ Starter — $49/mo\n+ Growth — $149/mo\n+ Scale — custom`}
          />
        </div>
      </Frame>

      <Frame title="Roadmap — TaskCard / TaskStage" tag="canvas-dots · mixed kinds &amp; states">
        <div className="canvas-dots -mx-2 flex items-start gap-5 overflow-x-auto rounded-2xl px-2 py-4">
          <TaskStage label="IDEA" count="2/2">
            <TaskCard title="Pick a company name" kind="user" state="done" />
            <TaskCard title="Define positioning statement" kind="agent" state="done" />
          </TaskStage>
          <TaskStage label="INITIAL" count="1/3">
            <TaskCard title="Register the company" kind="user" state="done" />
            <TaskCard title="Review incorporation filing" kind="approval" state="active" />
            <TaskCard title="Open business bank account" kind="agent" state="todo" />
          </TaskStage>
          <TaskStage label="IDENTITY" count="0/2">
            <TaskCard title="Design the logo &amp; brand kit" kind="agent" state="locked" />
            <TaskCard title="Approve brand guidelines" kind="approval" state="locked" />
          </TaskStage>
        </div>
        <Cap>compact vertical stepper — connectors · raised active · emerald check</Cap>
        <div className="mt-3">
          <VerticalStepper />
        </div>
      </Frame>

      <Frame title="Department page header" tag="dept pixel icon · progress · panel trio">
        <Cap>the eight departments — one pixel glyph + hue each</Cap>
        <div className="mb-5 mt-2 flex flex-wrap gap-2.5">
          {DEPTS.map((d) => (
            <div key={d.dept} className="flex flex-col items-center gap-1.5">
              <span className="neu-chip grid size-11 place-items-center rounded-xl"><DeptIcon dept={d.dept} size={22} /></span>
              <span className="font-mono text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="neu-chip grid size-12 shrink-0 place-items-center rounded-2xl">
              <DeptIcon dept="marketing" size={26} />
            </span>
            <div>
              <h3 className="t-h1 text-foreground">Marketing Department</h3>
              <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
                Lu plans campaigns, writes copy, and keeps the content calendar moving.
              </p>
            </div>
          </div>
          <div className="flex min-w-[160px] items-center gap-2">
            <MeterBar value={62} tone="violet" className="w-32" height="h-2.5" />
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">62%</span>
          </div>
        </div>

        <Cap>panel trio — Agent / Roadmap / Recent activity</Cap>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="neu-card rounded-2xl bg-card p-4">
            <div className="t-caption">Agent</div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <span className="neu-chip grid size-8 shrink-0 place-items-center rounded-lg">
                <PixelIcon glyph="sparkle" color="violet" size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-foreground">Lu — Marketing</p>
                <p className="text-[11px] text-muted-foreground">Active now</p>
              </div>
            </div>
          </div>
          <div className="neu-card rounded-2xl bg-card p-4">
            <div className="t-caption">Roadmap</div>
            <p className="mt-2.5 text-[13px] font-medium text-foreground">3/8 steps done</p>
            <PixelMeter className="mt-2.5" value={38} tone="violet" segments={20} />
          </div>
          <div className="neu-card rounded-2xl bg-card p-4">
            <div className="t-caption">Recent activity</div>
            <p className="mt-2.5 text-[13px] text-foreground">Published &ldquo;Summer service specials&rdquo; post</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">12m ago</p>
          </div>
        </div>
      </Frame>

      <Frame title="Empty · Gated · Stub" tag="dashed well · glass-hero + dither · neu-card-in">
        <div className="grid gap-5 lg:grid-cols-3">
          {/* EmptyState — terminal mono variant */}
          <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-border px-5 py-9 text-center font-mono">
            <PixelIcon glyph="sparkle" color="green" size={22} />
            <p className="mt-1 text-sm font-medium text-foreground">All caught up</p>
            <p className="max-w-[16rem] text-xs text-muted-foreground">No threads match this inbox view.</p>
          </div>

          {/* GatedState — glass-hero over a pixel-dither tint block */}
          <div className="relative overflow-hidden rounded-2xl">
            <div className="pixel-dither absolute inset-0 bg-violet-500/20" aria-hidden />
            <div className="glass-hero relative flex flex-col items-center gap-3 rounded-2xl px-5 py-9 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-foreground/10 text-foreground">
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="4" y="7" width="8" height="6" rx="1" />
                  <path d="M6 7V5.5a2 2 0 0 1 4 0V7" />
                </svg>
              </span>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-foreground/70">
                  Coming to your OS
                </p>
                <h4 className="t-title mt-1 text-foreground">Legal Department</h4>
                <p className="mx-auto mt-1 max-w-[15rem] text-[13px] text-foreground/80">
                  &ldquo;Lu keeps contracts, filings, and compliance dates handled — before they become
                  fires.&rdquo;
                </p>
              </div>
              <button className="gloss-ink mt-1 rounded-lg px-3 py-1.5 text-[12px] font-medium">
                Ask Lu about it
              </button>
            </div>
          </div>

          {/* ModuleStub — coming-soon tile */}
          <div className="neu-card-in flex flex-col items-center gap-3 rounded-2xl px-5 py-9 text-center">
            <PixelTile size={48}>
              <PixelIcon glyph="folder" color="amber" size={24} />
            </PixelTile>
            <div>
              <p className="text-sm font-medium text-foreground">App coming soon</p>
              <p className="mt-1 max-w-[15rem] text-[13px] text-muted-foreground">
                This module isn&apos;t built yet — Lu will let you know when it ships.
              </p>
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}
