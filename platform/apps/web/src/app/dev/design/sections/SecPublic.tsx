"use client";

import { Frame, Cap, GalleryHeading, StatusChip } from "../_ui";
import { PixelIcon } from "@/components/ds/PixelIcon";
import { CalendarMonth, type CalendarMonthItem } from "@/components/app/CalendarMonth";

/**
 * App-components gallery — customer-facing surfaces (things a Lu customer sees):
 * the branded no-auth doc, Lu-authored prose, the REAL shared CalendarMonth, and
 * reviews/media (StarRating, PhoneFrame, PhotoStrip).
 */

/* ---- inline star glyph (StarRating twin) — amber, gradient fill for halves ---- */
function StarGlyph({ fill, id }: { fill: number; id: string }) {
  return (
    <svg viewBox="0 0 20 20" width={14} height={14} className="shrink-0" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${fill * 100}%`} stopColor="#f59e0b" />
          <stop offset={`${fill * 100}%`} stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d="M10 1.2 12.5 7l6.3.5-4.8 4 1.5 6.1L10 14.4l-5.5 3.2 1.5-6.1-4.8-4L7.5 7Z" fill={`url(#${id})`} stroke="#f59e0b" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}
function Stars({ rating, id }: { rating: number; id: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => <StarGlyph key={i} id={`${id}-${i}`} fill={Math.max(0, Math.min(1, rating - i))} />)}
    </span>
  );
}

const PHOTOS: Array<{ label: string; color: "blue" | "green" | "amber" | "violet" }> = [
  { label: "Before — clogged gutter", color: "blue" },
  { label: "After — cleared & flushed", color: "green" },
  { label: "Downspout repair (rear)", color: "amber" },
  { label: "Crew on site", color: "violet" },
];

/* Real CalendarMonth items — dated relative to today so they always land on-screen. */
function calItems(): CalendarMonthItem[] {
  const n = new Date();
  const at = (off: number, h: number, m: number) => new Date(n.getFullYear(), n.getMonth(), n.getDate() + off, h, m).toISOString();
  return [
    { id: "1", at: at(0, 9, 0), label: "Gutter inspection — Lucas Anderson", dot: "bg-emerald-500" },
    { id: "2", at: at(1, 13, 30), label: "Fence estimate — Ava Martinez", dot: "bg-amber-500" },
    { id: "3", at: at(2, 15, 15), label: "Follow-up call — Noah Garcia", dot: "bg-sky-500" },
    { id: "4", at: at(5, 10, 0), label: "Crew — Birchwood Ln", dot: "bg-violet-500" },
    { id: "5", at: at(-2, 11, 0), label: "Roof estimate — Priya Shah", dot: "bg-violet-500" },
  ];
}

export default function SecPublic() {
  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="PublicDocLayout · MarkdownView · CalendarMonth · StarRating · PhoneFrame">App components — customer-facing &amp; media</GalleryHeading>

      <Frame title="Public doc (customer-facing)" tag="PublicDocLayout — org-branded, no app chrome">
        <div className="mx-auto max-w-md">
          <div className="elev-3 rounded-[20px] bg-card p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div>
                <div className="t-title text-foreground">Riverside Home Services</div>
                <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">Sent by Lu · Jul 14, 2026</div>
              </div>
              <span className="neu-chip grid size-10 shrink-0 place-items-center rounded-xl">
                <PixelIcon glyph="file" color="blue" size={20} />
              </span>
            </div>
            <div className="t-label text-foreground">Quote #Q-1042</div>
            <div className="mt-0.5 t-caption text-muted-foreground">Prepared for Lucas Anderson · 214 Birchwood Ln</div>
            <div className="mt-3 overflow-hidden rounded-lg border border-border/60">
              <div className="grid grid-cols-[1fr_0.3fr_0.45fr] gap-2 border-b border-border/60 bg-muted/40 px-3 py-2 t-caption">
                <span>Description</span><span className="text-right">Qty</span><span className="text-right">Amount</span>
              </div>
              {[["Gutter cleaning — full perimeter", "1", "$220.00"], ["Downspout repair (rear)", "1", "$140.00"], ["Debris haul-away", "1", "$60.00"]].map(([d, q, a]) => (
                <div key={d} className="grid grid-cols-[1fr_0.3fr_0.45fr] gap-2 border-b border-border/40 px-3 py-2.5 text-[13px] last:border-0">
                  <span className="text-foreground">{d}</span>
                  <span className="text-right font-mono tabular-nums text-muted-foreground">{q}</span>
                  <span className="text-right font-mono tabular-nums text-foreground">{a}</span>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_0.3fr_0.45fr] gap-2 bg-muted/30 px-3 py-2.5 text-[13px] font-semibold">
                <span className="col-span-2 text-foreground">Total due</span>
                <span className="text-right font-mono tabular-nums text-foreground">$420.00</span>
              </div>
            </div>
            <p className="mt-4 t-body text-muted-foreground">Approve this quote by replying &ldquo;YES&rdquo; to this text, or pay online below.</p>
            <button type="button" className="btn-glow press mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold">View &amp; pay online</button>
          </div>
          <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Sent by Lu · lu.computer</p>
        </div>
      </Frame>

      <Frame title="Markdown / prose" tag="MarkdownView — headings · lists · inline &amp; block code · quote">
        <div className="neu-card mx-auto max-w-lg rounded-2xl bg-card p-6">
          <h2 className="t-h2 text-foreground">Gutter maintenance, twice a year</h2>
          <p className="mt-3 t-body text-muted-foreground">
            Most clog-related repairs Lu sees start the same way: <strong className="font-semibold text-foreground">debris left through one wet season.</strong> A short spring-and-fall cadence heads off the expensive downspout jobs entirely.
          </p>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 t-body text-muted-foreground">
            <li>Inspect every downspout for standing water</li>
            <li>Clear leaf guards before the first frost</li>
            <li>Flag any fascia soft-spots for the crew</li>
          </ul>
          <p className="mt-3 t-body text-muted-foreground">
            Run the check with <code className="neu-socket rounded-md px-1.5 py-0.5 font-mono text-[12.5px] text-foreground">lu inspect --gutters</code> from the field app.
          </p>
          <pre className="neu-socket mt-3 overflow-x-auto rounded-xl p-3 font-mono text-[12px] leading-relaxed text-foreground"><code>{`schedule.rule   = "biannual"\nschedule.months = [4, 10]`}</code></pre>
          <blockquote className="mt-3 border-l-2 border-border pl-3 t-body italic text-muted-foreground">
            &ldquo;Book us for the fall cleaning and we&rsquo;ll waive the inspection fee.&rdquo; — quoted in the customer&rsquo;s confirmation text.
          </blockquote>
        </div>
      </Frame>

      <Frame title="Calendar month + booking" tag="CalendarMonth — the REAL shared month grid, reused · interactive (‹ › Today)">
        <CalendarMonth items={calItems()} timezone="America/Chicago" />
        <Cap>upcoming bookings</Cap>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[["9:00 AM", "Gutter inspection — Lucas", "emerald", "confirmed"], ["1:30 PM", "Fence estimate — Ava", "amber", "pending"], ["3:15 PM", "Follow-up — Noah", "blue", "in flight"]].map(([time, title, tone, label]) => (
            <div key={title} className="neu-card-in flex items-center gap-2.5 rounded-xl bg-card px-3 py-2.5">
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">{time}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">{title}</span>
              <StatusChip tone={tone as "emerald" | "amber" | "blue"}>{label}</StatusChip>
            </div>
          ))}
        </div>
      </Frame>

      <Frame title="Reviews + media" tag="StarRating · PhoneFrame · PhotoStrip">
        <div className="flex items-center gap-2">
          <Stars rating={4.5} id="agg" />
          <span className="font-mono text-sm font-semibold text-foreground">4.5</span>
          <span className="t-caption text-muted-foreground">· 128 reviews</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="neu-card rounded-2xl bg-card p-4">
            <Stars rating={5} id="rev1" />
            <p className="mt-2 t-body text-foreground">&ldquo;Lu had our quote in my inbox before I&rsquo;d even hung up the phone. Fastest reply I&rsquo;ve ever gotten.&rdquo;</p>
            <div className="mt-2 font-mono text-[11px] text-muted-foreground">Priya Shah · Jul 12, 2026</div>
          </div>
          <div className="neu-card rounded-2xl bg-card p-4">
            <Stars rating={4} id="rev2" />
            <p className="mt-2 t-body text-foreground">&ldquo;Booked the estimate over text in under a minute. Crew showed up right on time.&rdquo;</p>
            <div className="mt-2 font-mono text-[11px] text-muted-foreground">Marcus Webb · Jul 8, 2026</div>
          </div>
        </div>
        <Cap>PhoneFrame — a customer SMS thread (real texts stay iMessage) · PhotoStrip — media well</Cap>
        <div className="mt-3 flex flex-wrap items-start gap-6">
          <div className="elev-3 w-[210px] shrink-0 rounded-[34px] bg-zinc-900 p-2">
            <div className="flex h-[400px] flex-col overflow-hidden rounded-[26px] bg-white">
              <div className="flex shrink-0 items-center justify-between px-4 py-2">
                <span className="text-[11px] font-semibold text-zinc-900">9:41</span>
                <span className="text-[9px] font-bold text-zinc-900">5G</span>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-2.5 py-1.5 [--bubble-surface:#fff]">
                <div className="flex justify-start"><div className="msg msg-them">Hi! Any openings this week for a gutter cleaning?</div></div>
                <div className="flex justify-end"><div className="msg msg-me">Yes — Thursday 2pm works. I&rsquo;ll send a confirmation text.</div></div>
                <div className="flex justify-start"><div className="msg msg-them">Perfect, see you then!</div></div>
              </div>
            </div>
          </div>
          <div className="min-w-[220px] flex-1">
            <div className="t-caption mb-2 text-muted-foreground">Job photos</div>
            <div className="neu-inset flex gap-2 rounded-xl p-2">
              {PHOTOS.map((p) => (
                <div key={p.label} className="flex h-16 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg bg-muted p-1">
                  <PixelIcon glyph="file" color={p.color} size={20} />
                  <span className="line-clamp-2 text-center text-[9px] leading-tight text-muted-foreground">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}
