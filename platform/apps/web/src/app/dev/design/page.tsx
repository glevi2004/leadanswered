"use client";

/**
 * Lu Computer — Design System board (DEV-ONLY, /dev/design).
 * A Figma-style canvas of every foundation token + signature component, so we
 * can iterate on the system in one place. Pixel-accented editorial · Wii+Apple
 * zoned materials (neu/gloss = tactile, glass = floating) · all-sans.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { LayoutGrid, List } from "lucide-react";
import { SegmentedTabs } from "@/components/ds/SegmentedTabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PixelMeter } from "@/components/ds/PixelMeter";
import { PixelLoader } from "@/components/ds/PixelLoader";
import { PixelVoice } from "@/components/ds/PixelVoice";
import { PixelWordmark } from "@/components/ds/PixelWordmark";
import { MeterBar } from "@/components/ds/MeterBar";
import { DeltaPill } from "@/components/ds/DeltaPill";
import { StatBlock } from "@/components/ds/StatBlock";
import { PixelIcon, PixelTile } from "@/components/ds/PixelIcon";
import { GlassNav } from "@/components/ds/GlassNav";
import { GamePill } from "@/components/ds/GamePill";
import { TaskCard, TaskStage } from "@/components/ds/TaskCard";
import { AppGallery } from "./sections";

/* ---------- board scaffolding ---------- */

function Frame({ title, tag, children, className }: { title: string; tag?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("relative rounded-[22px] border bg-background/40 p-6", className)}>
      <div className="mb-5 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
        {tag && <span className="font-mono text-[11px] text-muted-foreground">{tag}</span>}
      </div>
      {children}
    </section>
  );
}

function Cap({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{children}</div>;
}

function Swatch({ name, color, className }: { name: string; color?: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className={cn("h-12 w-full rounded-lg border", className)} style={color ? { background: color } : undefined} />
      <div className="font-mono text-[10px] text-muted-foreground">{name}</div>
    </div>
  );
}

/* ---------- inline target-look demos (patterns not yet extracted to ds/) ---------- */

function PageNav() {
  const dots = [0, 1, 2, 3, 4];
  const active = 2;
  return (
    <div className="gloss flex w-10 flex-col items-center gap-2 rounded-full p-1.5">
      <button className="gloss grid size-7 place-items-center rounded-full">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10 8 6l4 4" /></svg>
      </button>
      <div className="flex flex-col items-center gap-1.5 py-1">
        {dots.map((d) => (
          <span key={d} className="size-1.5 rounded-full" style={{ background: d === active ? "#5b9bff" : "color-mix(in oklab, var(--foreground) 22%, transparent)" }} />
        ))}
      </div>
      <button className="gloss grid size-7 place-items-center rounded-full">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6l4 4 4-4" /></svg>
      </button>
    </div>
  );
}

function Segmented() {
  const items = ["Publish", "Revert", "Changes"] as const;
  const [active, setActive] = useState<(typeof items)[number]>("Publish");
  return <SegmentedTabs items={items} active={active} onChange={setActive} />;
}

function Toggle({ defaultOn = true }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn("neu-socket relative h-6 w-10 rounded-full transition-colors", on && "bg-emerald-500/80")}
    >
      <span
        className="absolute top-0.5 size-5 rounded-full bg-card transition-all"
        style={{ left: on ? "1.125rem" : "0.125rem", boxShadow: "0 1px 2px rgb(0 0 0 / .25), inset 0 1px 0 rgb(255 255 255 / .8)" }}
      />
    </button>
  );
}

function Tabs() {
  const items = ["Home", "CRM", "Inbox"] as const;
  const [active, setActive] = useState<(typeof items)[number]>("Home");
  return <SegmentedTabs items={items} active={active} onChange={setActive} />;
}

/** SegmentedTabs with the `icons` prop — the grid/list mode switcher (e.g. the Library). */
function IconSegmented() {
  const items = ["grid", "list"] as const;
  const [active, setActive] = useState<(typeof items)[number]>("grid");
  return (
    <SegmentedTabs
      items={items}
      active={active}
      onChange={setActive}
      labels={{ grid: "Grid", list: "List" }}
      icons={{ grid: <LayoutGrid className="size-4" />, list: <List className="size-4" /> }}
    />
  );
}

