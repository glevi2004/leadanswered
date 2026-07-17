import { Frame, Cap, GalleryHeading } from "../_ui";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Foundations v2 — the token scales + shared states added in the design pass
 * (DESIGN-COMPONENTS-PLAN §0). Demoed so components stop hand-rolling sizes.
 */
export default function SecFoundation() {
  const type: [string, string, string][] = [
    ["t-display", "Good afternoon", "2.5rem / 700"],
    ["t-h1", "Customers", "1.75rem / 600"],
    ["t-h2", "Recent activity", "1.25rem / 600"],
    ["t-title", "Card title", "0.95rem / 600"],
    ["t-body", "Body copy — clean geometric sans, editorial measure.", "0.9rem / 400"],
    ["t-label", "Field label", "0.8rem / 500"],
    ["t-caption", "MONO CAPTION · 10,291", "mono / uppercase"],
  ];
  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="type ramp · motion · states">Foundations — states &amp; scales</GalleryHeading>

      <div className="grid gap-8 md:grid-cols-2">
        <Frame title="Type ramp" tag="one scale · all-sans + mono caption">
          <div className="flex flex-col gap-3">
            {type.map(([cls, sample, meta]) => (
              <div key={cls} className="flex items-baseline justify-between gap-4 border-b border-border/50 pb-2.5 last:border-0">
                <span className={cls}>{sample}</span>
                <span className="shrink-0 text-right font-mono text-[10px] text-muted-foreground">
                  <span className="text-foreground/70">.{cls}</span> · {meta}
                </span>
              </div>
            ))}
            <div className="t-num text-2xl font-semibold">1,234.56</div>
            <Cap>.t-num — tabular mono numerals</Cap>
          </div>
        </Frame>

        <Frame title="States & motion" tag="hover-lift · press · focus · shimmer">
          <Cap>hover-lift — cards rise on hover (try it)</Cap>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="neu-card hover-lift grid h-16 place-items-center rounded-xl bg-card text-[12px] text-muted-foreground">hover me</div>
            <div className="neu-card grid h-16 place-items-center rounded-xl bg-card text-[12px] text-muted-foreground">resting</div>
          </div>

          <Cap>press — tactile depress on :active</Cap>
          <div className="mt-2 flex flex-wrap gap-3">
            <button className="gloss press rounded-lg px-3.5 py-1.5 text-[13px] font-medium">Press me</button>
            <button className="gloss-ink press rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-white">Ink press</button>
          </div>

          <Cap>focus ring — one #5b9bff ring, any surface (Tab to it)</Cap>
          <div className="mt-2 flex flex-wrap gap-3">
            <input placeholder="focus me" className="neu-socket focus-ring h-8 rounded-lg border border-input bg-transparent px-2.5 text-[13px] outline-none placeholder:text-muted-foreground" />
            <button className="focus-ring gloss rounded-lg px-3.5 py-1.5 text-[13px] font-medium">Focusable</button>
          </div>

          <Cap>shimmer — the loading skeleton, system grayscale</Cap>
          <div className="mt-2 flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-2/3 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        </Frame>
      </div>
    </div>
  );
}
