"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Calendar,
  Check,
  Clock,
  Code2,
  Globe,
  Headphones,
  Import,
  Link2,
  Loader2,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  PenTool,
  Phone,
  Scale,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { SarahIcon } from "@/components/icons/sarah";
import { FacebookMark } from "@/components/content/FacebookMark";
import { ScheduleClient } from "@/components/schedule/ScheduleClient";
import type { AvailabilityWindow } from "@/lib/onboarding-state";
import type { ScheduleItem } from "@/lib/data/schedule/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { writeOnboardedProfile } from "@/lib/org-cookie";
import type { OrgProfile } from "@/lib/data/org-profile";
import { TeamSetup } from "@/components/team/TeamSetup";
import type { Member } from "@/lib/data/team/types";

/**
 * SKETCH — self-onboarding, first run (VISION-LU §3). The owner talks to Lu on
 * the left; on the right, ONE thing fills the space on its turn. The opening
 * asks for their existing web + socials, Lu "studies" them (Tavily-style
 * scrape), and shows a rich "what I know about you" profile — which also seeds
 * her running their socials later. Not wired; a clickable sketch.
 */

type Phase = "welcome" | "chat" | "building" | "ready";
type GcalStatus = "idle" | "loading" | "connected";
type StepKey = "trade" | "links" | "learning" | "handle" | "assistant" | "site" | "email" | "phone" | "sms" | "hours" | "gcal" | "team";

interface Workspace {
  trade?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  gaveLinks?: boolean;
  name?: string;
  handle?: string;
  assistantName?: string;
  emailSent?: boolean;
  line?: string;
  ownerCell?: string;
  textSent?: boolean;
  hours?: string;
  gcal?: boolean;
}

interface Msg {
  id: number;
  role: "lu" | "owner";
  body: string;
}

interface Snapshot {
  step: StepKey;
  ws: Workspace;
  msgs: Msg[];
  avail: Set<string>;
  gcalStatus: GcalStatus;
}

// Neutral quick-fill examples for "what do you do?" — free text is the primary path.
const WORK_EXAMPLES = ["Law firm", "Design agency", "Consulting", "Home services"];
const LINE = "(844) 415-7642";
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Best-guess business name from whatever links they gave (domain / handle → titlecased label). */
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
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "";
}

let mid = 0;
const nextId = () => ++mid;

/* --------------------- availability grid model (shared) -------------------- */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 12 }, (_, i) => 7 + i); // 7a … 6p start-blocks
const fmtHour = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;
const HATCH: React.CSSProperties = { backgroundImage: "repeating-linear-gradient(135deg, color-mix(in oklab, var(--foreground) 34%, transparent) 0 2px, transparent 2px 4.5px)" };
const PRESETS: Record<string, [number[], number, number]> = {
  "Weekdays 8–5": [[0, 1, 2, 3, 4], 8, 17],
  "Weekdays 9–7": [[0, 1, 2, 3, 4], 9, 19],
  "Mon–Sat 9–7": [[0, 1, 2, 3, 4, 5], 9, 19],
};
const presetSet = (label: string) => {
  const s = new Set<string>();
  const [days, h0, h1] = PRESETS[label] ?? [[], 0, 0];
  days.forEach((d) => { for (let h = h0; h < h1; h++) s.add(`${d}-${h}`); });
  return s;
};
// fake Google events, all sitting INSIDE the open hours — the "busy" overlay
const BUSY = [
  { day: 1, start: 14, end: 16, label: "Dentist" },
  { day: 3, start: 9, end: 12, label: "Client meeting" },
  { day: 4, start: 15, end: 17, label: "Errand" },
];

/** onboarding day/hour Set → the schedule component's AvailabilityWindow[] (Mon=1 … Sun=0). */
function windowsFromAvail(avail: Set<string>): AvailabilityWindow[] {
  const out: AvailabilityWindow[] = [];
  for (let d = 0; d < 7; d++) {
    const hrs = HOURS.filter((h) => avail.has(`${d}-${h}`)).sort((a, b) => a - b);
    let start: number | null = null;
    for (let i = 0; i < hrs.length; i++) {
      if (start === null) start = hrs[i];
      if (hrs[i + 1] !== hrs[i] + 1) {
        out.push({ dayOfWeek: (d + 1) % 7, start: `${String(start).padStart(2, "0")}:00`, end: `${String(hrs[i] + 1).padStart(2, "0")}:00` });
        start = null;
      }
    }
  }
  return out;
}

/** the fake Google events as real ScheduleItems, placed in the current week (blocks read as "busy"). */
function busyItemsThisWeek(): ScheduleItem[] {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return BUSY.map((b, i) => {
    const s = new Date(monday); s.setDate(s.getDate() + b.day); s.setHours(b.start, 0, 0, 0);
    const e = new Date(monday); e.setDate(e.getDate() + b.day); e.setHours(b.end, 0, 0, 0);
    return { id: `busy_${i}`, kind: "block" as const, contactName: b.label, startAt: s.toISOString(), endAt: e.toISOString(), status: "confirmed" as const, bookedBy: "owner" as const };
  });
}

/** Instagram gradient camera (lucide dropped brand icons). */
function InstagramMark({ className = "size-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#FA7E1E" />
          <stop offset="0.6" stopColor="#D62976" />
          <stop offset="1" stopColor="#962FBF" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="22" height="22" rx="6" fill="url(#ig-grad)" />
      <rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="16.6" cy="7.4" r="1" fill="#fff" />
    </svg>
  );
}

/** DEV-only: fill every field so you can jump straight to any step and it renders. */
const DEV_DEFAULTS: Workspace = {
  trade: "Design agency",
  website: "northstardesign.com",
  facebook: "facebook.com/northstardesign",
  instagram: "@northstardesign",
  gaveLinks: true,
  name: "Northstar Design",
  handle: "northstardesign",
  assistantName: "Lu",
  emailSent: true,
  line: LINE,
  ownerCell: "(617) 555-0142",
  textSent: true,
  hours: "Mon–Sat 9–7",
  gcal: true,
};
const DEV_STEPS: StepKey[] = ["trade", "links", "learning", "handle", "assistant", "site", "email", "phone", "sms", "hours", "gcal", "team"];

