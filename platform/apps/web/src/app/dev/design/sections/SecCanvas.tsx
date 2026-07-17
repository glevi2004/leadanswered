"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Frame, Cap, GalleryHeading } from "../_ui";
import { PixelIcon } from "@/components/ds/PixelIcon";
import { DeptIcon, type Dept } from "@/components/ds/PixelIcon";

/* Minimal stroke line-icons (chevrons/controls) — the opposite of the pixel asset icons. */
function Ico({ children, className = "size-3.5" }: { children: React.ReactNode; className?: string }) {
  return <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
const IconChevronLeft = (p: { className?: string }) => <Ico {...p}><path d="M10 3.5 5.5 8 10 12.5" /></Ico>;
const IconChevronRight = (p: { className?: string }) => <Ico {...p}><path d="M6 3.5 10.5 8 6 12.5" /></Ico>;
const IconChevronDown = (p: { className?: string }) => <Ico {...p}><path d="M3.5 6 8 10.5 12.5 6" /></Ico>;
const IconReload = (p: { className?: string }) => <Ico {...p}><path d="M12.3 5.2A5 5 0 1 0 13 9" /><path d="M12.4 2.3v3.3H9.1" /></Ico>;
const IconCheck = (p: { className?: string }) => <Ico {...p}><path d="M3.5 8.6 6.3 11.5 12.5 4.5" /></Ico>;
const IconBell = (p: { className?: string }) => <Ico {...p}><path d="M8 2.6c-.9 0-1.6.72-1.6 1.6v.24C5.1 5 4 6.5 4 8.3v2l-1 1.7h10l-1-1.7v-2c0-1.8-1.1-3.3-2.4-3.86v-.24c0-.88-.7-1.6-1.6-1.6Z" /><path d="M6.5 12.6a1.5 1.5 0 0 0 3 0" /></Ico>;
const IconPlus = (p: { className?: string }) => <Ico {...p}><path d="M8 3.5v9" /><path d="M3.5 8h9" /></Ico>;
const IconArrowUp = (p: { className?: string }) => <Ico {...p}><path d="M8 12.5v-9" /><path d="M4.3 6.8 8 3.5l3.7 3.3" /></Ico>;
const IconHand = (p: { className?: string }) => <Ico {...p}><path d="M5.2 8.2V4.6a1 1 0 0 1 2 0v3" /><path d="M7.2 7.8V3.6a1 1 0 0 1 2 0v4.2" /><path d="M9.2 8V4.4a1 1 0 0 1 2 0v4.4" /><path d="M11.2 9.2V6.8a1 1 0 0 1 2 0v3.4c0 2.4-1.4 3.8-3.8 3.8H8c-1.1 0-1.9-.5-2.6-1.5l-1.6-2.3c-.4-.55-.2-1.2.35-1.5.5-.28 1.05-.1 1.35.32L6.6 11" /></Ico>;
const IconCursor = (p: { className?: string }) => <Ico {...p}><path d="M4 2.8 12.2 7l-3.4.5 1.6 3.6-1.5.7-1.7-3.7L4.8 11z" fill="currentColor" stroke="none" /></Ico>;
const IconTerminal = (p: { className?: string }) => <Ico {...p}><rect x="2.4" y="3.4" width="11.2" height="9.2" rx="1.6" /><path d="M5 6.6 7 8.2 5 9.8" /><path d="M8.4 9.8h2.2" /></Ico>;
const IconGlobe = (p: { className?: string }) => <Ico {...p}><circle cx="8" cy="8" r="5.4" /><path d="M2.6 8h10.8" /><path d="M8 2.6c1.9 1.9 1.9 8.9 0 10.8" /><path d="M8 2.6c-1.9 1.9-1.9 8.9 0 10.8" /></Ico>;
const IconType = (p: { className?: string }) => <Ico {...p}><path d="M4 4.2h8" /><path d="M8 4.2v7.6" /></Ico>;

const TOOLS = [IconHand, IconCursor, IconTerminal, IconGlobe, IconType];
const FILES: { name: string; glyph: "folder" | "file" | "app" | "sparkle" | "chart"; color: "blue" | "green" | "amber" | "violet"; size: string }[] = [
  { name: "marketing-site/", glyph: "folder", color: "blue", size: "12 files" },
  { name: "landing-page.tsx", glyph: "file", color: "blue", size: "4.1 kb" },
  { name: "brand-brief.md", glyph: "file", color: "violet", size: "2.8 kb" },
  { name: "pricing-table.json", glyph: "file", color: "green", size: "1.3 kb" },
];
const UPDATE_AVATARS = [{ i: "E", color: "#3b82f6" }, { i: "D", color: "#8b5cf6" }, { i: "S", color: "#f59e0b" }];
const NODES: { id: string; label: string; dept: Dept; left: string; top: number; dim?: boolean }[] = [
  { id: "engineering", label: "Engineering", dept: "engineering", left: "20%", top: 60 },
  { id: "design", label: "Design", dept: "design", left: "80%", top: 60 },
  { id: "legal", label: "Legal", dept: "legal", left: "50%", top: 230, dim: true },
];
const ACTIONS: { key: string; label: string; check?: boolean }[] = [
  { key: "publish", label: "Publish to Staging", check: true },
  { key: "revert", label: "Revert All" },
  { key: "changes", label: "Request changes" },
];

export default function SecCanvas() {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [tool, setTool] = useState(1);
  const [updates, setUpdates] = useState(4);
  const [selected, setSelected] = useState<string>("lu");
  const [action, setAction] = useState<string>("publish");

  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="BrowserChrome · CanvasToolbar · AgentDockPanel · CompanyCanvas nodes">App components — canvas</GalleryHeading>

      <Frame title="Browser chrome — focused site" tag="traffic lights · URL pill · task pill · action bar — click an action">
        <div className="flex flex-col items-center py-2">
          <div className="relative w-full max-w-md pt-4 pb-12">
            <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 whitespace-nowrap">
              <div className="gloss-ink flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px]">
                <span className="font-semibold">Engineer</span>
                <span className="text-primary-foreground/45">·</span>
                <span className="max-w-[170px] truncate text-primary-foreground/70">Build marketing website</span>
                <IconChevronDown className="size-2.5 text-primary-foreground/55" />
              </div>
            </div>
            <div className="elev-3 overflow-hidden rounded-[14px] bg-card">
              <div className="flex h-9 shrink-0 items-center gap-2 border-b border-black/[0.06] bg-muted/60 px-3 dark:border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" /><span className="size-2.5 rounded-full bg-[#febc2e]" /><span className="size-2.5 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground/70"><IconChevronLeft className="size-3" /><IconChevronRight className="size-3" /><IconReload className="size-2.5" /></div>
                <div className="flex min-w-0 flex-1 items-center gap-1 truncate rounded-md bg-background/80 px-2 py-1 text-[11px] ring-1 ring-black/[0.04] dark:ring-white/[0.05]">
                  <span className="font-medium text-foreground">Landing</span><span className="truncate text-muted-foreground">/ localhost:3001</span>
                </div>
                <button type="button" className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] text-muted-foreground/80">Viewing landing page <IconChevronDown className="size-2.5" /></button>
              </div>
              <div className="neu-inset flex flex-col gap-3 bg-background p-5">
                <div className="h-3 w-2/5 rounded bg-foreground/10" />
                <div className="h-20 w-full rounded-lg bg-foreground/[0.06]" />
                <div className="grid grid-cols-3 gap-2"><div className="h-12 rounded-lg bg-foreground/[0.06]" /><div className="h-12 rounded-lg bg-foreground/[0.06]" /><div className="h-12 rounded-lg bg-foreground/[0.06]" /></div>
              </div>
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div className="gloss flex items-center gap-0.5 rounded-full p-0.5 text-[11px]">
                {ACTIONS.map((a) => (
                  <button key={a.key} type="button" onClick={() => setAction(a.key)}
                    className={cn("flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition", action === a.key ? "gloss-ink text-white" : "text-muted-foreground hover:text-foreground")}>
                    {a.check && action === a.key && <IconCheck className="size-2.5" />} {a.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Frame>

      <Frame title="Canvas toolbar + FAB + agent-updates pill" tag="click + to open tools · click Review to clear (interactive, ref-75)">
        <div className="canvas-grid relative overflow-hidden rounded-2xl border border-border/60" style={{ height: 220 }}>
          {updates > 0 ? (
            <div className="glass absolute bottom-5 left-5 flex items-center gap-2.5 rounded-full py-1.5 pl-2 pr-2">
              <span className="relative grid size-7 place-items-center rounded-full text-muted-foreground">
                <IconBell className="size-4" />
                <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-card" />
              </span>
              <span className="flex -space-x-2">
                {UPDATE_AVATARS.map((a) => <span key={a.i} className="grid size-6 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-card" style={{ background: a.color }}>{a.i}</span>)}
              </span>
              <span className="text-sm font-medium text-foreground">{updates} agent updates</span>
              <button type="button" onClick={() => setUpdates(0)} className="gloss press ml-1 rounded-full px-3 py-1 text-sm font-medium text-foreground">Review</button>
            </div>
          ) : (
            <div className="glass absolute bottom-5 left-5 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-muted-foreground">
              <IconCheck className="size-3.5 text-emerald-500" /> All caught up
            </div>
          )}

          {/* FAB → expands to the tool cluster (ref-75) */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
            {toolsOpen ? (
              <div className="gloss-ink flex h-11 items-center gap-0.5 rounded-xl px-1.5">
                {TOOLS.map((T, i) => (
                  <button key={i} type="button" onClick={() => setTool(i)}
                    className={cn("grid size-9 place-items-center rounded-lg transition", i === tool ? "bg-primary-foreground text-primary" : "text-primary-foreground/55 hover:text-primary-foreground")}>
                    <T className="size-[17px]" />
                  </button>
                ))}
                <button type="button" onClick={() => setToolsOpen(false)} aria-label="Collapse tools" className="ml-0.5 grid size-9 place-items-center rounded-lg text-primary-foreground/55 hover:text-primary-foreground"><IconChevronLeft className="size-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => setToolsOpen(true)} aria-label="Open tools" className="gloss-ink press grid size-11 place-items-center rounded-xl text-white"><IconPlus className="size-5" /></button>
            )}
          </div>
        </div>
        <Cap>the collapsed + FAB expands into the tool cluster; the updates pill clears on Review</Cap>
      </Frame>

      <Frame title="Agent dock panel" tag="AgentDockPanel · pixel-icon artifacts · neu-socket input">
        <div className="neu-card-in flex flex-col gap-3 rounded-2xl bg-card p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {FILES.map((f) => (
              <button key={f.name} className="neu-card hover-lift press flex flex-col items-center gap-2 rounded-xl bg-card p-3 text-center">
                <PixelIcon glyph={f.glyph} color={f.color} size={32} />
                <span className="w-full truncate text-[12px] font-medium text-foreground">{f.name}</span>
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{f.size}</span>
              </button>
            ))}
          </div>
          <div className="neu-card hover-lift flex items-center gap-3 rounded-xl bg-card p-3">
            <PixelIcon glyph="chart" color="violet" size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-medium text-foreground">Q3-roadmap.png</div>
              <div className="font-mono text-[11px] text-muted-foreground">1.2 MB · generated</div>
            </div>
          </div>
          <div className="neu-socket mt-1 flex items-center gap-2 rounded-xl bg-background px-3 py-2.5">
            <span className="flex-1 truncate text-[13px] text-muted-foreground">Ask Lu to build something…</span>
            <span className="gloss-ink grid size-7 shrink-0 place-items-center rounded-lg text-white"><IconArrowUp className="size-3.5" /></span>
          </div>
        </div>
      </Frame>

      <Frame title="Canvas nodes + connectors" tag="neu pillows · dept pixel icons · click to select (interactive)">
        <div className="canvas-grid relative overflow-hidden rounded-2xl border border-border/60" style={{ height: 260 }}>
          <svg className="pointer-events-none absolute inset-0 size-full text-foreground" viewBox="0 0 400 260" preserveAspectRatio="none">
            <line x1={200} y1={140} x2={80} y2={60} stroke="currentColor" strokeOpacity={0.28} strokeWidth={1.25} strokeDasharray="5 7" vectorEffect="non-scaling-stroke" />
            <line x1={200} y1={140} x2={320} y2={60} stroke="currentColor" strokeOpacity={0.28} strokeWidth={1.25} strokeDasharray="5 7" vectorEffect="non-scaling-stroke" />
            <line x1={200} y1={140} x2={200} y2={230} stroke="currentColor" strokeOpacity={0.16} strokeWidth={1.25} strokeDasharray="5 7" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="gloss absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: "35%", top: 100 }} />
          <span className="gloss absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: "65%", top: 100 }} />
          <span className="gloss absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" style={{ left: "50%", top: 185 }} />

          {/* Lu — center */}
          <button onClick={() => setSelected("lu")} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "50%", top: 140 }}>
            <div className={cn("neu-socket rounded-[2rem] p-2.5", selected === "lu" && "outline outline-2 outline-offset-2 outline-[#5b9bff]")}>
              <div className="neu-raise flex items-center gap-3 rounded-[1.6rem] px-7 py-4">
                <PixelIcon glyph="sparkle" color="blue" size={22} />
                <span className="text-lg font-semibold tracking-tight text-foreground">Lu</span>
              </div>
            </div>
          </button>

          {NODES.map((n) => (
            <button key={n.id} onClick={() => setSelected(n.id)} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: n.left, top: n.top }}>
              <div className={cn("neu-socket rounded-[1.6rem] p-2", selected === n.id && "outline outline-2 outline-offset-2 outline-[#5b9bff]")}>
                <div className={cn("neu-raise flex items-center gap-2 rounded-[1.2rem] px-4 py-2.5", n.dim && "[&>*]:opacity-45")}>
                  <DeptIcon dept={n.dept} size={18} />
                  <span className="text-[13px] font-medium text-foreground">{n.label}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        <Cap>click a node to select it (blue ring) — depth stays even when a node is dimmed; dept pixel icons per department</Cap>
      </Frame>
    </div>
  );
}
