"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  Code2,
  Globe,
  Headphones,
  Lock,
  Megaphone,
  PenTool,
  Scale,
  Sparkles,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { SarahIcon } from "@/components/icons/sarah";
import { FacebookMark } from "@/components/content/FacebookMark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { writeOnboardedProfile } from "@/lib/org-cookie";
import type { OrgProfile } from "@/lib/data/org-profile";
import { TeamSetup } from "@/components/team/TeamSetup";
import type { Member } from "@/lib/data/team/types";
import { agentById, type DeptId } from "@/lib/canvas/graph";
import { PixelThinking } from "./PixelThinking";

/**
 * ONBOARDING — the flagship, video-game / Wii-like first run (ONBOARDING.md).
 *
 * You don't "set up a receptionist" — you **boot up your company**. Lu walks you
 * through a short spine, then the heart of it: your 8 departments ASSEMBLE onto a
 * canvas (springy nodes + pixel poofs), Engineering lights up ACTIVE and the
 * other 7 land as locked "In development" tiles. Personality is in the MOTION,
 * not a mascot (LOCKED). Steps hand off through a mosaic/pixel wipe; before every
 * Lu line, a <PixelThinking/> charging orb shows she's about to talk.
 *
 * Data is still the MOCK cookie finish, isolated behind the single `provision()`
 * seam near the bottom — swap that one function for a real API later.
 */

/* ------------------------------------------------------------------ model --- */

type Screen =
  | "welcome"
  | "business"
  | "links"
  | "learning"
  | "handle"
  | "assemble"
  | "engineer"
  | "team"
  | "finish";

/** The screens where Lu chats on the left and one thing fills the stage on the right. */
const CHAT_SCREENS: Screen[] = ["business", "links", "learning", "handle"];
const isChat = (s: Screen) => CHAT_SCREENS.includes(s);

interface Workspace {
  business?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  gaveLinks?: boolean;
  name?: string;
  handle?: string;
}

interface Msg {
  id: number;
  role: "lu" | "owner";
  body: string;
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** Best-guess business name from whatever links they gave (domain / handle → label). */
function nameFromLinks(data: { website?: string; facebook?: string; instagram?: string }): string {
  const raw = (data.website || data.facebook || data.instagram || "").trim();
  if (!raw) return "";
  const label =
    raw
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/^@/, "")
      .replace(/^(facebook|instagram)\.com\//i, "")
      .split(/[/.]/)[0] ?? "";
  return label ? titleCase(label.replace(/[-_]+/g, " ")) : "";
}

const BUSINESS_EXAMPLES = ["Law firm", "Design agency", "Consulting", "Home services"];

let mid = 0;
const nextId = () => ++mid;

/* --------------------------------------------------------------- dept meta --- */
// Reuse the exact 8 departments (label + accent) from the canvas graph, with the
// same lucide glyphs the canvas uses. Engineering is the ONE real agent; the rest
// land as locked "In development" tiles (ONBOARDING.md §3 — not graph.ts's `active`).

const DEPT_ICON: Record<DeptId, React.ComponentType<{ className?: string }>> = {
  support: Headphones,
  operations: Boxes,
  finance: Wallet,
  legal: Scale,
  engineering: Code2,
  design: PenTool,
  marketing: Megaphone,
  sales: TrendingUp,
};

/** Assembly order: Engineering is the hero (lands first + active), then the 7 orbit in. */
const ASSEMBLE_ORDER: DeptId[] = [
  "engineering",
  "finance",
  "operations",
  "sales",
  "support",
  "marketing",
  "design",
  "legal",
];

const DEPT_CAPTION: Record<DeptId, string> = {
  engineering: "Engineering — your first hire. It builds your sites, tools, and integrations.",
  finance: "Finance — quotes, invoices, collections. Coming online soon.",
  operations: "Operations — jobs, scheduling, dispatch. Coming online soon.",
  sales: "Sales — pipeline, follow-ups, closing. Coming online soon.",
  support: "Support — answers customers and books the work. Coming online soon.",
  marketing: "Marketing — brand, content, SEO. Coming online soon.",
  design: "Design — brand assets and prototypes. Coming online soon.",
  legal: "Legal — contracts and e-sign. Coming online soon.",
};

/* --------------------------------------------------------------- Lu's lines --- */

const CHAT_LINES: Partial<Record<Screen, (ws: Workspace) => string>> = {
  business: () => "I'm Lu. Let's boot up your company. First — what do you do? In your own words.",
  links: () =>
    "Nice. Got a site or socials? Drop whatever you've got and I'll study up — it's how your agents learn to build in your voice.",
  learning: (ws) =>
    ws.gaveLinks
      ? "Reading through those now — your voice, your services, all of it. One sec…"
      : "No links yet — no problem. We'll build it together and I'll learn as we go.",
  handle: (ws) =>
    `Your handle is reserved: ${ws.handle || "you"}.lu.computer — it's where your Engineer ships your sites. Keep it, or change it?`,
};

/* --------------------------------------------------------------- dev harness --- */

const DEV_DEFAULTS: Workspace = {
  business: "Design agency",
  website: "northstardesign.com",
  facebook: "facebook.com/northstardesign",
  instagram: "@northstardesign",
  gaveLinks: true,
  name: "Northstar Design",
  handle: "northstardesign",
};

const SEQUENCE: Screen[] = [
  "welcome",
  "business",
  "links",
  "learning",
  "handle",
  "assemble",
  "engineer",
  "team",
  "finish",
];

function DevBar({ screen, onJump }: { screen: Screen; onJump: (s: Screen) => void }) {
  const pill =
    "shrink-0 rounded-full px-2 py-0.5 capitalize text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  const on = "bg-foreground text-background";
  return (
    <div className="fixed left-1/2 top-2 z-[70] flex max-w-[96vw] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full border bg-card/95 px-2 py-1 text-[10px] shadow-md backdrop-blur">
      <span className="shrink-0 pr-1 font-semibold uppercase tracking-wide text-muted-foreground/70">
        dev · jump to
      </span>
      {SEQUENCE.map((s) => (
        <button key={s} type="button" onClick={() => onJump(s)} className={cn(pill, screen === s && on)}>
          {s}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- soft blips --- */
// Quiet menu ticks (advance) + pops (node-land) — MUTED by default, toggle to enable.

function useBlips() {
  const [enabled, setEnabled] = React.useState(false);
  const ctxRef = React.useRef<AudioContext | null>(null);
  const ensure = React.useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!ctxRef.current) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) ctxRef.current = new AC();
    }
    return ctxRef.current;
  }, []);
  const blip = React.useCallback(
    (freq: number, dur = 0.08, type: OscillatorType = "square") => {
      if (!enabled) return;
      const ctx = ensure();
      if (!ctx) return;
      if (ctx.state === "suspended") void ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      const t0 = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur);
    },
    [enabled, ensure],
  );
  const tick = React.useCallback(() => blip(660, 0.06, "square"), [blip]);
  const pop = React.useCallback(() => blip(430, 0.09, "triangle"), [blip]);
  return { enabled, setEnabled, tick, pop };
}