/** DEV-only skip bar (this is a dev harness) — jump to any step or phase. */
function DevBar({ phase, step, onStep, onPhase }: { phase: Phase; step: StepKey; onStep: (s: StepKey) => void; onPhase: (p: Phase) => void }) {
  const pill = "shrink-0 rounded-full px-2 py-0.5 capitalize text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";
  const on = "bg-foreground text-background";
  return (
    <div className="fixed left-1/2 top-2 z-50 flex max-w-[96vw] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full border bg-card/95 px-2 py-1 text-[10px] shadow-md backdrop-blur">
      <span className="shrink-0 pr-1 font-semibold uppercase tracking-wide text-muted-foreground/70">dev · skip to</span>
      <button type="button" onClick={() => onPhase("welcome")} className={cn(pill, phase === "welcome" && on)}>welcome</button>
      {DEV_STEPS.map((s) => (
        <button key={s} type="button" onClick={() => onStep(s)} className={cn(pill, phase === "chat" && step === s && on)}>
          {s}
        </button>
      ))}
      <button type="button" onClick={() => onPhase("building")} className={cn(pill, phase === "building" && on)}>building</button>
      <button type="button" onClick={() => onPhase("ready")} className={cn(pill, phase === "ready" && on)}>ready</button>
    </div>
  );
}