function NeuNode({ label, icon, dim = false }: { label: string; icon: React.ReactNode; dim?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center gap-2", dim && "opacity-60")}>
      <div className="neu-socket rounded-[2rem] p-2.5">
        <div className="neu-raise grid size-24 place-items-center rounded-[1.6rem]">{icon}</div>
      </div>
      <span className="text-[13px] font-medium text-foreground">{label}</span>
    </div>
  );
}

function StatusChip({ tone, children }: { tone: "gray" | "blue" | "violet" | "emerald" | "amber" | "red"; children: React.ReactNode }) {
  const map: Record<string, string> = {
    gray: "bg-foreground/8 text-muted-foreground",
    blue: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
    violet: "bg-violet-500/12 text-violet-700 dark:text-violet-400",
    emerald: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/14 text-amber-700 dark:text-amber-400",
    red: "bg-red-500/12 text-red-600 dark:text-red-400",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", map[tone])}>{children}</span>;
}

/* ---------- the board ---------- */

export default function DesignBoard() {
  // Drive the REAL app theme (next-themes sets `.dark` on <html>). A local class
  // toggle can't win here: if the stored app theme is dark, <html> already carries
  // `.dark` and a nested wrapper can only ADD it, never remove it — so "Light" did
  // nothing. Controlling next-themes flips <html> itself, so both directions work.
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted ? resolvedTheme === "dark" : false;
  const [neu, setNeu] = useState(1);
  const [mic, setMic] = useState<AnalyserNode | null>(null);
  const micRef = useRef<{ ctx: AudioContext; stream: MediaStream } | null>(null);

  async function toggleMic() {
    if (mic) {
      micRef.current?.stream.getTracks().forEach((t) => t.stop());
      micRef.current?.ctx.close();
      micRef.current = null;
      setMic(null);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      an.smoothingTimeConstant = 0.7;
      src.connect(an);
      micRef.current = { ctx, stream };
      setMic(an);
    } catch {
      /* mic denied / unavailable */
    }
  }

  return (
    <div>
      <div
        className="canvas-grid min-h-screen bg-background text-foreground"
        style={{ ["--neu-strength" as string]: String(neu) }}
      >
        {/* top toolbar (glass, Apple zone) */}
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3">
          <div className="glass flex items-center gap-3 rounded-full px-4 py-2">
            <span className="text-sm font-semibold tracking-tight">Lu Computer</span>
            <span className="font-mono text-[11px] text-muted-foreground">design-system · /dev/design</span>
          </div>
          <div className="glass flex items-center gap-4 rounded-full px-4 py-2">
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              neu
              <input type="range" min={0} max={1.6} step={0.1} value={neu} onChange={(e) => setNeu(Number(e.target.value))} className="w-24 accent-[#5b9bff]" />
              <span className="w-6 font-mono tabular-nums">{neu.toFixed(1)}</span>
            </label>
            <button onClick={() => setTheme(dark ? "light" : "dark")} className="gloss rounded-full px-3 py-1 text-[13px] font-medium">
              {dark ? "◑ Dark" : "◐ Light"}
            </button>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 pb-24 pt-2">
          {/* ============ LOGO EXPERIMENT ============ */}
          <Frame title="Logo experiment — pixel wordmark" tag="3D pixel Macintosh + the flowing pixel wordmark">
            {/* the logo — 3D pixel Mac + wordmark */}
            <div className="neu-card mb-5 flex items-center gap-5 rounded-2xl bg-card p-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pixel/mac.png" alt="lu.computer" className="h-20 w-auto" style={{ imageRendering: "pixelated" }} />
              <PixelWordmark rows={11} cell={7} icon={false} />
            </div>
            <Cap>the logo — 3D pixel Macintosh + flowing wordmark</Cap>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="neu-card flex flex-col items-start gap-3 rounded-2xl bg-card p-6">
                <PixelWordmark rows={9} cell={6} icon={false} />
                <Cap>1 · letters only (grayscale flow)</Cap>
              </div>
              <div className="neu-card flex flex-col items-start gap-3 rounded-2xl bg-card p-6">
                <div className="neu-inset rounded-lg p-3"><PixelWordmark rows={9} cell={6} icon={false} field /></div>
                <Cap>2 · + faint grayscale field behind</Cap>
              </div>
              <div className="neu-card flex flex-col items-start gap-3 rounded-2xl bg-card p-6">
                <div className="neu-inset rounded-lg p-3"><PixelWordmark rows={9} cell={6} icon={false} field emphasis="field" /></div>
                <Cap>3 · field carries the flow · dark-gray letters</Cap>
              </div>
              <div className="neu-card flex flex-col items-start gap-3 rounded-2xl bg-card p-6">
                <PixelWordmark rows={9} cell={6} icon={false} animated={false} />
                <Cap>4 · static (no shimmer)</Cap>
              </div>
              <div className="neu-card flex flex-col items-start gap-3 rounded-2xl bg-card p-6">
                <PixelWordmark rows={9} cell={7} gap={0} icon={false} />
                <Cap>5 · no gap (pixels touching)</Cap>
              </div>
            </div>

            <Cap>calligraphy — cursive "hello."-style script (upright)</Cap>
            <div className="mt-2 flex flex-col gap-5">
              <div className="neu-card flex items-center overflow-hidden rounded-2xl bg-card p-8">
                <PixelWordmark rows={22} cell={4} gap={1} icon={false} script className="w-full" />
              </div>
              <div className="neu-card flex items-center overflow-hidden rounded-2xl bg-card p-8">
                <PixelWordmark rows={22} cell={4} gap={0} icon={false} script palette="mac" className="w-full" />
              </div>
              <div className="flex items-center overflow-hidden rounded-2xl bg-neutral-900 p-8 elev-2">
                <PixelWordmark rows={22} cell={4} gap={0} icon={false} script animated={false} color="#ffffff" className="w-full" />
              </div>
            </div>
            <Cap>1 grayscale flow · 2 Mac-plastic (last) · 3 white static (forced white, on dark)</Cap>
          </Frame>

          {/* ============ FOUNDATIONS ============ */}
          <Frame title="Foundations — palette" tag="editorial neutrals + semantic + categorical">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              <Swatch name="background" className="bg-background" />
              <Swatch name="card" className="bg-card" />
              <Swatch name="muted" className="bg-muted" />
              <Swatch name="border" className="bg-border" />
              <Swatch name="foreground" className="bg-foreground" />
              <Swatch name="primary" className="bg-primary" />
            </div>
            <Cap>semantic status families — soft-tint chip = 12% bg / strong text</Cap>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusChip tone="gray">new</StatusChip>
              <StatusChip tone="blue">in flight</StatusChip>
              <StatusChip tone="violet">working</StatusChip>
              <StatusChip tone="emerald">paid</StatusChip>
              <StatusChip tone="amber">no response</StatusChip>
              <StatusChip tone="red">cancelled</StatusChip>
            </div>
            <Cap>categorical kinds + interactive accent</Cap>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {[
                ["message", "#3B82F6"], ["quote", "#8B5CF6"], ["invoice", "#10B981"], ["review", "#F59E0B"],
                ["post", "#EC4899"], ["site", "#6366F1"], ["question", "#F97316"], ["interactive", "#5b9bff"],
              ].map(([name, c]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <span className="size-4 rounded-md" style={{ background: c as string }} />
                  <span className="font-mono text-[11px] text-muted-foreground">{name}</span>
                </div>
              ))}
            </div>
          </Frame>

          <div className="grid gap-8 md:grid-cols-2">
            <Frame title="Foundations — type" tag="Plus Jakarta Sans + IBM Plex Mono">
              <div className="space-y-2">
                <div className="text-3xl font-semibold tracking-tight">Good afternoon</div>
                <div className="text-xl font-semibold">Section heading</div>
                <div className="text-sm text-foreground">Body copy — clean geometric sans, editorial spacing, comfortable measure.</div>
                <div className="text-sm text-muted-foreground">Muted secondary line for hints and metadata.</div>
                <div className="font-mono text-2xl font-semibold tabular-nums">10,291</div>
                <div className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">mono · labels · numerals</div>
              </div>
            </Frame>

            <Frame title="Foundations — elevation" tag="ladder + materials">
              <div className="grid grid-cols-4 gap-3">
                {["elev-1", "elev-2", "elev-3", "elev-4"].map((e) => (
                  <div key={e} className="flex flex-col items-center gap-2">
                    <div className={cn("grid size-14 place-items-center rounded-xl bg-card", e)}>
                      <span className="font-mono text-[10px] text-muted-foreground">{e.slice(-1)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Cap>depth duality — elevated (pops out) vs de-elevated (pressed in)</Cap>
              <div className="neu-inset mt-2 grid grid-cols-2 gap-4 rounded-xl p-4">
                <div className="neu-card grid h-16 place-items-center rounded-xl text-[11px] font-medium text-muted-foreground">raised · neu-card</div>
                <div className="neu-card-in grid h-16 place-items-center rounded-xl text-[11px] font-medium text-muted-foreground">recessed · neu-card-in</div>
              </div>
              <Cap>materials — neu / gloss (tactile) · glass (floating)</Cap>
              <div className="mt-2 grid grid-cols-3 gap-3">
                <div className="neu-socket grid h-14 place-items-center rounded-xl"><div className="neu-raise size-9 rounded-lg" /></div>
                <div className="gloss grid h-14 place-items-center rounded-xl text-[11px] text-muted-foreground">gloss</div>
                <div className="glass grid h-14 place-items-center rounded-xl text-[11px] text-muted-foreground">glass</div>
              </div>
            </Frame>
          </div>

          {/* ============ SIGNATURE — PIXEL METERS ============ */}
          <Frame title="Signature — pixel meters" tag="green → amber → red ramp · the Lu motif">
            <div className="grid gap-6 sm:grid-cols-3">
              <StatBlock label="Sign ups" value="234" delta={34} meterValue={44} />
              <StatBlock label="Daily active users" value="10,291" delta={8} meterValue={62} />
              <StatBlock label="Monthly active users" value="49,182" delta={37} meterValue={88} />
            </div>
            <Cap>meter variants — full ramp (decorative) · value-driven · solid tones · small</Cap>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center gap-3"><PixelMeter /> <span className="font-mono text-[11px] text-muted-foreground">full ramp</span></div>
              <div className="flex items-center gap-3"><PixelMeter value={55} /> <span className="font-mono text-[11px] text-muted-foreground">value 55</span></div>
              <div className="flex items-center gap-3"><PixelMeter value={70} tone="green" /> <PixelMeter value={40} tone="blue" /> <PixelMeter value={80} tone="violet" /></div>
              <div className="flex items-center gap-3"><PixelMeter size="sm" value={60} /> <span className="font-mono text-[11px] text-muted-foreground">sm</span></div>
            </div>
            <Cap>multi-row — denser pixel field (rows = 2 / 3)</Cap>
            <div className="mt-3 flex flex-col gap-3">
              <PixelMeter rows={2} />
              <PixelMeter rows={3} value={62} />
              <PixelMeter rows={3} tone="green" value={80} />
            </div>
          </Frame>

          {/* ============ ONBOARDING & MOTION ============ */}
          <Frame title="Onboarding & motion — flowing pixel meters" tag="monochrome · loaders + Lu's voice (dot-matrix field)">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Cap>pixel loader — monochrome grayscale wave (every pixel shades, 1 row → field)</Cap>
                <div className="mt-2 flex flex-col gap-3">
                  <PixelLoader />
                  <PixelLoader speed={1} />
                  <div className="flex items-center gap-3"><PixelLoader size="sm" cols={16} /> <span className="font-mono text-[11px] text-muted-foreground">sm</span></div>
                </div>
                <Cap>flowing pixel field — "booting up your company"</Cap>
                <div className="mt-2 neu-card rounded-xl bg-card p-4">
                  <PixelLoader rows={4} cols={26} speed={1.6} />
                  <div className="mt-3 font-mono text-[11px] text-muted-foreground">Setting up Engineering · Design · Finance…</div>
                </div>
              </div>
              <div>
                <Cap>Lu's voice — monochrome dot-matrix field (idle · listening · speaking)</Cap>
                <div className="mt-2 flex flex-col gap-3">
                  {(["idle", "listening", "speaking"] as const).map((s) => (
                    <div key={s} className="neu-card flex items-center gap-4 rounded-xl bg-card p-3">
                      {/* Lu circle with neu depth */}
                      <span className="neu-socket grid size-11 shrink-0 place-items-center rounded-full p-1">
                        <span className="neu-raise grid size-full place-items-center rounded-full text-sm font-semibold text-foreground">Lu</span>
                      </span>
                      <PixelVoice state={s} />
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">{s}</span>
                    </div>
                  ))}
                  {/* live — reacts to the person's real voice */}
                  <div className="neu-card flex items-center gap-4 rounded-xl bg-card p-3">
                    <span className="neu-socket grid size-11 shrink-0 place-items-center rounded-full p-1">
                      <span className="neu-raise grid size-full place-items-center rounded-full text-sm font-semibold text-foreground">Lu</span>
                    </span>
                    <PixelVoice analyser={mic} />
                    <Button size="sm" variant={mic ? "secondary" : "outline"} onClick={toggleMic} className="ml-auto">
                      {mic ? "Stop mic" : "🎤 Use mic"}
                    </Button>
                  </div>
                </div>
                <Cap>click “Use mic” — the field follows your actual voice (Web Audio analyser)</Cap>
              </div>
            </div>
          </Frame>

          {/* ============ ONBOARDING — SIGN-UP FLOW ============ */}
          <Frame title="Onboarding — sign-up flow" tag="Phase-1 · 5-screen wizard · full-page preview">
            <Link
              href="/dev/design/onboarding"
              className="neu-card group flex items-center gap-5 rounded-2xl bg-card p-6 transition active:translate-y-px"
            >
              <PixelTile size={72} className="shrink-0">
                <PixelIcon glyph="sparkle" color="blue" size={40} />
              </PixelTile>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground">Sign-up onboarding</div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  name → role → idea stage → create company. Fully clickable; the final step is
                  preview-safe — no data written, no redirect.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors group-hover:bg-foreground group-hover:text-background">
                Open preview
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3l5 5-5 5" /></svg>
              </span>
            </Link>
          </Frame>

          {/* ============ CONTINUOUS METER + DELTAS ============ */}
          <div className="grid gap-8 md:grid-cols-2">
            <Frame title="Continuous meter — MeterBar" tag="honest single % · recessed socket">
              <div className="rounded-2xl border bg-card p-5">
                <div className="text-sm text-muted-foreground">Open Rate</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-4xl font-semibold tabular-nums">58%</span>
                  <DeltaPill value={12} />
                </div>
                <MeterBar className="mt-4" value={58} tone="green" />
                <div className="mt-3 flex items-center gap-4 text-[13px] text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500" /> Opened 47</span>
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-foreground/20" /> Unopened 34</span>
                </div>
              </div>
              <Cap>tones</Cap>
              <div className="mt-2 space-y-2">
                <MeterBar value={72} tone="blue" height="h-6" />
                <MeterBar value={45} tone="violet" height="h-6" />
                <MeterBar value={30} tone="amber" height="h-6" />
              </div>
            </Frame>

            <Frame title="Delta pills + report rows" tag="up = green · down = red">
              <div className="flex flex-wrap gap-2">
                <DeltaPill value={12} /><DeltaPill value={6} /><DeltaPill value={-10} /><DeltaPill value={-3} />
              </div>
              <Cap>email campaign report</Cap>
              <div className="mt-2 rounded-2xl border bg-card p-4 text-[13px]">
                {[["Sent", "81", null], ["Delivered", "79", null], ["Bounced", "2", -10], ["Replied", "6", 6]].map(([k, v, d]) => (
                  <div key={k as string} className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="flex items-center gap-2">
                      {d !== null && <DeltaPill value={d as number} />}
                      <span className="font-medium tabular-nums">{v}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Frame>
          </div>

          {/* ============ PIXEL ICONS ============ */}
          <Frame title="Pixel icons" tag="filled + blocky · assets/objects only (the opposite of line-icons)">
            <div className="flex flex-wrap items-end gap-5">
              {(["blue", "green", "amber", "violet"] as const).map((c) => (
                <div key={c} className="flex flex-col items-center gap-2">
                  <PixelTile><PixelIcon glyph="folder" color={c} size={44} /></PixelTile>
                  <Cap>folder · {c}</Cap>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2"><PixelTile><PixelIcon glyph="file" color="blue" size={44} /></PixelTile><Cap>file</Cap></div>
              <div className="flex flex-col items-center gap-2"><PixelTile><PixelIcon glyph="app" color="violet" size={44} /></PixelTile><Cap>app</Cap></div>
              <div className="flex flex-col items-center gap-2"><PixelTile><PixelIcon glyph="chart" color="green" size={44} /></PixelTile><Cap>chart</Cap></div>
              <div className="flex flex-col items-center gap-2"><PixelTile><PixelIcon glyph="sparkle" color="amber" size={44} /></PixelTile><Cap>sparkle</Cap></div>
            </div>
          </Frame>

          {/* ============ BUTTONS & CONTROLS ============ */}
          <Frame title="Buttons & controls" tag="neu/gloss tactile zone">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <button aria-label="New" className="gloss-ink press grid size-9 place-items-center rounded-xl text-white">
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12" /></svg>
              </button>
              <span className="font-mono text-[11px] text-muted-foreground">FAB (gloss-ink)</span>
            </div>
            <Cap>glass nav pill (Apple zone) · segmented · tabs · toggle · page-nav</Cap>
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <GlassNav items={["Start", "Build", "Sell", "Scale"]} />
              <Segmented />
              <Tabs />
              <IconSegmented />
              <div className="flex items-center gap-2"><Toggle /> <Toggle defaultOn={false} /></div>
              <PageNav />
            </div>
            <Cap>glass nav — ink variant (over dark/photo)</Cap>
            <div className="mt-3 rounded-2xl bg-[#3f7fbf] p-4 pixel-dither">
              <GlassNav ink items={["How to", "Start", "Build", "Sell", "Scale"]} />
            </div>
          </Frame>

          {/* ============ CARDS & GAME SURFACES ============ */}
          <Frame title="Cards & game surfaces" tag="neu nodes · task cards · achievement pills">
            <div className="flex flex-wrap items-start gap-8">
              <div>
                <div className="flex items-end gap-6">
                  <NeuNode label="Lu" icon={<span className="text-2xl font-semibold">Lu</span>} />
                  <NeuNode label="Engineering" icon={<PixelIcon glyph="app" color="blue" size={40} />} />
                  <NeuNode label="Legal" icon={<PixelIcon glyph="file" color="violet" size={40} />} dim />
                </div>
                <Cap>department nodes — neumorphic pillow in socket (depth is state-independent)</Cap>
              </div>
            </div>

            <Cap>roadmap stage — user / agent / approval · states</Cap>
            <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
              <TaskStage label="Idea stage" count="1/1">
                <TaskCard title="Initial Idea" kind="user" state="done" />
              </TaskStage>
              <TaskStage label="Initial stage" count="0/3">
                <TaskCard title="Pick a Company Name" kind="user" state="active" icon={<PixelIcon glyph="sparkle" color="amber" size={20} />} />
                <TaskCard title="Setup Codebase" kind="agent" icon={<PixelIcon glyph="app" color="blue" size={20} />} />
                <TaskCard title="Incorporate LLC" kind="approval" />
              </TaskStage>
              <TaskStage label="Identity stage" count="0/2">
                <TaskCard title="Buy Domain" kind="user" state="locked" />
                <TaskCard title="Logo & Brand Spec" kind="agent" state="locked" />
              </TaskStage>
            </div>

            <Cap>achievement / status pills (glass-ink, float above scenes)</Cap>
            <div className="mt-3 flex flex-col items-start gap-2 rounded-2xl bg-[#4a8f57] p-4 pixel-dither">
              <GamePill label="Task Completed" value="SEO Optimization" tone="done" />
              <GamePill label="Running" value="Marketing Campaign" tone="running" />
              <GamePill label="Waiting" value="New webpage" tone="waiting" />
            </div>
          </Frame>

          {/* ============ LANDING — MINIMAL FEATURE SECTION ============ */}
          <Frame title="Landing — feature section" tag="minimal · left copy + right roadmap canvas (ref: Cofounder)">
            <div className="grid items-center gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
              {/* left copy */}
              <div className="md:border-r md:pr-10">
                <PixelTile size={60} className="mb-8"><PixelIcon glyph="folder" color="blue" size={34} /></PixelTile>
                <h2 className="text-2xl font-semibold leading-snug tracking-tight">A full roadmap tailored to your company</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                  When starting a company, it&apos;s hard to know what&apos;s next. Lu guides you through all the steps
                  to get a real business started, and kicks off agents for milestones as you build.
                </p>
                <div className="mt-7 space-y-2 font-mono text-sm">
                  <div><span className="text-muted-foreground">Learn</span> <span className="text-foreground">How to start</span></div>
                  <div className="text-foreground">Run this in Lu</div>
                </div>
              </div>
              {/* right roadmap canvas */}
              <div className="canvas-dots neu-inset overflow-hidden rounded-2xl bg-background/40 p-5">
                <div className="flex gap-4">
                  <TaskStage label="Idea stage" count="1/1">
                    <TaskCard title="Initial Idea" kind="user" state="active" icon={<PixelIcon glyph="sparkle" color="amber" size={20} />} />
                  </TaskStage>
                  <div className="opacity-45">
                    <TaskStage label="Initial stage" count="0/3">
                      <TaskCard title="Pick a Company Name" kind="user" />
                      <TaskCard title="Setup Codebase" kind="agent" />
                      <TaskCard title="Incorporate LLC" kind="approval" />
                    </TaskStage>
                  </div>
                  <div className="hidden opacity-40 lg:block">
                    <TaskStage label="Identity stage" count="0/4">
                      <TaskCard title="Setup Social Presence" kind="agent" />
                      <TaskCard title="Buy Domain" kind="user" />
                      <TaskCard title="Logo & Brand Spec" kind="agent" />
                    </TaskStage>
                  </div>
                </div>
              </div>
            </div>
          </Frame>

          {/* ============ PANEL RECREATIONS ============ */}
          <div className="grid gap-8 md:grid-cols-2">
            <Frame title="Panel — Live users" tag="ref recreation with ds primitives">
              <div className="neu-card rounded-2xl bg-card p-1">
                <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
                  <span className="size-2 rounded-full bg-emerald-500" /> Live users
                </div>
                {[["LA", "Lucas Anderson", "Nashville, TN"], ["NG", "Noah Garcia", "Portland, OR"], ["ER", "Emily Rodriguez", "Austin, TX"]].map(([i, n, l]) => (
                  <div key={n} className="flex items-center gap-3 border-t border-border/60 px-3 py-2.5">
                    <span className="grid size-8 place-items-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">{i}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold">{n}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{l}</div>
                    </div>
                    <Badge variant="secondary" className="bg-sky-500/12 text-sky-700 dark:text-sky-400">✓ Signed up</Badge>
                  </div>
                ))}
                <div className="border-t border-border/60 px-3 py-2 text-center text-[12px] text-muted-foreground">
                  <span className="font-semibold text-foreground">2,853</span> people signed up this week
                </div>
              </div>
            </Frame>

            <Frame title="Empty & badges" tag="quiet states">
              <div className="rounded-2xl border border-dashed px-6 py-8 text-center">
                <PixelIcon glyph="folder" color="blue" size={40} className="mx-auto opacity-80" />
                <div className="mt-3 font-mono text-sm text-foreground">All caught up</div>
                <div className="mt-1 text-[13px] text-muted-foreground">Nothing needs you right now — Lu&apos;s on it.</div>
                <Button variant="outline" size="sm" className="mt-4">Ask Lu</Button>
              </div>
              <Cap>badges</Cap>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </Frame>
          </div>

          {/* ============ APP COMPONENTS GALLERY — redesigned twins ============ */}
          <AppGallery />
        </div>
      </div>
    </div>
  );
}
