"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FAMILY_CHIP } from "@/lib/dashboard-ui";
import type { ClientSiteVersion } from "./WebsiteClient";

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * Version history (03 §2): newest first; Restore re-opens an old version as a
 * NEW draft — history is never mutated.
 */
export function VersionHistorySheet({
  open,
  onOpenChange,
  versions,
  publishedId,
  draftId,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: ClientSiteVersion[];
  publishedId: string;
  draftId?: string;
  onRestore: (id: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>Restore any version — it opens as a new draft, nothing goes live until you publish.</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          <div className="divide-y divide-border/60">
            {versions.map((v) => {
              const isDraft = v.id === draftId;
              const isLive = v.id === publishedId;
              return (
                <div key={v.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      v{v.number}
                      {isDraft && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${FAMILY_CHIP.amber}`}>Draft</span>}
                      {isLive && <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${FAMILY_CHIP.emerald}`}>Live</span>}
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{v.summary}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {v.publishedAt ? `published ${timeAgo(v.publishedAt)}` : `started ${timeAgo(v.createdAt)}`} · by Sarah
                    </p>
                  </div>
                  {!isDraft && !isLive && (
                    <Button size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => onRestore(v.id)}>
                      Restore
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