export function OnboardingSketch() {
  const [phase, setPhase] = React.useState<Phase>("welcome");
  const [step, setStep] = React.useState<StepKey>("trade");
  const [ws, setWs] = React.useState<Workspace>({});
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [typingId, setTypingId] = React.useState<number | null>(null);
  const [avail, setAvail] = React.useState<Set<string>>(new Set());
  const [gcalStatus, setGcalStatus] = React.useState<GcalStatus>("idle");
  const [history, setHistory] = React.useState<Snapshot[]>([]);
  const [teamMembers, setTeamMembers] = React.useState<Member[]>([]);
  const pushHistory = () => setHistory((h) => [...h, { step, ws, msgs, avail, gcalStatus }]);
  const goBack = () =>
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setStep(prev.step);
      setWs(prev.ws);
      setMsgs(prev.msgs);
      setAvail(prev.avail);
      setGcalStatus(prev.gcalStatus);
      setTypingId(null);
      return h.slice(0, -1);
    });
  const threadRef = React.useRef<HTMLDivElement>(null);

  const say = (role: Msg["role"], body: string) => {
    const id = nextId();
    setMsgs((m) => [...m, { id, role, body }]);
    if (role === "lu") setTypingId(id);
    return id;
  };
  const scrollThread = React.useCallback(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }), []);
  React.useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }); }, [msgs, step, typingId]);

  const start = () => {
    setPhase("chat");
    say("lu", "Welcome — I'm Lu. Let's set up your workspace. First, what's your business — what do you do?");
  };

  /* ------------------------------ the steps ------------------------------ */
  const answerTrade = (t: string) => {
    pushHistory();
    say("owner", t);
    setWs((w) => ({ ...w, trade: t }));
    say("lu", `${t} — got it. Do you already have a website or socials? Drop whatever you've got and I'll study up — it's how I learn your voice, your services, all of it.`);
    setStep("links");
  };
  const answerLinks = (data: { website?: string; facebook?: string; instagram?: string; skipped?: boolean }) => {
    pushHistory();
    if (data.skipped) {
      say("owner", "Starting fresh");
      setWs((w) => ({ ...w, gaveLinks: false }));
      say("lu", `No problem — we'll build it together and I'll learn as we go. Give me one sec…`);
    } else {
      const name = nameFromLinks(data);
      say("owner", [data.website, data.facebook, data.instagram].filter(Boolean).join(" · "));
      setWs((w) => ({ ...w, ...data, gaveLinks: true, name, handle: slugify(name) }));
      say("lu", `Great — reading through those now. Give me a few seconds 👉`);
    }
    setStep("learning");
  };
  const continueLearning = () => {
    pushHistory();
    const name = ws.name?.trim();
    say(
      "lu",
      ws.gaveLinks && name
        ? `That's you 👍 I've got you as ${name} — your Lu handle will be “${ws.handle}”. Keep it, or change it?`
        : `Let's start with the basics — what's your business called?`,
    );
    setStep("handle");
  };
  const answerHandle = (name: string) => {
    pushHistory();
    const handle = slugify(name);
    say("owner", name);
    setWs((w) => ({ ...w, name, handle }));
    say("lu", `${name} — love it, and your handle is reserved at ${handle}.lu.computer. One more thing before we go on — what do you want to call me? Most keep it Lu, but I'll answer to anything.`);
    setStep("assistant");
  };
  const answerAssistant = (assistantName: string) => {
    pushHistory();
    const named = assistantName.trim() || "Lu";
    say("owner", named);
    setWs((w) => ({ ...w, assistantName: named }));
    say("lu", `${named} it is — that's what your customers will hear too. Your Lu Space is live at ${ws.handle}.lu.computer 👉 build it with me anytime, or connect the site you already have.`);
    setStep("site");
  };
  const continueSite = () => {
    pushHistory();
    say("lu", `You've also got an inbox at ${ws.handle}@lu.computer. Want to see an email from me? Tap it on the right 👉`);
    setStep("email");
  };
  const getEmail = () => {
    pushHistory();
    setWs((w) => ({ ...w, emailSent: true, line: LINE }));
    say("lu", `Sent — that's your inbox 👉 it's where I forward everything from your customers, and anything that needs you.`);
  };
  const continueEmail = () => {
    pushHistory();
    say("lu", `I also answer your customers on ${LINE}. What's your cell, so I can reach you?`);
    setStep("phone");
  };
  const answerPhone = (cell: string) => {
    pushHistory();
    say("owner", cell);
    setWs((w) => ({ ...w, ownerCell: cell }));
    say("lu", `Perfect. Want to feel it? Text yourself from me 👉`);
    setStep("sms");
  };
  const getText = () => {
    pushHistory();
    setWs((w) => ({ ...w, textSent: true }));
    say("lu", `There it is 👉 that's me, live on your line. I'll text you there whenever something needs your OK.`);
  };
  const continueSms = () => {
    pushHistory();
    say("lu", `Last couple things — when can I book you for work?`);
    setAvail(presetSet("Mon–Sat 9–7"));
    setWs((w) => ({ ...w, hours: "Mon–Sat 9–7" }));
    setStep("hours");
  };
  const applyPreset = (label: string) => {
    setAvail(presetSet(label));
    setWs((w) => ({ ...w, hours: label }));
  };
  const editAvail = (next: Set<string>) => {
    setAvail(next);
    setWs((w) => ({ ...w, hours: "Custom hours" }));
  };
  const continueHours = () => {
    pushHistory();
    say("lu", `Perfect — those are your open hours. One more: connect Google Calendar so I also see when you're already busy. I'll never book over a real appointment.`);
    setStep("gcal");
  };
  const connectGcal = () => {
    pushHistory();
    say("owner", "Connect Google Calendar");
    setGcalStatus("loading");
    say("lu", `One sec — reading your Google Calendar…`);
    setTimeout(() => {
      setGcalStatus("connected");
      setWs((w) => ({ ...w, gcal: true }));
      say("lu", `Got it — here's your week with everything already on it. I'll book around these.`);
    }, 1600);
  };
  const skipGcal = () => {
    pushHistory();
    setWs((w) => ({ ...w, gcal: false }));
    setStep("team");
  };
  const continueGcal = () => {
    pushHistory();
    setStep("team");
  };
  // team step is the last one → go straight to building the workspace.
  const finishTeam = () => setPhase("building");

  const openWorkspace = () => {
    const teammates = teamMembers.filter((m) => m.roleKey !== "owner");
    const profile: OrgProfile = {
      id: "org_new",
      companyName: ws.name || "Your Company",
      sarahName: ws.assistantName || "Lu",
      projectTypes: ws.trade ? [ws.trade] : [],
      standingAvailability: { timezone: "America/New_York", windows: windowsFromAvail(avail) },
      twilioNumber: ws.line || "(844) 415-7642",
      ownerCell: ws.ownerCell,
      siteHandle: ws.handle ? `${ws.handle}.lu.computer` : undefined,
      assistantEmail: ws.handle ? `${ws.handle}@lu.computer` : undefined,
      gcalConnected: !!ws.gcal,
      // Fixed nav — every new org gets the same surfaces, honest-empty.
      modules: { crm: "live", schedule: "live", money: "live", team: "live", agents: "live", sites: "live" },
      setupSteps: { assistant: true, hours: avail.size > 0, google: !!ws.gcal, ...(teammates.length ? { team: true } : {}) },
      seedMembers: teammates,
    };
    writeOnboardedProfile(profile);
    window.location.href = "/home";
  };

  const jumpToStep = (s: StepKey) => {
    setPhase("chat");
    setWs((w) => ({ ...DEV_DEFAULTS, ...w }));
    setMsgs([]);
    setTypingId(null);
    setHistory([]);
    setAvail((a) => (["hours", "gcal", "team"].includes(s) && a.size === 0 ? presetSet("Mon–Sat 9–7") : a));
    setGcalStatus(["gcal", "team"].includes(s) ? "connected" : "idle");
    setStep(s);
  };
  const jumpToPhase = (p: Phase) => {
    setWs((w) => ({ ...DEV_DEFAULTS, ...w }));
    setPhase(p);
  };
  const devBar = <DevBar phase={phase} step={step} onStep={jumpToStep} onPhase={jumpToPhase} />;

  if (phase === "welcome") return (<>{devBar}<Welcome onStart={start} /></>);
  if (phase === "building") return (<>{devBar}<Building name={ws.name ?? "your business"} onDone={() => setPhase("ready")} /></>);
  if (phase === "ready") return (<>{devBar}<Ready ws={ws} onOpenWorkspace={openWorkspace} /></>);

  // last step — Lu builds your team graph with you (same experience as the Team page)
  if (step === "team")
    return (
      <>
        {devBar}
        <div className="mx-auto h-svh w-full max-w-6xl p-4 sm:p-6">
          <TeamSetup
            ownerName="You"
            onMembersChange={setTeamMembers}
            onDone={finishTeam}
            onSkip={finishTeam}
            doneLabel="Build my workspace"
            skipLabel="Skip — add my team later"
            className="h-full"
          />
        </div>
      </>
    );

  const hint =
    step === "learning"
      ? "Getting to know you… →"
      : step === "site"
        ? "Take a look, then continue →"
        : step === "email"
          ? "Tap “Get an email from Lu” →"
          : step === "sms"
            ? "Tap “Text me from Lu” →"
            : step === "gcal"
              ? gcalStatus === "loading"
                ? "Reading your calendar…"
                : gcalStatus === "connected"
                  ? "Looks good? Continue →"
                  : "Connect on the right →"
              : null;

  const backBtn =
    history.length > 0 ? (
      <button
        type="button"
        onClick={goBack}
        aria-label="Back"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </button>
    ) : null;

  return (
    <div className="mx-auto flex h-svh w-full max-w-6xl gap-4 p-4 sm:p-6">
      {devBar}
      {/* LEFT — Lu's conversation */}
      <div className="flex w-full max-w-md shrink-0 flex-col overflow-hidden rounded-3xl border bg-card">
        <header className="flex items-center gap-2 border-b px-4 py-3">
          <SarahIcon className="size-5" />
          <span className="text-sm font-semibold">Lu</span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" /> setting you up
          </span>
        </header>
        <div ref={threadRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {msgs.map((m) =>
            m.role === "lu" ? (
              <motion.p key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-sm leading-relaxed text-foreground">
                <Typewriter text={m.body} stream={m.id === typingId} onTick={scrollThread} onDone={() => setTypingId((t) => (t === m.id ? null : t))} />
              </motion.p>
            ) : (
              <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                <span className="max-w-[85%] rounded-2xl bg-muted px-3 py-2 text-sm leading-relaxed text-foreground">{m.body}</span>
              </motion.div>
            ),
          )}
        </div>
        <div className="border-t px-4 py-3">
          {typingId === null ? (
            hint ? (
              <div className="flex items-center gap-2">
                {backBtn}
                <p className="flex-1 text-center text-xs text-muted-foreground">{hint}</p>
                {/* mirror the back button's width so the hint centers on the card, not the leftover space */}
                {backBtn && <div className="size-9 shrink-0" aria-hidden />}
              </div>
            ) : (
              <AnswerArea step={step} ws={ws} back={backBtn} onTrade={answerTrade} onLinks={answerLinks} onHandle={answerHandle} onAssistant={answerAssistant} onPhone={answerPhone} onPreset={applyPreset} onContinueHours={continueHours} />
            )
          ) : (
            <div className="flex h-9 items-center">{backBtn}</div>
          )}
        </div>
      </div>

      {/* RIGHT — one thing, full space, on its turn */}
      <div className="hidden flex-1 overflow-hidden rounded-3xl border bg-sidebar/40 md:block">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="h-full">
            <Stage
              step={step}
              ws={ws}
              avail={avail}
              onEditAvail={editAvail}
              gcalStatus={gcalStatus}
              onConnectGcal={connectGcal}
              onSkipGcal={skipGcal}
              onContinueGcal={continueGcal}
              onContinueLearning={continueLearning}
              onContinueSite={continueSite}
              onGetEmail={getEmail}
              onContinueEmail={continueEmail}
              onGetText={getText}
              onContinueSms={continueSms}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------ the right stage ---------------------------- */

function Stage({
  step,
  ws,
  avail,
  onEditAvail,
  gcalStatus,
  onConnectGcal,
  onSkipGcal,
  onContinueGcal,
  onContinueLearning,
  onContinueSite,
  onGetEmail,
  onContinueEmail,
  onGetText,
  onContinueSms,
}: {
  step: StepKey;
  ws: Workspace;
  avail: Set<string>;
  onEditAvail: (n: Set<string>) => void;
  gcalStatus: GcalStatus;
  onConnectGcal: () => void;
  onSkipGcal: () => void;
  onContinueGcal: () => void;
  onContinueLearning: () => void;
  onContinueSite: () => void;
  onGetEmail: () => void;
  onContinueEmail: () => void;
  onGetText: () => void;
  onContinueSms: () => void;
}) {
  if (step === "trade") return <IntroStage />;
  if (step === "links") return <LinksPromptStage />;
  if (step === "learning") return <ProfileStage ws={ws} scanning onContinue={onContinueLearning} />;
  if (step === "handle") return <ProfileStage ws={ws} />;
  if (step === "assistant") return <AssistantStage ws={ws} />;
  if (step === "site") return <WebsiteStage ws={ws} onContinue={onContinueSite} />;
  if (step === "email") return <EmailStage ws={ws} onGet={onGetEmail} onContinue={onContinueEmail} />;
  if (step === "phone") return <LineStage ws={ws} />;
  if (step === "sms") return <MessagesStage ws={ws} onGet={onGetText} onContinue={onContinueSms} />;
  if (step === "hours") return <AvailabilityStage value={avail} onChange={onEditAvail} />;
  return <CalendarStage value={avail} status={gcalStatus} onConnect={onConnectGcal} onSkip={onSkipGcal} onContinue={onContinueGcal} />;
}

function IntroStage() {
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-xs">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-card">
          <SarahIcon className="size-7" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Let's get to know your business</h2>
        <p className="mt-2 text-sm text-muted-foreground">Tell Lu what you do and share your links — she learns your voice, services, and reviews, then runs with it.</p>
      </div>
    </div>
  );
}

function AssistantStage({ ws }: { ws: Workspace }) {
  const name = ws.assistantName ?? "Lu";
  return (
    <div className="flex h-full items-center justify-center p-8 text-center">
      <div className="max-w-xs">
        <div className="relative mx-auto flex size-16 items-center justify-center rounded-2xl border bg-card">
          <SarahIcon className="size-8" />
          <span className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border bg-background">
            <Sparkles className="size-3.5 text-muted-foreground" />
          </span>
        </div>
        <h2 className="mt-4 text-lg font-semibold">Meet {name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          It's the name your customers hear when {name} answers your line, replies to texts, and emails on your behalf. Keep it Lu, or make it yours — you can rename anytime.
        </p>
      </div>
    </div>
  );
}

function LinksPromptStage() {
  const rows = [
    { icon: Globe, label: "Website", note: "your services & pricing" },
    { icon: FacebookMark, label: "Facebook", note: "your posts & reviews" },
    { icon: InstagramMark, label: "Instagram", note: "your recent work" },
  ];
  return (
    <StageShell title="Your online presence" subtitle="Share what you've got — Lu reads all of it">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex w-full max-w-xs items-center gap-3 rounded-2xl border bg-card p-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
              <r.icon className="size-4 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">She'll learn {r.note}</p>
            </div>
          </div>
        ))}
        <p className="mt-1 max-w-xs text-center text-xs text-muted-foreground">The more I read, the more I sound like you — not a robot.</p>
      </div>
    </StageShell>
  );
}

