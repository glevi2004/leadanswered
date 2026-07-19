"use client";

import { Frame, Cap, GalleryHeading, StatusChip, type StatusTone } from "../_ui";
import { PixelLoader } from "@/components/ds/PixelLoader";
import { PixelVoice } from "@/components/ds/PixelVoice";
import { PixelIcon } from "@/components/ds/PixelIcon";

/**
 * App components — team, onboarding &amp; setup (mirrors SecData.tsx exactly:
 * same Frame/Cap scaffolding, same density, same neu/gloss/glass material rules).
 * Reconstructed inline — the real components live in components/team + onboarding
 * + workspace; this board only borrows their look.
 */

type Perm = "yes" | "ask" | "no";
interface MemberRow {
  name: string;
  initials: string;
  role: string;
  label: string;
  tone: StatusTone;
  perms: [Perm, Perm, Perm, Perm]; // Send SMS · Approve quotes · Edit sites · Billing
}

const MEMBERS: MemberRow[] = [
  { name: "Levi Ramos", initials: "LR", role: "Founder", label: "Owner", tone: "emerald", perms: ["yes", "yes", "yes", "yes"] },
  { name: "Nadia Kim", initials: "NK", role: "Ops lead", label: "Admin", tone: "blue", perms: ["yes", "yes", "yes", "ask"] },
  { name: "Marcus Webb", initials: "MW", role: "Engineer", label: "Member", tone: "gray", perms: ["yes", "ask", "no", "no"] },
  { name: "Priya Anand", initials: "PA", role: "Designer", label: "Member", tone: "gray", perms: ["no", "no", "yes", "no"] },
  { name: "Diego Ruiz", initials: "DR", role: "Support", label: "Member", tone: "gray", perms: ["yes", "no", "no", "no"] },
];

const CAPS = ["Send SMS", "Approve quotes", "Edit sites", "Billing"];

/* -------------------------------- tiny icons -------------------------------- */

function CheckMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`animate-spin ${className ?? ""}`} fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------------- roster card -------------------------------- */

function PermDot({ state }: { state: Perm }) {
  return (
    <span
      className={
        state === "yes"
          ? "size-1.5 rounded-full bg-emerald-500"
          : state === "ask"
            ? "size-1.5 rounded-full bg-amber-500"
            : "size-1.5 rounded-full bg-foreground/15"
      }
    />
  );
}

function MemberCard({ m }: { m: MemberRow }) {
  return (
    <div className="neu-card hover-lift flex flex-col gap-3 rounded-2xl bg-card p-4 transition">
      <div className="flex items-center gap-3">
        <span className="neu-chip grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-foreground">
          {m.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="t-title truncate text-foreground">{m.name}</p>
          <p className="truncate text-[12px] text-muted-foreground">{m.role}</p>
        </div>
        <StatusChip tone={m.tone}>{m.label}</StatusChip>
      </div>
      <div className="flex items-center gap-1.5">
        {m.perms.map((p, i) => (
          <PermDot key={CAPS[i]} state={p} />
        ))}
        <span className="t-caption ml-1">access</span>
      </div>
    </div>
  );
}

/* -------------------------------- org graph -------------------------------- */

const GRAPH_X = [14, 38, 62, 86];

function GraphPerson({ m, x }: { m: MemberRow; x: number }) {
  return (
    <div className="absolute top-[64%] flex -translate-x-1/2 flex-col items-center gap-1.5" style={{ left: `${x}%` }}>
      <span className="neu-raise grid size-12 place-items-center rounded-full text-[12px] font-semibold text-foreground">
        {m.initials}
      </span>
      <span className="t-label text-foreground">{m.name.split(" ")[0]}</span>
      <span className="t-caption">{m.role}</span>
    </div>
  );
}

function OrgGraph() {
  const people = MEMBERS.slice(0, 4);
  return (
    <div className="canvas-dots neu-inset relative h-72 overflow-hidden rounded-2xl bg-background/40">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-border" aria-hidden>
        <path
          d="M50,30 L50,48 M50,48 L14,48 L14,62 M50,48 L38,48 L38,62 M50,48 L62,48 L62,62 M50,48 L86,48 L86,62"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Lu — the orchestrator */}
      <div className="absolute left-1/2 top-[9%] -translate-x-1/2">
        <div className="neu-socket rounded-2xl p-1.5">
          <div className="neu-raise flex flex-col items-center gap-1 rounded-xl px-6 py-3.5">
            <span className="t-title text-foreground">Lu</span>
            <span className="t-caption">orchestrator</span>
          </div>
        </div>
      </div>

      {people.map((m, i) => (
        <GraphPerson key={m.name} m={m} x={GRAPH_X[i]} />
      ))}
    </div>
  );
}

/* -------------------------------- permissions matrix -------------------------------- */