function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={enabled ? "Mute sounds" : "Enable sounds"}
      title={enabled ? "Sounds on" : "Sounds off (muted)"}
      className="card-lift fixed right-3 top-3 z-[65] grid size-9 place-items-center rounded-xl border bg-card text-muted-foreground hover:text-foreground"
    >
      {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </button>
  );
}

/* --------------------------------------------------------------- mosaic wipe --- */
// The classic Wii channel feel: the screen pixelates OUT into chunky tiles (cover),
// we swap the step underneath at the peak, then it resolves IN (reveal). One pass.

function MosaicWipe({ onCover, onDone }: { onCover: () => void; onDone: () => void }) {
  const [dims, setDims] = React.useState<{ cols: number; rows: number }>({ cols: 0, rows: 0 });
  const [phase, setPhase] = React.useState<"cover" | "reveal">("cover");

  React.useEffect(() => {
    const TILE = 46;
    setDims({ cols: Math.ceil(window.innerWidth / TILE), rows: Math.ceil(window.innerHeight / TILE) });
  }, []);

  const STEP = 12; // ms per diagonal band
  const maxDiag = dims.cols + dims.rows;
  const sweepMs = maxDiag * STEP + 200;

  React.useEffect(() => {
    if (!dims.cols) return;
    const t = setTimeout(() => {
      onCover();
      setPhase("reveal");
    }, sweepMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dims.cols]);

  React.useEffect(() => {
    if (phase !== "reveal") return;
    const t = setTimeout(onDone, sweepMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!dims.cols) return null;
  const covering = phase === "cover";
  return (
    // pointer-events AUTO: the overlay locks input for the whole cover→reveal pass, so the
    // (still-interactive) step underneath can't be clicked mid-transition — the Wii "channel
    // switch" feel, and it stops a click during the reveal from dropping the next step.
    <div
      className="fixed inset-0 z-[60] grid"
      style={{ gridTemplateColumns: `repeat(${dims.cols}, 1fr)`, gridTemplateRows: `repeat(${dims.rows}, 1fr)` }}
      aria-hidden
    >
      {Array.from({ length: dims.cols * dims.rows }).map((_, idx) => {
        const col = idx % dims.cols;
        const row = Math.floor(idx / dims.cols);
        const diag = col + row;
        const delay = (covering ? diag : maxDiag - diag) * STEP;
        return (
          <motion.div
            key={idx}
            initial={false}
            animate={covering ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.25 }}
            transition={{ duration: 0.16, delay: delay / 1000, ease: "easeOut" }}
            style={{
              background: (col + row) % 2 === 0 ? "var(--card)" : "var(--muted)",
              outline: "1px solid color-mix(in oklab, var(--foreground) 6%, transparent)",
              outlineOffset: -1,
            }}
          />
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------- pixel poof --- */
// A small burst of chunky pixel bits that flies outward when a department node lands.

function PixelPoof({ n = 10 }: { n?: number }) {
  const bits = React.useMemo(
    () =>
      Array.from({ length: n }, (_, i) => {
        const ang = (i / n) * Math.PI * 2 + (i % 2 ? 0.3 : 0);
        const dist = 24 + (i % 3) * 9;
        return { x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, s: 3 + (i % 2) * 2 };
      }),
    [n],
  );
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{ width: b.s, height: b.s, background: "currentColor", borderRadius: 1 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: b.x, y: b.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/* ================================================================= ROOT ===== */

export function OnboardingSketch() {
  const [screen, setScreen] = React.useState<Screen>("welcome");
  const [ws, setWs] = React.useState<Workspace>({});
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [thinking, setThinking] = React.useState(false);
  const [team, setTeam] = React.useState<Member[]>([]);
  const [history, setHistory] = React.useState<Screen[]>([]);

  const [wipe, setWipe] = React.useState(false);
  const pendingRef = React.useRef<Screen | null>(null);
  const skipHistoryRef = React.useRef(false); // set when the pending nav is a back() → don't re-push
  const spokeRef = React.useRef<Set<Screen>>(new Set());
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const threadRef = React.useRef<HTMLDivElement>(null);
  const blips = useBlips();

  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  React.useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking, screen]);

  /* ---- Lu's turn: a PixelThinking beat, then the line renders in the normal font ---- */
  const luSay = React.useCallback(
    (text: string) => {
      setThinking(true);
      const t = setTimeout(() => {
        setMsgs((m) => [...m, { id: nextId(), role: "lu", body: text }]);
        setThinking(false);
      }, 850);
      timers.current.push(t);
    },
    [],
  );
  const ownerSay = React.useCallback((text: string) => {
    setMsgs((m) => [...m, { id: nextId(), role: "owner", body: text }]);
  }, []);

  /* ---- step handoff through the mosaic wipe (swap the screen at the covered peak) ---- */
  const go = React.useCallback(
    (next: Screen) => {
      if (wipe) return;
      blips.tick();
      pendingRef.current = next;
      skipHistoryRef.current = false;
      setWipe(true);
    },
    [blips, wipe],
  );
  const back = React.useCallback(() => {
    if (!history.length || wipe) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    blips.tick();
    pendingRef.current = prev;
    skipHistoryRef.current = true; // a back() — don't push the current screen onto history
    setWipe(true);
  }, [history, wipe, blips]);
  // MosaicWipe calls this at the covered peak — swap the screen while it's hidden.
  const onCover = React.useCallback(() => {
    const next = pendingRef.current;
    if (!next) return;
    if (!skipHistoryRef.current) setHistory((h) => [...h, screen]);
    skipHistoryRef.current = false;
    setScreen(next);
    pendingRef.current = null;
  }, [screen]);

  /* ---- on entering a chat screen, Lu says its line once ---- */
  React.useEffect(() => {
    if (wipe) return; // wait until the wipe has fully revealed
    const line = CHAT_LINES[screen]?.(ws);
    if (line && !spokeRef.current.has(screen)) {
      spokeRef.current.add(screen);
      luSay(line);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, wipe]);

  /* --------------------------------------------------------- answer handlers --- */

  const start = () => go("business");

  const submitBusiness = (t: string) => {
    ownerSay(t);
    setWs((w) => ({ ...w, business: t }));
    go("links");
  };
  const submitLinks = (data: { website?: string; facebook?: string; instagram?: string; skipped?: boolean }) => {
    if (data.skipped) {
      ownerSay("Starting fresh");
      setWs((w) => ({ ...w, gaveLinks: false, handle: w.handle || slugify(w.business || "you") }));
    } else {
      ownerSay([data.website, data.facebook, data.instagram].filter(Boolean).join(" · ") || "Here you go");
      const name = nameFromLinks(data);
      setWs((w) => ({ ...w, ...data, gaveLinks: true, name: name || w.name, handle: slugify(name) || w.handle }));
    }
    go("learning");
  };
  const continueLearning = () => go("handle");
  const submitHandle = (h: string) => {
    const handle = slugify(h) || "you";
    ownerSay(`${handle}.lu.computer`);
    setWs((w) => ({ ...w, handle, name: w.name || titleCase(handle) }));
    go("assemble");
  };
  const finishAssemble = () => go("engineer");
  const finishEngineer = () => go("team");
  const finishTeam = () => go("finish");

  /* -------------------------------------------------------------- THE SEAM --- */
  /**
   * ───────────────────────────────────────────────────────────────────────────
   * provision() — THE ONE FINISH SEAM. Everything the flow collects funnels here.
   *
   * TODAY: writes the MOCK cookie profile and lands on /home, unchanged from the
   * old flow, so this ships independently of any backend.
   *
   * LATER: replace ONLY this function body with a real API call — create the org
   * + 8 Department rows (Engineering `active` + its Agent, the other 7
   * `in_development`) per ONBOARDING.md §3/§4 — then navigate. The (ws, team)
   * inputs and the "navigate into the app" contract stay the same, so no caller
   * changes are needed.
   * ───────────────────────────────────────────────────────────────────────────
   */
  const provision = React.useCallback((wsIn: Workspace, teamIn: Member[]) => {
    const teammates = teamIn.filter((m) => m.roleKey !== "owner");
    const name = wsIn.name || titleCase(wsIn.handle || "") || "Your Company";
    const profile: OrgProfile = {
      id: "org_new",
      companyName: name,
      sarahName: "Lu",
      projectTypes: wsIn.business ? [wsIn.business] : [],
      siteHandle: wsIn.handle ? `${wsIn.handle}.lu.computer` : undefined,
      assistantEmail: wsIn.handle ? `${wsIn.handle}@lu.computer` : undefined,
      // Fixed nav — every new org gets the same honest-empty surfaces.
      modules: { crm: "live", schedule: "live", money: "live", team: "live", agents: "live", sites: "live" },
      setupSteps: teammates.length ? { team: true } : {},
      seedMembers: teammates,
    };
    writeOnboardedProfile(profile);
    window.location.href = "/home";
  }, []);

  const finish = () => provision(ws, team);

  /* --------------------------------------------------------------- dev jump --- */
  const jump = (s: Screen) => {
    setWs((w) => ({ ...DEV_DEFAULTS, ...w }));
    setHistory([]);
    pendingRef.current = null;
    setWipe(false);
    if (isChat(s)) {
      // reset the thread so the jumped-to line re-says cleanly
      spokeRef.current = new Set();
      setMsgs([]);
      setThinking(false);
    }
    setScreen(s);
  };

  /* ----------------------------------------------------------------- render --- */
  const dev = <DevBar screen={screen} onJump={jump} />;
  const sound = <SoundToggle enabled={blips.enabled} onToggle={() => blips.setEnabled((v) => !v)} />;
  const wipeEl = wipe ? <MosaicWipe onCover={onCover} onDone={() => setWipe(false)} /> : null;
  const canBack = history.length > 0 && !wipe;

  // full-screen takeovers
  if (screen === "welcome")
    return (
      <Frame>
        {dev}
        {sound}
        <Welcome onStart={start} />
        {wipeEl}
      </Frame>
    );

  if (screen === "assemble")
    return (
      <Frame>
        {dev}
        {sound}
        <AssembleStage name={ws.name} onDone={finishAssemble} onLand={blips.pop} />
        {wipeEl}
      </Frame>
    );

  if (screen === "engineer")
    return (
      <Frame>
        {dev}
        {sound}
        <EngineerStage onContinue={finishEngineer} />
        {wipeEl}
      </Frame>
    );

  if (screen === "team")
    return (
      <Frame>
        {dev}
        {sound}
        <div className="mx-auto h-svh w-full max-w-6xl p-4 sm:p-6">
          <TeamSetup
            ownerName="You"
            onMembersChange={setTeam}
            onDone={finishTeam}
            onSkip={finishTeam}
            doneLabel="Finish setup"
            skipLabel="Skip — add my team later"
            className="h-full"
          />
        </div>
        {wipeEl}
      </Frame>
    );

  if (screen === "finish")
    return (
      <Frame>
        {dev}
        {sound}
        <Finish ws={ws} teamCount={team.filter((m) => m.roleKey !== "owner").length} onEnter={finish} />
        {wipeEl}
      </Frame>
    );

  /* -------- chat screens: Lu on the left, one thing on the stage to the right -------- */
  return (
    <Frame>
      {dev}
      {sound}
      <div className="mx-auto flex h-svh w-full max-w-6xl gap-4 p-4 sm:p-6">
        {/* LEFT — Lu's conversation */}
        <div className="flex w-full max-w-md shrink-0 flex-col overflow-hidden rounded-3xl border bg-card elev-2">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <SarahIcon className="size-5" />
            <span className="text-sm font-semibold">Lu</span>
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" /> booting up your company
            </span>
          </header>
          <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {msgs.map((m) =>
              m.role === "lu" ? (
                <motion.p
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm leading-relaxed text-foreground"
                >
                  {m.body}
                </motion.p>
              ) : (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                  <span className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">
                    {m.body}
                  </span>
                </motion.div>
              ),
            )}
            {thinking && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-foreground/80"
              >
                <PixelThinking size={26} />
                <span className="text-xs text-muted-foreground">Lu is thinking</span>
              </motion.div>
            )}
          </div>
          <div className="border-t px-4 py-3">
            <AnswerBar
              screen={screen}
              ws={ws}
              busy={thinking}
              canBack={canBack}
              onBack={back}
              onBusiness={submitBusiness}
              onLinks={submitLinks}
              onHandle={submitHandle}
            />
          </div>
        </div>

        {/* RIGHT — one thing, full space, on its turn */}
        <div className="hidden flex-1 overflow-hidden rounded-3xl border bg-sidebar/40 md:block">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              <Stage screen={screen} ws={ws} onContinueLearning={continueLearning} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {wipeEl}
    </Frame>
  );
}

/* ------------------------------------------------------------------- frame --- */

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="canvas-grid relative min-h-svh bg-sidebar">{children}</div>;
}

/* ------------------------------------------------------------------ stages --- */

function Stage({
  screen,
  ws,
  onContinueLearning,
}: {
  screen: Screen;
  ws: Workspace;
  onContinueLearning: () => void;
}) {
  if (screen === "business") return <BusinessStage />;
  if (screen === "links") return <LinksStage />;
  if (screen === "learning") return <LearningStage ws={ws} onContinue={onContinueLearning} />;
  return <HandleStage ws={ws} />;
}

function StageShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-4 flex min-h-0 flex-1 flex-col">{children}</div>
      {footer && <div className="mt-4">{footer}</div>}
    </div>
  );
}

function BusinessStage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-8 text-center">
      <PixelThinking size={64} className="text-foreground" />
      <div className="max-w-xs">
        <h2 className="text-lg font-semibold">Let&apos;s meet your company</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell Lu what you do — in your own words. Everything after this builds on it.
        </p>
      </div>
    </div>
  );
}

function LinksStage() {
  const rows = [
    { icon: Globe, label: "Website", note: "your services & pricing" },
    { icon: FacebookMark, label: "Facebook", note: "your posts & reviews" },
    { icon: InstagramMark, label: "Instagram", note: "your recent work" },
  ];
  return (
    <StageShell title="Your online presence" subtitle="Share what you've got — Lu reads all of it">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        {rows.map((r) => (
          <div key={r.label} className="card-lift flex w-full max-w-xs items-center gap-3 rounded-2xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <r.icon className="size-4 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">Lu learns {r.note}</p>
            </div>
          </div>
        ))}
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
          The more Lu reads, the more your agents sound like you — not a robot.
        </p>
      </div>
    </StageShell>
  );
}

/** The brand scan — pixel charge while Lu studies, then the reveal of what she learned. */
function LearningStage({ ws, onContinue }: { ws: Workspace; onContinue: () => void }) {
  const sources = React.useMemo(
    () => [ws.website ? `Reading ${ws.website}` : "Reading your website", "Scanning your socials", "Reading your reviews", "Learning your voice"],
    [ws.website],
  );
  const scanning = !!ws.gaveLinks;
  const [done, setDone] = React.useState(scanning ? 0 : sources.length);
  const revealed = done >= sources.length;
  React.useEffect(() => {
    if (!scanning || revealed) return;
    const t = setTimeout(() => setDone((d) => d + 1), 620);
    return () => clearTimeout(t);
  }, [done, scanning, revealed, sources.length]);

  if (!ws.gaveLinks) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <Sparkles className="size-8 text-muted-foreground" />
        <p className="max-w-xs text-sm text-muted-foreground">
          No links yet — we&apos;ll build your brand together as we go, and your agents will learn more the more we work.
        </p>
        <Button className="btn-glow gap-2" onClick={onContinue}>
          Continue <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <StageShell
      title="What Lu learned about you"
      subtitle={revealed ? "Tuned from your site, socials, and reviews" : "Studying your business…"}
      footer={
        revealed ? (
          <Button className="btn-glow w-full gap-2" onClick={onContinue}>
            Continue <ArrowRight className="size-4" />
          </Button>
        ) : undefined
      }
    >
      {!revealed ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <PixelThinking size={72} className="text-foreground" />
          <div className="w-full max-w-xs space-y-3">
            {sources.map((s, i) => (
              <div key={s} className="flex items-center gap-2.5 text-sm">
                <span className={cn("flex size-5 items-center justify-center rounded-full", i < done ? "text-emerald-500" : "text-muted-foreground")}>
                  {i < done ? <Check className="size-4" /> : <span className={cn("size-1.5 rounded-full", i === done ? "animate-pulse bg-foreground" : "bg-muted-foreground/40")} />}
                </span>
                <span className={i < done ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 space-y-4 overflow-y-auto">
          <ProfileRow label="You are" value={ws.name?.trim() || "Your business"} />
          {ws.business?.trim() && <ProfileRow label="What you do" value={ws.business} />}
          <ProfileRow label="Your voice" value="Clear and friendly — your agents will keep tuning it to sound like you" />
          {(ws.facebook || ws.instagram) && (
            <div>
              <p className="text-xs text-muted-foreground">Socials</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {ws.facebook && (
                  <span className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs">
                    <FacebookMark className="size-3.5" /> Facebook
                  </span>
                )}
                {ws.instagram && (
                  <span className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs">
                    <InstagramMark className="size-3.5" /> Instagram
                  </span>
                )}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Your Engineer will build on this.</p>
        </motion.div>
      )}
    </StageShell>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}

function HandleStage({ ws }: { ws: Workspace }) {
  const handle = ws.handle || "you";
  return (
    <StageShell title="Your handle" subtitle={`Reserved at ${handle}.lu.computer`}>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        {/* the reserved space — a clean branded holding page */}
        <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border bg-card elev-2">
          <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="ml-2 flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              <Globe className="size-3" /> {handle}.lu.computer
            </span>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-muted/40 to-transparent p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-lg font-bold text-background">
              {(ws.name || handle).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold">{ws.name || titleCase(handle)}</p>
              <p className="text-xs text-muted-foreground">{handle}.lu.computer</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Reserved — your Engineer ships here
            </span>
          </div>
        </div>
      </div>
    </StageShell>
  );
}

/* --------------------------------------------------------------- ★ assemble --- */

function AssembleStage({ name, onDone, onLand }: { name?: string; onDone: () => void; onLand: () => void }) {
  const [landed, setLanded] = React.useState(0);
  const [booting, setBooting] = React.useState(true); // a brief PixelThinking beat before the first node

  React.useEffect(() => {
    const t = setTimeout(() => setBooting(false), 900);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (booting || landed >= ASSEMBLE_ORDER.length) return;
    const delay = landed === 0 ? 400 : landed === 1 ? 850 : 560; // hero lands, a beat, then the ring
    const t = setTimeout(() => {
      setLanded((n) => n + 1);
      onLand();
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed, booting]);

  const done = landed >= ASSEMBLE_ORDER.length;
  const caption = booting
    ? "Booting up your company…"
    : done
      ? "Engineering is ready. The rest of your company comes online next."
      : DEPT_CAPTION[ASSEMBLE_ORDER[Math.max(0, landed - 1)]];

  return (
    <div className="mx-auto flex h-svh w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 py-16">
      {/* Lu's caption up top */}
      <div className="flex min-h-[3.5rem] items-center gap-3 text-center">
        {booting && <PixelThinking size={30} className="text-foreground" />}
        <motion.p
          key={caption}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md text-base font-medium text-foreground sm:text-lg"
        >
          {caption}
        </motion.p>
      </div>

      {/* the canvas — Lu at center, departments assemble onto the ring */}
      <div className="canvas-grid relative aspect-square w-full max-w-[540px] rounded-3xl border bg-card/60">
        {/* edges */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          {ASSEMBLE_ORDER.slice(0, landed).map((id) => {
            const a = agentById(id)!;
            const p = deptPct(a.angle);
            const active = id === "engineering";
            return (
              <motion.line
                key={id}
                x1={50}
                y1={50}
                x2={p.x}
                y2={p.y}
                stroke={active ? `rgb(${a.accent})` : "currentColor"}
                strokeOpacity={active ? 0.55 : 0.22}
                strokeWidth={active ? 0.5 : 0.35}
                strokeDasharray="2 2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            );
          })}
        </svg>

        {/* department nodes */}
        {ASSEMBLE_ORDER.map((id, i) => {
          if (i >= landed) return null;
          const a = agentById(id)!;
          const p = deptPct(a.angle);
          return (
            <div key={id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)" }}>
              <DeptNode id={id} />
            </div>
          );
        })}

        {/* Lu — center */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="neu-socket rounded-[2rem] p-1.5">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
              className="neu-raise flex items-center gap-2 rounded-[1.6rem] px-5 py-3"
            >
              <SarahIcon className="size-6 text-foreground" />
              <span className="text-xl font-semibold tracking-tight text-foreground">Lu</span>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="h-10">
        <AnimatePresence>
          {done && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Button size="lg" className="btn-glow gap-2" onClick={onDone}>
                Meet your Engineer <ArrowRight className="size-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Node placement on the ring — percentage coords in the square canvas (angle from graph.ts). */
function deptPct(angleDeg: number): { x: number; y: number } {
  const r = 37; // % radius
  const a = (angleDeg * Math.PI) / 180;
  return { x: 50 + Math.cos(a) * r, y: 50 + Math.sin(a) * r };
}

/** One department tile — springy overshoot + a pixel poof on land. Engineering is ACTIVE;
 *  the rest are dimmed, locked "In development" tiles. */
function DeptNode({ id }: { id: DeptId }) {
  const a = agentById(id)!;
  const Icon = DEPT_ICON[id];
  const active = id === "engineering";
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 12 }}
      className="relative"
      style={{ color: active ? `rgb(${a.accent})` : undefined }}
    >
      <PixelPoof />
      <div className="neu-socket rounded-3xl p-1">
        <div
          className={cn(
            "neu-raise relative flex w-[104px] flex-col items-center gap-1 rounded-[1.35rem] px-2 py-3",
            active ? "" : "opacity-60",
          )}
        >
          {active && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-[1.35rem]"
              style={{ boxShadow: `0 0 0 2px rgba(${a.accent}, 0.55), 0 0 22px 2px rgba(${a.accent}, 0.35)` }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <span className="relative grid size-8 place-items-center" style={{ color: active ? `rgb(${a.accent})` : "var(--muted-foreground)" }}>
            <Icon className="size-6" />
            {!active && (
              <span className="absolute -bottom-1 -right-1 grid size-4 place-items-center rounded-full border bg-background text-muted-foreground">
                <Lock className="size-2.5" />
              </span>
            )}
          </span>
          <span className={cn("relative text-xs font-semibold", active ? "text-foreground" : "text-muted-foreground")}>{a.label}</span>
          <span
            className={cn(
              "relative rounded-full px-1.5 py-0.5 text-[9px] font-medium",
              active
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {active ? "Active" : "In development"}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------------------------------------------- ★ engineer --- */

function EngineerStage({ onContinue }: { onContinue: () => void }) {
  const eng = agentById("engineering")!;
  const [beat, setBeat] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setBeat(false), 900);
    return () => clearTimeout(t);
  }, []);
  const accent = `rgb(${eng.accent})`;
  return (
    <div className="mx-auto flex h-svh w-full max-w-lg flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex min-h-[2rem] items-center gap-2">
        {beat && <PixelThinking size={26} className="text-foreground" />}
        <motion.p key={String(beat)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
          {beat ? "Bringing your Engineer online…" : "Say hello to your first hire."}
        </motion.p>
      </div>

      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.15 }}
        className="neu-socket rounded-[2.4rem] p-2"
      >
        <div className="neu-raise flex flex-col items-center gap-3 rounded-[2rem] px-10 py-8">
          <span className="grid size-14 place-items-center rounded-2xl" style={{ color: accent, background: `rgba(${eng.accent}, 0.12)` }}>
            <Code2 className="size-9" />
          </span>
          <div>
            <p className="text-lg font-semibold">Your Engineer</p>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          </div>
        </div>
      </motion.div>

      <p className="max-w-sm text-sm text-muted-foreground">
        {eng.blurb} It&apos;s the one agent live today — the other departments are in development. In a moment you&apos;ll tell it
        what to build first.
      </p>

      <Button size="lg" className="btn-glow gap-2" onClick={onContinue}>
        Add your team <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/* ---------------------------------------------------------------- ★ welcome --- */

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
        <PixelThinking size={104} className="text-foreground" />
      </motion.div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meet Lu.</h1>
        <p className="mt-2 max-w-md text-muted-foreground">
          Let&apos;s set up your company. No forms — just tell Lu what you do, and watch it take shape.
        </p>
      </div>
      <Button size="lg" className="btn-glow gap-2" onClick={onStart}>
        Boot up my company <ArrowRight className="size-4" />
      </Button>
      <p className="text-xs text-muted-foreground">Your Engineer is ready. Seven more departments are coming online.</p>
    </div>
  );
}

/* ----------------------------------------------------------------- ★ finish --- */

function Finish({ ws, teamCount, onEnter }: { ws: Workspace; teamCount: number; onEnter: () => void }) {
  const handle = ws.handle || "you";
  const tiles = [
    { icon: Globe, label: "Your space", value: `${handle}.lu.computer` },
    { icon: Code2, label: "Engineering", value: "Active — ready to build", live: true },
    { icon: Lock, label: "7 departments", value: "In development" },
    { icon: Sparkles, label: "Team", value: teamCount > 0 ? `${teamCount} invited` : "Add anytime" },
  ];
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-xl flex-col items-center justify-center gap-7 px-6 py-12 text-center">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15 }} className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10">
        <Check className="size-7 text-emerald-500" />
      </motion.div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{ws.name || titleCase(handle)} is booted.</h1>
        <p className="mt-2 text-sm text-muted-foreground">Your company is live. Engineering is ready to build.</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="card-lift flex items-center gap-3 rounded-2xl border bg-card p-3.5 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <t.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{t.label}</p>
              <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                {t.value}
                {t.live && <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" className="btn-glow gap-2" onClick={onEnter}>
        Enter your company <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------- answer inputs --- */

function AnswerBar({
  screen,
  ws,
  busy,
  canBack,
  onBack,
  onBusiness,
  onLinks,
  onHandle,
}: {
  screen: Screen;
  ws: Workspace;
  busy: boolean;
  canBack: boolean;
  onBack: () => void;
  onBusiness: (t: string) => void;
  onLinks: (d: { website?: string; facebook?: string; instagram?: string; skipped?: boolean }) => void;
  onHandle: (h: string) => void;
}) {
  const [business, setBusiness] = React.useState(ws.business ?? "");
  const [handle, setHandle] = React.useState(ws.handle ?? "");
  const [links, setLinks] = React.useState({ website: "", facebook: "", instagram: "" });

  const backBtn = canBack ? (
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
    </button>
  ) : null;

  // While Lu is "thinking", the input is quiet — just the back affordance.
  if (busy) return <div className="flex h-9 items-center">{backBtn}</div>;

  if (screen === "learning")
    return (
      <div className="flex items-center gap-2">
        {backBtn}
        <p className="flex-1 text-center text-xs text-muted-foreground">Studying your business… continue on the right →</p>
        {backBtn && <div className="size-9 shrink-0" aria-hidden />}
      </div>
    );

  if (screen === "business")
    return (
      <div className="flex flex-col gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (business.trim()) onBusiness(business.trim());
          }}
          className="flex gap-2"
        >
          {backBtn}
          <input
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            autoFocus
            className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
            placeholder="What do you do? In your own words…"
          />
          <Button type="submit" size="sm" className="h-9" disabled={!business.trim()}>
            Continue
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {BUSINESS_EXAMPLES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setBusiness(t)}
              className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    );

  if (screen === "links")
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onLinks(links);
        }}
        className="flex flex-col gap-2"
      >
        <LinkInput icon={Globe} value={links.website} onChange={(v) => setLinks((l) => ({ ...l, website: v }))} placeholder="yoursite.com" />
        <LinkInput icon={FacebookMark} value={links.facebook} onChange={(v) => setLinks((l) => ({ ...l, facebook: v }))} placeholder="facebook.com/you" />
        <LinkInput icon={InstagramMark} value={links.instagram} onChange={(v) => setLinks((l) => ({ ...l, instagram: v }))} placeholder="@you" />
        <div className="mt-1 flex items-center gap-2">
          {backBtn}
          <button type="button" onClick={() => onLinks({ skipped: true })} className="text-xs text-muted-foreground hover:text-foreground">
            Skip — I&apos;m starting fresh
          </button>
          <Button type="submit" size="sm" className="ml-auto h-9">
            Continue
          </Button>
        </div>
      </form>
    );

  // handle
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onHandle((handle || ws.handle || "you").trim());
      }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex gap-2">
        {backBtn}
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          autoFocus
          className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring"
          placeholder={ws.handle || "your-handle"}
        />
        <Button type="submit" size="sm" className="h-9">
          Continue
        </Button>
      </div>
      <p className="pl-1 text-xs text-muted-foreground">{slugify(handle) || ws.handle || "you"}.lu.computer</p>
    </form>
  );
}

function LinkInput({
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-ring">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/** Instagram gradient camera (lucide dropped brand icons). */
function InstagramMark({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="ig-grad-ob" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#FA7E1E" />
          <stop offset="0.6" stopColor="#D62976" />
          <stop offset="1" stopColor="#962FBF" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#ig-grad-ob)" />
      <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16.6" cy="7.4" r="1" fill="#fff" />
    </svg>
  );
}
