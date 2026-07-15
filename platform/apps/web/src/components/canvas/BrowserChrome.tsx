import { ChevronLeft, ChevronRight, RotateCw, Maximize2 } from "lucide-react";

/**
 * A macOS-style browser chrome bar (traffic-lights + nav + URL) that tops each site
 * frame on the canvas so a live /embed page reads as a real window (DESIGN-DEPTH ref-76).
 * Sized in world units — tiny at overview, legible when the camera flies into the frame.
 */
export function BrowserChrome({ host, page }: { host: string; page: string }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-black/[0.06] bg-muted/60 px-2.5 dark:border-white/[0.06]">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex items-center gap-1 text-muted-foreground/70">
        <ChevronLeft className="size-3.5" />
        <ChevronRight className="size-3.5" />
        <RotateCw className="size-3" />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-1 truncate rounded-md bg-background/80 px-2 py-1 text-[11px] ring-1 ring-black/[0.04] dark:ring-white/[0.05]">
        <span className="font-medium text-foreground">{page}</span>
        <span className="truncate text-muted-foreground">/ {host}</span>
      </div>
      <Maximize2 className="size-3.5 shrink-0 text-muted-foreground/70" />
    </div>
  );
}