function PermCell({ state }: { state: Perm }) {
  if (state === "yes") return <CheckMark className="size-4 text-emerald-600 dark:text-emerald-400" />;
  if (state === "ask") return <StatusChip tone="amber">ask first</StatusChip>;
  return <span className="text-muted-foreground/40">—</span>;
}

function PermissionsMatrix() {
  return (
    <div className="neu-card overflow-hidden rounded-2xl bg-card">
      <div className="grid grid-cols-[1.5fr_repeat(4,1fr)] items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="t-caption">Teammate</span>
        {CAPS.map((c) => (
          <span key={c} className="t-caption text-center">
            {c}
          </span>
        ))}
      </div>
      {MEMBERS.map((m) => (
        <div
          key={m.name}
          className="grid grid-cols-[1.5fr_repeat(4,1fr)] items-center gap-2 border-b border-border/50 px-4 py-2.5 text-[13px] last:border-0 hover:bg-muted/40"
        >
          <span className="truncate font-medium text-foreground">{m.name}</span>
          {m.perms.map((p, i) => (
            <span key={CAPS[i]} className="flex justify-center">
              <PermCell state={p} />
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- onboarding / app setup -------------------------------- */

type StepState = "done" | "active" | "upcoming";
const SETUP_STEPS: { label: string; state: StepState }[] = [
  { label: "Company profile", state: "done" },
  { label: "Team graph", state: "done" },
  { label: "Engineering — provisioning sandbox", state: "active" },
  { label: "Design — waiting", state: "upcoming" },
  { label: "Finance — waiting", state: "upcoming" },
];

function StepRow({ label, state }: { label: string; state: StepState }) {
  if (state === "done") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-[13px]">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
          <CheckMark className="size-3" />
        </span>
        <span className="text-foreground">{label}</span>
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="neu-card-active flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px]">
        <span className="grid size-5 shrink-0 place-items-center rounded-full text-foreground">
          <Spinner className="size-3.5" />
        </span>
        <span className="font-medium text-foreground">{label}</span>
      </div>
    );
  }
  return (
    <div className="neu-card-in flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-muted-foreground">
      <span className="size-5 shrink-0 rounded-full border border-border/60" />
      <span>{label}</span>
    </div>
  );
}

function AppSetup() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      {/* left — the Lu conversation */}
      <div className="neu-card flex flex-col gap-3 rounded-2xl bg-card p-4">
        <div className="flex items-center gap-2">
          <span className="neu-chip grid size-7 shrink-0 place-items-center rounded-full">
            <PixelIcon glyph="sparkle" color="violet" size={14} />
          </span>
          <span className="t-title text-foreground">Lu</span>
          <PixelVoice cols={12} rows={5} state="speaking" className="ml-1 h-5" />
          <span className="t-caption ml-auto">setting up</span>
        </div>
        <div className="flex flex-col gap-2 text-[13px]">
          <div className="msg msg-them max-w-[85%]">Tell me about Northstar Design and I&rsquo;ll set up your workspace.</div>
          <div className="msg msg-me ml-auto max-w-[85%]">We&rsquo;re a 6-person design studio in Austin.</div>
          <div className="msg msg-them max-w-[85%]">Got it — booting Engineering, Design, and Finance now. Give me a minute.</div>
        </div>
      </div>

      {/* right — live preview: booting field + checklist */}
      <div className="neu-card flex flex-col gap-4 rounded-2xl bg-card p-5">
        <div>
          <div className="t-caption mb-2">booting up your company</div>
          <div className="neu-inset overflow-hidden rounded-xl bg-background/40 p-3">
            <PixelLoader rows={4} cols={26} />
          </div>
          <p className="t-caption mt-2">Setting up Engineering · Design · Finance…</p>
        </div>
        <div className="flex flex-col gap-2">
          {SETUP_STEPS.map((s) => (
            <StepRow key={s.label} label={s.label} state={s.state} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------- */

export default function SecTeam() {
  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="TeamRoster · TeamGraph · PermissionsMatrix · AppSetup">
        App components — team, onboarding &amp; setup
      </GalleryHeading>

      <Frame title="Team roster" tag="neu-card grid · neu-chip avatar · permission dots">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MEMBERS.map((m) => (
            <MemberCard key={m.name} m={m} />
          ))}
        </div>
      </Frame>

      <Frame title="Org graph — Lu orchestrating the team" tag="canvas-dots · neu-socket/neu-raise · svg connectors">
        <OrgGraph />
        <Cap>Lu sits above the graph — every teammate reports through her</Cap>
      </Frame>

      <Frame title="Permissions matrix" tag="editorial table · hairline rows · check / dash / ask-first chip">
        <PermissionsMatrix />
      </Frame>

      <Frame title="Onboarding — booting up your company" tag="PixelLoader field · raised/recessed checklist · two-panel AppSetup">
        <AppSetup />
      </Frame>
    </div>
  );
}