/** The payoff of the scrape — scans, then reveals what Lu learned. */
function ProfileStage({ ws, scanning, onContinue }: { ws: Workspace; scanning?: boolean; onContinue?: () => void }) {
  const sources = [ws.website ? `Reading ${ws.website}` : "Reading your website", "Scanning your socials", "Reading your reviews", "Learning your voice"];
  const [done, setDone] = React.useState(scanning ? 0 : sources.length);
  const revealed = done >= sources.length;
  React.useEffect(() => {
    if (!scanning || revealed) return;
    const t = setTimeout(() => setDone((d) => d + 1), 650);
    return () => clearTimeout(t);
  }, [done, scanning, revealed]);

  if (!ws.gaveLinks) {
    // starting fresh — nothing to scrape; keep it light and let it fill in as we go
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="max-w-xs">
          <Sparkles className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No links yet — we'll build your profile together as we go, and I'll learn more the more we work.</p>
          {scanning && onContinue && <Button className="btn-glow mt-4 gap-2" onClick={onContinue}>Continue <ArrowRight className="size-4" /></Button>}
        </div>
      </div>
    );
  }

  return (
    <StageShell
      title="What Lu knows about you"
      subtitle={revealed ? "Tuned from your site, socials, and reviews" : "Studying your business…"}
      footer={revealed && onContinue ? <Button className="btn-glow w-full gap-2" onClick={onContinue}>Continue <ArrowRight className="size-4" /></Button> : undefined}
    >
      {!revealed ? (
        <div className="flex flex-1 flex-col justify-center gap-3">
          {sources.map((s, i) => (
            <div key={s} className="flex items-center gap-2.5 text-sm">
              <span className={cn("flex size-5 items-center justify-center rounded-full", i < done ? "text-emerald-500" : "text-muted-foreground")}>
                {i < done ? <Check className="size-4" /> : i === done ? <Loader2 className="size-4 animate-spin" /> : <span className="size-1.5 rounded-full bg-muted-foreground/40" />}
              </span>
              <span className={i < done ? "text-foreground" : "text-muted-foreground"}>{s}</span>
            </div>
          ))}
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 space-y-4 overflow-y-auto">
          <ProfileRow label="You are" value={ws.name?.trim() || "Your business"} />
          {ws.trade?.trim() && <ProfileRow label="What you do" value={ws.trade} />}
          <ProfileRow label="Your voice" value="Clear and friendly — I'll keep tuning it to sound like you" />
          <ProfileRow label="Reviews" value="I'll gather and showcase these as they come in" />
          {(ws.facebook || ws.instagram) && (
            <div>
              <p className="text-xs text-muted-foreground">Socials</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {ws.facebook && <span className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs"><FacebookMark className="size-3.5" /> Facebook</span>}
                {ws.instagram && <span className="flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs"><InstagramMark className="size-3.5" /> Instagram</span>}
                <span className="text-xs text-muted-foreground">— I can post for you</span>
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">I'll keep learning as we work together.</p>
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

function StageShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
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

function WebsiteStage({ ws, onContinue }: { ws: Workspace; onContinue: () => void }) {
  const options = [
    { icon: Sparkles, label: "Build it with Lu", note: "just tell her what you want" },
    { icon: Globe, label: ws.website ? `Connect ${ws.website}` : "Connect your site", note: "use the one you already have" },
    { icon: Link2, label: "Add your domain", note: `${ws.handle}.com, anytime` },
  ];
  return (
    <StageShell
      title="Your Lu Space"
      subtitle={`Reserved at ${ws.handle}.lu.computer`}
      footer={
        <Button className="btn-glow w-full gap-2" onClick={onContinue}>
          Continue <ArrowRight className="size-4" />
        </Button>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {/* the reserved space — a clean branded holding page, not a template */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
          <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-1.5">
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="ml-2 flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
              <Globe className="size-3" /> {ws.handle}.lu.computer
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-b from-muted/40 to-transparent p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-foreground text-lg font-bold text-background">
              {ws.name?.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold">{ws.name}</p>
              <p className="text-xs text-muted-foreground">{ws.handle}.lu.computer</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Your space is live — ready when you are
            </span>
          </div>
        </div>
        {/* how you fill it */}
        <div className="grid grid-cols-3 gap-2">
          {options.map((o) => (
            <div key={o.label} className="rounded-2xl border bg-card p-3">
              <o.icon className="size-4 text-muted-foreground" />
              <p className="mt-2 truncate text-xs font-medium">{o.label}</p>
              <p className="truncate text-[11px] text-muted-foreground">{o.note}</p>
            </div>
          ))}
        </div>
      </div>
    </StageShell>
  );
}

function EmailStage({ ws, onGet, onContinue }: { ws: Workspace; onGet: () => void; onContinue: () => void }) {
  return (
    <StageShell
      title="Your inbox"
      subtitle={`${ws.handle}@lu.computer`}
      footer={ws.emailSent ? <Button className="btn-glow w-full gap-2" onClick={onContinue}>Continue <ArrowRight className="size-4" /></Button> : undefined}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs text-muted-foreground">
          <Mail className="size-4" /> Inbox {ws.emailSent && <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">1 new</span>}
        </div>
        {ws.emailSent ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-muted"><SarahIcon className="size-4.5" /></span>
              <div>
                <p className="text-sm font-semibold">Lu</p>
                <p className="text-xs text-muted-foreground">{ws.handle}@lu.computer · just now</p>
              </div>
            </div>
            <h3 className="mt-4 text-base font-semibold">Welcome to your workspace</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              This is your inbox — I'll forward every customer message, quote, and anything that needs you right here. Reply to any of it
              and I'll take it from there. Talk soon,
            </p>
            <p className="mt-2 text-sm text-muted-foreground">— Lu</p>
          </motion.div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-muted"><Mail className="size-7 text-muted-foreground" /></span>
            <div>
              <p className="text-sm font-medium">Your inbox is ready.</p>
              <p className="mt-1 text-sm text-muted-foreground">See how it feels — I'll send you a note right now.</p>
            </div>
            <Button className="btn-glow gap-2" onClick={onGet}>
              <Mail className="size-4" /> Get an email from Lu
            </Button>
          </div>
        )}
      </div>
    </StageShell>
  );
}

function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[280px] flex-col overflow-hidden rounded-[2rem] border-4 border-foreground/10 bg-card shadow-sm">
      <div className="flex items-center justify-center gap-1.5 border-b bg-muted/40 py-2 text-[11px] font-medium text-muted-foreground">{label}</div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function LineStage({ ws }: { ws: Workspace }) {
  return (
    <StageShell title="Your line" subtitle="Lu answers every call and text, 24/7">
      <div className="flex flex-1 items-center justify-center">
        <PhoneFrame label={ws.line ?? LINE}>
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="relative flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
              <span className="absolute inline-flex size-14 animate-ping rounded-full bg-emerald-500/20" />
              <Phone className="size-6 text-emerald-600 dark:text-emerald-400" />
            </span>
            <p className="text-sm font-semibold">Lu is answering</p>
            <p className="text-xs text-muted-foreground">{ws.line ?? LINE}</p>
            <p className="mt-1 text-xs text-muted-foreground">Missed calls get a text back in seconds — you never miss a customer.</p>
          </div>
        </PhoneFrame>
      </div>
    </StageShell>
  );
}

function MessagesStage({ ws, onGet, onContinue }: { ws: Workspace; onGet: () => void; onContinue: () => void }) {
  return (
    <StageShell
      title="A text from Lu"
      subtitle="This is how she reaches you"
      footer={ws.textSent ? <Button className="btn-glow w-full gap-2" onClick={onContinue}>Continue <ArrowRight className="size-4" /></Button> : undefined}
    >
      <div className="flex flex-1 items-center justify-center">
        <PhoneFrame label={`Lu · ${ws.line ?? LINE}`}>
          {ws.textSent ? (
            <div className="flex flex-1 flex-col justify-end gap-1.5 p-3">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-sm">
                Hey, it's Lu 👋 I'm live on your line now — I'll text you here whenever something needs your OK.
              </motion.div>
              <p className="pl-1 text-[10px] text-muted-foreground">delivered · now</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-muted"><MessageSquare className="size-6 text-muted-foreground" /></span>
              <p className="text-sm text-muted-foreground">Tap below and I'll text your phone right now.</p>
              <Button size="sm" className="btn-glow gap-1.5" onClick={onGet}>
                <MessageSquare className="size-3.5" /> Text me from Lu
              </Button>
            </div>
          )}
        </PhoneFrame>
      </div>
    </StageShell>
  );
}

/** Shared week grid — availability (paint) and calendar (busy overlay) draw the SAME scaffold. */
function AvailabilityGrid({ value, onChange, busy }: { value: Set<string>; onChange?: (n: Set<string>) => void; busy?: { day: number; start: number; end: number; label: string }[] }) {
  const paint = React.useRef<"add" | "remove" | null>(null);
  React.useEffect(() => {
    const up = () => (paint.current = null);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);
  const key = (d: number, h: number) => `${d}-${h}`;
  const apply = (d: number, h: number) => {
    if (!onChange) return;
    const n = new Set(value);
    if (paint.current === "add") n.add(key(d, h));
    else n.delete(key(d, h));
    onChange(n);
  };
  const down = (d: number, h: number) => {
    if (!onChange) return;
    paint.current = value.has(key(d, h)) ? "remove" : "add";
    apply(d, h);
  };
  const busyAt = (d: number, h: number) => !!busy?.some((b) => b.day === d && h >= b.start && h < b.end);
  const cols = "2.25rem repeat(7, minmax(0, 1fr))";
  return (
    <div className="w-full max-w-2xl select-none">
      <div className="mb-1 grid gap-px" style={{ gridTemplateColumns: cols }}>
        <div />
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-medium text-muted-foreground">{d}</div>
        ))}
      </div>
      <div className="grid gap-px" style={{ gridTemplateColumns: cols }}>
        {HOURS.map((h) => (
          <React.Fragment key={h}>
            <div className="pr-1.5 text-right text-[10px] leading-6 text-muted-foreground">{(h - 7) % 2 === 0 ? fmtHour(h) : ""}</div>
            {DAYS.map((_, d) => {
              const open = value.has(key(d, h));
              const b = busyAt(d, h);
              return (
                <div
                  key={d}
                  onPointerDown={() => down(d, h)}
                  onPointerEnter={() => paint.current && apply(d, h)}
                  className={cn("h-6 rounded-[3px]", onChange && "cursor-pointer", open ? "bg-emerald-500/25 hover:bg-emerald-500/35" : "bg-muted/50 hover:bg-muted", b && "bg-foreground/10 hover:bg-foreground/10")}
                  style={b ? HATCH : undefined}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function AvailabilityStage({ value, onChange }: { value: Set<string>; onChange: (n: Set<string>) => void }) {
  return (
    <StageShell title="When Lu can book you" subtitle="Your open hours — the windows she offers customers. Tap a preset, then paint to adjust.">
      <div className="flex flex-1 flex-col items-center justify-center">
        <AvailabilityGrid value={value} onChange={onChange} />
        <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-emerald-500/25" /> Open — can be booked</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded bg-muted/50" /> Closed</span>
        </div>
      </div>
    </StageShell>
  );
}

/** Scales fixed-width content (the schedule calendar) down to fit the panel — fits in the normal view. */
// Measure before the browser paints so the calendar never flashes at full size
// and then snap-shrinks. SSR falls back to useEffect (no window to measure against).
const useIsoLayoutEffect = typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

function FitToWidth({ contentWidth, children }: { contentWidth: number; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(0); // 0 = not yet measured → keep hidden
  const [h, setH] = React.useState<number | undefined>();
  useIsoLayoutEffect(() => {
    const el = ref.current;
    const inner = innerRef.current;
    if (!el || !inner) return;
    const measure = () => {
      const w = el.clientWidth;
      if (!w) return;
      const sc = Math.min(1, w / contentWidth);
      setScale(sc);
      setH(inner.scrollHeight * sc);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [contentWidth]);
  return (
    <div ref={ref} className="w-full" style={{ height: h }}>
      <div
        ref={innerRef}
        style={{
          width: contentWidth,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          visibility: scale ? "visible" : "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function CalendarStage({ value, status, onConnect, onSkip, onContinue }: { value: Set<string>; status: GcalStatus; onConnect: () => void; onSkip: () => void; onContinue: () => void }) {
  const items = React.useMemo(() => busyItemsThisWeek(), []);
  const windows = React.useMemo(() => windowsFromAvail(value), [value]);
  if (status === "idle")
    return (
      <StageShell title="Your calendar" subtitle="Connect Google so I see what's already on your plate">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted"><Calendar className="size-7 text-muted-foreground" /></span>
          <div className="max-w-xs">
            <p className="text-sm font-medium">Connect your Google Calendar</p>
            <p className="mt-1 text-sm text-muted-foreground">I'll pull in your real events and book around them — so you're never double-booked.</p>
          </div>
          <Button className="btn-glow gap-2" onClick={onConnect}><Calendar className="size-4" /> Connect Google Calendar</Button>
          <button type="button" onClick={onSkip} className="text-xs text-muted-foreground hover:text-foreground">Skip for now</button>
        </div>
      </StageShell>
    );
  if (status === "loading")
    return (
      <StageShell title="Your calendar" subtitle="Reading your Google Calendar…">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Pulling in your events…</p>
        </div>
      </StageShell>
    );
  return (
    <StageShell
      title="Your calendar, on top of your hours"
      subtitle="Green is your open hours; hatched blocks are what's already on your Google calendar. I book around both."
      footer={<Button className="btn-glow w-full gap-2" onClick={onContinue}>Continue <ArrowRight className="size-4" /></Button>}
    >
      <div className="min-h-0 flex-1 overflow-auto">
        <FitToWidth contentWidth={760}>
          <ScheduleClient items={items} demo timezone="America/New_York" windows={windows} sync={{ state: "connected" }} routeFixture={null} base={null} embedded />
        </FitToWidth>
      </div>
    </StageShell>
  );
}

/* --------------------------------- phases ---------------------------------- */

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-5 px-6 text-center">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex size-16 items-center justify-center rounded-2xl border bg-card">
        <SarahIcon className="size-8" />
      </motion.div>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">You're in.</h1>
        <p className="mt-2 max-w-md text-muted-foreground">You're off the waitlist. Let's set up Lu — the AI that runs your front office. I'll walk you through it, step by step.</p>
      </div>
      <Button size="lg" className="btn-glow gap-2" onClick={onStart}>
        Set up with Lu <ArrowRight className="size-4" />
      </Button>
      <p className="text-xs text-muted-foreground">No forms. You just tell Lu about your business.</p>
    </div>
  );
}

function Building({ name, onDone }: { name: string; onDone: () => void }) {
  const steps = ["Tuning Lu for your business", "Publishing your website", "Wiring Lu's email", "Claiming your line", "Setting your hours"];
  const [done, setDone] = React.useState(0);
  React.useEffect(() => {
    if (done >= steps.length) {
      const t = setTimeout(onDone, 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setDone((d) => d + 1), 520);
    return () => clearTimeout(t);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex h-svh flex-col items-center justify-center gap-6 px-6">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
          className="flex"
        >
          <SarahIcon className="size-5" />
        </motion.span>
        Building {name}…
      </div>
      <div className="flex w-fit flex-col gap-2.5">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2.5 text-sm">
            <span className={cn("flex size-5 items-center justify-center rounded-full border", i < done ? "border-emerald-500 bg-emerald-500 text-white" : "text-muted-foreground")}>
              {i < done ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <span className={i < done ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Lu's eight departments — Engineering is live today; the rest are on the way.
const DEPARTMENTS: { label: string; icon: React.ComponentType<{ className?: string }>; active?: boolean }[] = [
  { label: "Support", icon: Headphones },
  { label: "Operations", icon: Boxes },
  { label: "Finance", icon: Wallet },
  { label: "Legal", icon: Scale },
  { label: "Engineering", icon: Code2, active: true },
  { label: "Design", icon: PenTool },
  { label: "Marketing", icon: Megaphone },
  { label: "Sales", icon: TrendingUp },
];

function Ready({ ws, onOpenWorkspace }: { ws: Workspace; onOpenWorkspace: () => void }) {
  const setup = [
    { icon: Globe, label: "Website", value: `${ws.handle}.lu.computer`, live: true },
    { icon: Mail, label: "Email", value: `${ws.handle}@lu.computer` },
    { icon: MessageSquare, label: "Your line", value: ws.line ?? LINE, live: true },
    { icon: Phone, label: "Reaches you", value: ws.ownerCell ?? "—" },
    { icon: Clock, label: "Availability", value: ws.hours ?? "—" },
    { icon: Calendar, label: "Calendar", value: ws.gcal ? "Google — synced" : "Not connected", live: ws.gcal },
  ];
  const ladder = [
    { icon: Import, title: "Bring your customer history", metric: "usually 200+ contacts — your first review pool", href: "/customers/import" },
    { icon: Star, title: "Launch your first review wave", metric: "owners see +20 Google reviews in week one", href: "/reviews/new" },
    { icon: Globe, title: "Connect your own domain", metric: `${ws.handle}.com → live in minutes`, href: "/website" },
  ];
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 pb-10 pt-8">
      <div className="text-center">
        <h1 className="flex items-center justify-center gap-2.5 text-3xl font-semibold tracking-tight">
          <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="size-5 text-emerald-500" />
          </motion.span>
          {ws.name} is live.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Lu is answering your line right now. Here's what she set up.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        {setup.map((s, i) => (
          <div key={s.label} className={cn("flex items-center gap-3 px-4 py-3", i > 0 && "border-t border-border/60")}>
            <s.icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="w-28 shrink-0 text-sm text-muted-foreground">{s.label}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.value}</span>
            {s.live && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" /> live
              </span>
            )}
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Your departments</p>
        <p className="mt-1 text-sm text-muted-foreground">Lu runs each one. Engineering is live now — the rest are on the way.</p>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DEPARTMENTS.map((d) => (
            <div key={d.label} className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-3", !d.active && "opacity-60")}>
              <div className="flex items-center justify-between">
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  <d.icon className="size-4 text-muted-foreground" />
                </span>
                {!d.active && <Lock className="size-3 text-muted-foreground/60" />}
              </div>
              <p className="text-sm font-medium">{d.label}</p>
              {d.active ? (
                <span className="flex w-fit items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Active
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">In development</span>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Where the next wins are</p>
        <div className="mt-3 flex flex-col gap-2">
          {ladder.map((s) => (
            <button key={s.title} type="button" onClick={() => { window.location.href = s.href; }} className="card-lift flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-left">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                <s.icon className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.title}</p>
                <p className="truncate text-xs text-muted-foreground">{s.metric}</p>
              </div>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground/50" />
            </button>
          ))}
        </div>
      </div>

      <Button size="lg" className="btn-glow mx-auto gap-2" onClick={onOpenWorkspace}>
        Open my workspace <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/* --------------------------------- answers --------------------------------- */

function AnswerArea({
  step,
  ws,
  back,
  onTrade,
  onLinks,
  onHandle,
  onAssistant,
  onPhone,
  onPreset,
  onContinueHours,
}: {
  step: StepKey;
  ws: Workspace;
  back?: React.ReactNode;
  onTrade: (t: string) => void;
  onLinks: (d: { website?: string; facebook?: string; instagram?: string; skipped?: boolean }) => void;
  onHandle: (n: string) => void;
  onAssistant: (n: string) => void;
  onPhone: (p: string) => void;
  onPreset: (label: string) => void;
  onContinueHours: () => void;
}) {
  const [trade, setTrade] = React.useState(ws.trade ?? "");
  const [name, setName] = React.useState(ws.name ?? "");
  const [assistantName, setAssistantName] = React.useState(ws.assistantName ?? "Lu");
  const [cell, setCell] = React.useState("");
  const [links, setLinks] = React.useState({ website: "", facebook: "", instagram: "" });

  if (step === "trade")
    return (
      <div className="flex flex-col gap-2">
        <form onSubmit={(e) => { e.preventDefault(); if (trade.trim()) onTrade(trade.trim()); }} className="flex gap-2">
          {back}
          <input value={trade} onChange={(e) => setTrade(e.target.value)} autoFocus className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring" placeholder="What do you do? In your own words…" />
          <Button type="submit" size="sm" className="h-9" disabled={!trade.trim()}>Continue</Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {WORK_EXAMPLES.map((t) => (
            <button key={t} type="button" onClick={() => setTrade(t)} className="rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground">
              {t}
            </button>
          ))}
        </div>
      </div>
    );

  if (step === "links")
    return (
      <form onSubmit={(e) => { e.preventDefault(); onLinks(links); }} className="flex flex-col gap-2">
        <LinkInput icon={Globe} value={links.website} onChange={(v) => setLinks((l) => ({ ...l, website: v }))} placeholder="yoursite.com" />
        <LinkInput icon={FacebookMark} value={links.facebook} onChange={(v) => setLinks((l) => ({ ...l, facebook: v }))} placeholder="facebook.com/you" />
        <LinkInput icon={InstagramMark} value={links.instagram} onChange={(v) => setLinks((l) => ({ ...l, instagram: v }))} placeholder="@you" />
        <div className="mt-1 flex items-center gap-2">
          {back}
          <button type="button" onClick={() => onLinks({ skipped: true })} className="text-xs text-muted-foreground hover:text-foreground">
            Skip — I'm starting fresh
          </button>
          <Button type="submit" size="sm" className="ml-auto h-9">Continue</Button>
        </div>
      </form>
    );

  if (step === "handle")
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onHandle(name.trim()); }} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          {back}
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring" placeholder="Your business name" />
          <Button type="submit" size="sm" className="h-9">Continue</Button>
        </div>
        {name.trim() && <p className="pl-1 text-xs text-muted-foreground">your handle: {slugify(name) || "…"}.lu.computer</p>}
      </form>
    );

  if (step === "assistant")
    return (
      <form onSubmit={(e) => { e.preventDefault(); onAssistant(assistantName.trim() || "Lu"); }} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          {back}
          <input value={assistantName} onChange={(e) => setAssistantName(e.target.value)} autoFocus className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring" placeholder="Lu" />
          <Button type="submit" size="sm" className="h-9">Continue</Button>
        </div>
        <p className="pl-1 text-xs text-muted-foreground">Most keep it Lu — you can rename anytime.</p>
      </form>
    );

  if (step === "phone")
    return (
      <form onSubmit={(e) => { e.preventDefault(); if (cell.trim()) onPhone(cell.trim()); }} className="flex gap-2">
        {back}
        <input value={cell} onChange={(e) => setCell(e.target.value)} autoFocus inputMode="tel" className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:border-ring" placeholder="Your cell, e.g. (617) 555-0142" />
        <Button type="submit" size="sm" className="h-9" disabled={!cell.trim()}>Continue</Button>
      </form>
    );

  if (step === "hours")
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-1.5">
          {["Weekdays 8–5", "Weekdays 9–7", "Mon–Sat 9–7"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPreset(t)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                ws.hours === t ? "border-foreground/30 bg-muted text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {back}
          <span className="text-xs text-muted-foreground">Fine-tune on the grid →</span>
          <Button size="sm" className="ml-auto h-9" onClick={onContinueHours}>Continue</Button>
        </div>
      </div>
    );

  return null;
}

function LinkInput({ icon: Icon, value, onChange, placeholder }: { icon: React.ComponentType<{ className?: string }>; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background px-3 focus-within:border-ring">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </div>
  );
}

/** A quiet "Lu is thinking" wave — a short row of dots that gently undulate before a
 *  message streams in. Low amplitude, eased, calm; only ever shown in the chat. */
function LuWave() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5 align-middle" aria-label="Lu is thinking">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-muted-foreground/50"
          animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: i * 0.12 }}
        />
      ))}
    </span>
  );
}

/** Streams Lu's text in irregular token-ish bursts — feels like real LLM streaming. */
function Typewriter({ text, stream, onDone, onTick }: { text: string; stream: boolean; onDone: () => void; onTick: () => void }) {
  const [n, setN] = React.useState(stream ? 0 : text.length);
  const [thinking, setThinking] = React.useState(stream); // hold on a quiet wave before the first token
  const doneRef = React.useRef(false);
  React.useEffect(() => {
    if (!stream || !thinking) return;
    const t = setTimeout(() => setThinking(false), 480 + Math.random() * 260);
    return () => clearTimeout(t);
  }, [stream, thinking]);
  React.useEffect(() => {
    if (!stream || thinking) return;
    if (n >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    const chunk = 2 + Math.floor(Math.random() * 4);
    const delay = 24 + Math.random() * 46 + (Math.random() < 0.1 ? 140 : 0);
    const t = setTimeout(() => setN((c) => Math.min(text.length, c + chunk)), delay);
    return () => clearTimeout(t);
  }, [n, stream, text, thinking]); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => onTick(), [n, thinking]); // eslint-disable-line react-hooks/exhaustive-deps
  if (thinking) return <LuWave />;
  return <>{text.slice(0, n)}</>;
}
