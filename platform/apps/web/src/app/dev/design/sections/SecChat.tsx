"use client";

import { useState, useRef, useEffect } from "react";
import { Frame, Cap, GalleryHeading, StatusChip, KindChip } from "../_ui";
import { PixelVoice } from "@/components/ds/PixelVoice";
import { cn } from "@/lib/utils";

/** Lu's mark — a small pixel-glyph badge (NOT the big neu circle). Used once per Lu turn. */
function LuMark({ className }: { className?: string }) {
  return (
    <span className={cn("gloss-ink grid size-6 shrink-0 place-items-center rounded-md text-[10px] font-semibold text-white", className)}>Lu</span>
  );
}

type Msg = { role: "lu" | "you"; body: string };
const SEED: Msg[] = [
  { role: "lu", body: "Morning — 3 open quotes from last month never got a reply. Want me to follow up with Lucas Anderson first? His $2,400 gutter job is the biggest." },
  { role: "you", body: "Yes, follow up with Lucas. Keep it friendly." },
  { role: "lu", body: "Done — sent Lucas a friendly nudge referencing the loading-dock notes. I'll ping you the moment he replies, and chase Emily and Noah tomorrow if they're quiet." },
];
function cannedReply(t: string): string {
  const s = t.toLowerCase();
  if (s.includes("invoice") || s.includes("pay")) return "On it — I'll draft the invoice and bring it back for your approval before anything sends.";
  if (s.includes("website") || s.includes("site") || s.includes("page")) return "Got it. I'll spin up Engineering to build that and drop a preview here when the first pass is ready.";
  if (s.includes("?")) return "Good question — here's what I'd do, then you can tell me to run with it or adjust.";
  return "On it. I'll take the first pass and surface anything that needs your call.";
}

/* Claude / cowork-style thread — role-labeled message blocks, no SMS bubbles. */
function ChatThread() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length, typing]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function send() {
    const t = draft.trim();
    if (!t) return;
    setMsgs((m) => [...m, { role: "you", body: t }]);
    setDraft("");
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { role: "lu", body: cannedReply(t) }]);
    }, 850);
  }

  return (
    <div className="neu-card flex h-[440px] flex-col overflow-hidden rounded-2xl bg-card">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex gap-3 px-4 py-3.5", m.role === "you" && "bg-muted/40")}>
            {m.role === "lu" ? <LuMark /> : (
              <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">GL</span>
            )}
            <div className="min-w-0">
              <div className="mb-0.5 text-[11px] font-semibold text-muted-foreground">{m.role === "lu" ? "Lu" : "You"}</div>
              <div className="t-body text-[13.5px] text-foreground">{m.body}</div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-3 px-4 py-3.5">
            <LuMark />
            <div className="flex items-center gap-1 pt-1" aria-label="Lu is typing">
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {/* composer — interactive */}
      <div className="shrink-0 border-t border-border/60 p-2.5">
        <div className="neu-socket flex items-end gap-2 rounded-2xl px-2.5 py-2">
          <button aria-label="Attach" className="gloss press mb-0.5 grid size-7 shrink-0 place-items-center rounded-full text-foreground/70">
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
          </button>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="Ask Lu anything about your company…"
            className="max-h-24 min-h-6 flex-1 resize-none bg-transparent py-1 text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button onClick={send} aria-label="Send" disabled={!draft.trim()} className="gloss-ink press mb-0.5 grid size-7 shrink-0 place-items-center rounded-full disabled:opacity-40">
            <svg viewBox="0 0 16 16" className="size-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12.5V3.5M4 7l4-4 4 4" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* LuActionRow twin — interactive approve/edit. */
function ActionRow({ kind, desc }: { kind: string; desc: string }) {
  const [state, setState] = useState<"open" | "approved" | "dismissed">("open");
  return (
    <div className={cn("neu-card-in flex items-center gap-3 rounded-xl px-3.5 py-3 transition", state !== "open" && "opacity-70")}>
      <KindChip kind={kind} />
      <p className="min-w-0 flex-1 truncate text-[13px] text-foreground">{desc}</p>
      {state === "approved" ? (
        <StatusChip tone="emerald" className="shrink-0">Approved</StatusChip>
      ) : state === "dismissed" ? (
        <StatusChip tone="gray" className="shrink-0">Dismissed</StatusChip>
      ) : (
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={() => setState("dismissed")} className="gloss press rounded-full px-3 py-1 text-[12px] font-medium text-foreground">Edit</button>
          <button onClick={() => setState("approved")} className="gloss-ink press rounded-full px-3 py-1 text-[12px] font-medium text-white">Approve</button>
        </div>
      )}
    </div>
  );
}

export default function SecChat() {
  const [voice, setVoice] = useState<"idle" | "listening" | "speaking">("speaking");
  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="LuThread · LuComposer · PixelVoice · LuActionRow">App components — Lu chat surface</GalleryHeading>

      <Frame title="Lu chat — thread + composer" tag="Claude / cowork style · role blocks (no SMS bubbles) · type &amp; send, Lu replies">
        <div className="mx-auto max-w-xl">
          <ChatThread />
        </div>
        <Cap>interactive — type a message and press Enter; Lu replies</Cap>
      </Frame>

      <Frame title="Lu voice" tag="PixelVoice equalizer · click to change state (no redundant avatar)">
        <div className="flex flex-wrap items-center gap-3">
          {(["idle", "listening", "speaking"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setVoice(s)}
              className={cn("press rounded-xl px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide transition", s === voice ? "gloss text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-4 neu-card-in flex items-center gap-4 rounded-2xl bg-card px-5 py-6">
          <LuMark className="size-8 rounded-lg text-xs" />
          <PixelVoice state={voice} cols={32} rows={7} />
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            {voice === "speaking" ? "Lu is speaking" : voice === "listening" ? "Lu is listening" : "Lu is ready"}
          </span>
        </div>
      </Frame>

      <Frame title="Lu action row" tag="neu-card-in · kind chip · interactive Approve / Edit">
        <div className="flex flex-col gap-2.5">
          <ActionRow kind="quote" desc="Send quote to Lucas Anderson — $2,400" />
          <ActionRow kind="invoice" desc="Send overdue reminder to Emily Rodriguez — $1,180" />
          <ActionRow kind="message" desc="Reply to Noah Garcia — confirm Thursday 2pm on-site visit" />
        </div>
        <Cap>interactive — approve or edit each proposed action</Cap>
      </Frame>
    </div>
  );
}
