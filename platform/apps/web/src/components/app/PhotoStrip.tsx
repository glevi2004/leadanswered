"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Thumbnail row + lightbox (04-content §6; Quotes/Reviews will want it too).
 * Mock photos use the "placeholder:" url scheme → gradient tiles labeled by
 * alt text (no binary assets in fixtures); real URLs render as <img>.
 */

const GRADIENTS = [
  "from-zinc-300 via-zinc-400 to-zinc-500",
  "from-stone-300 via-stone-400 to-zinc-500",
  "from-slate-300 via-zinc-400 to-stone-500",
  "from-zinc-400 via-stone-400 to-slate-500",
];

export interface StripPhoto {
  id: string;
  url: string;
  alt: string;
}

/** Non-interactive tile — for card media where the parent is already a link. */
export function PhotoTile({ photo, index = 0, className }: { photo: StripPhoto; index?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-black/5", className)}>
      <Tile photo={photo} index={index} />
    </div>
  );
}

function Tile({ photo, index, className }: { photo: StripPhoto; index: number; className?: string }) {
  if (!photo.url.startsWith("placeholder:")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo.url} alt={photo.alt} className={cn("h-full w-full object-cover", className)} />;
  }
  return (
    <div
      className={cn(
        "flex h-full w-full items-end bg-gradient-to-br p-2",
        GRADIENTS[index % GRADIENTS.length],
        className,
      )}
    >
      <span className="line-clamp-2 text-[10px] font-medium leading-tight text-white/90 drop-shadow">{photo.alt}</span>
    </div>
  );
}

export function PhotoStrip({
  photos,
  size = "sm",
  className,
}: {
  photos: StripPhoto[];
  /** sm = thumbnail row (cards) · lg = wider strip (detail) */
  size?: "sm" | "lg";
  className?: string;
}) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);
  const open = openIndex !== null ? photos[openIndex] : null;

  return (
    <>
      <div className={cn("flex gap-1.5", className)}>
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={`View photo: ${p.alt}`}
            onClick={() => setOpenIndex(i)}
            className={cn(
              "overflow-hidden rounded-lg border border-black/5 transition-transform hover:scale-[1.02]",
              size === "sm" ? "h-14 w-[74px] shrink-0" : "aspect-[4/3] min-w-0 flex-1",
            )}
          >
            <Tile photo={p} index={i} />
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpenIndex(null)}>
        <DialogContent className="max-w-2xl p-3">
          {open && (
            <>
              <DialogTitle className="sr-only">{open.alt}</DialogTitle>
              <div className="aspect-[4/3] overflow-hidden rounded-lg">
                <Tile photo={open} index={openIndex ?? 0} className="text-sm [&>span]:text-sm" />
              </div>
              <p className="px-1 pb-1 text-sm text-muted-foreground">{open.alt}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
