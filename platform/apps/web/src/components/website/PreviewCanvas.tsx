"use client";

import { PhoneFrame } from "@/components/app/PhoneFrame";
import { cn } from "@/lib/utils";

/**
 * The floating preview canvas (03 §2): a rounded, elevated surface on the
 * shell background holding the site iframe. Phone view renders inside the
 * shared PhoneFrame device mockup — never just a narrowed pane.
 */
export function PreviewCanvas({
  src,
  domain,
  device,
  busy,
}: {
  src: string;
  domain: string;
  device: "desktop" | "phone";
  busy: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-full overflow-hidden rounded-2xl border shadow-[0_8px_32px_rgba(16,24,40,0.12)]",
        device === "phone" ? "bg-muted/60" : "bg-white",
      )}
    >
      {device === "phone" ? (
        <div className="flex h-full items-center justify-center p-3">
          <PhoneFrame className="h-full max-h-[960px]" screenClassName="overflow-hidden">
            <iframe key={src} src={src} title={`Preview of ${domain}`} className="h-full w-full" />
          </PhoneFrame>
        </div>
      ) : (
        <iframe key={src} src={src} title={`Preview of ${domain}`} className="h-full w-full bg-white" />
      )}
      {busy && <div className="pointer-events-none absolute inset-0 animate-pulse bg-foreground/5" aria-hidden />}
    </div>
  );
}
