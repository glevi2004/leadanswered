"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  History,
  Loader2,
  Monitor,
  MoreHorizontal,
  RotateCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { SitePage } from "@/lib/data/website/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FAMILY_CHIP } from "@/lib/dashboard-ui";
import { cn } from "@/lib/utils";

export type BuilderMode = "site" | "performance";

/**
 * The builder's one row of chrome (03 §2): ← back · domain · history · mode
 * pills · preview controls (Site mode) · draft chip · ⋯ · Publish top-right.
 * Publish is a two-step popover (Lovable's flow): confirm the URL → publishing
 * → "Your site is live!" with view/copy.
 */
export function BuilderTopBar({
  domain,
  mode,
  onModeChange,
  pages,
  activePath,
  onPathChange,
  device,
  onDeviceChange,
  onRefresh,
  previewHref,
  liveHref,
  draftOpen,
  versionNumber,
  draftSummary,
  onPublish,
  onHistory,
  onDiscard,
}: {
  domain: string;
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  pages: SitePage[];
  activePath: string;
  onPathChange: (path: string) => void;
  device: "desktop" | "phone";
  onDeviceChange: (device: "desktop" | "phone") => void;
  onRefresh: () => void;
  previewHref: string;
  liveHref: string;
  draftOpen: boolean;
  versionNumber: number;
  draftSummary?: string;
  onPublish: () => void;
  onHistory: () => void;
  onDiscard: () => void;
}) {
  const activePage = pages.find((p) => p.path === activePath) ?? pages[0];

  // Publish popover flow: confirm → publishing → live. The button stays
  // mounted while the flow is open even after the draft clears on publish.
  const [pubOpen, setPubOpen] = React.useState(false);
  const [pubState, setPubState] = React.useState<"confirm" | "publishing" | "live">("confirm");
  const [publishedNumber, setPublishedNumber] = React.useState(versionNumber);

  const startPublish = () => {
    setPublishedNumber(versionNumber);
    setPubState("publishing");
    window.setTimeout(() => {
      onPublish();
      setPubState("live");
    }, 900);
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(`${window.location.origin}${liveHref}`);
    toast.success("Link copied.");
  };

  const iconButton =
    "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <header className="flex h-11 shrink-0 items-center gap-1.5 px-2">
      <Link href="/home" aria-label="Back to the app" className={iconButton}>
        <ArrowLeft className="size-4" />
      </Link>
      <span className="hidden truncate text-sm font-medium sm:inline">{domain}</span>
      <button type="button" aria-label="Version history" title="Version history" onClick={onHistory} className={iconButton}>
        <History className="size-4" />
      </button>

      {/* mode pills (Lovable's Preview/Code group) */}
      <div className="ml-0.5 flex shrink-0 items-center rounded-full bg-muted p-0.5 text-xs font-medium">
        {(["site", "performance"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m === "site" ? "Site" : "Performance"}
          </button>
        ))}
      </div>

      {/* centered preview controls — Site mode only */}
      <div className="mx-auto flex min-w-0 items-center gap-0.5">
        {mode === "site" && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-1 text-xs font-medium" />}>
                {activePage.title} ▾
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {pages.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => onPathChange(p.path)}>
                    {p.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="hidden items-center rounded-md border p-0.5 md:flex">
              {(
                [
                  ["desktop", Monitor],
                  ["phone", Smartphone],
                ] as const
              ).map(([kind, Icon]) => (
                <button
                  key={kind}
                  type="button"
                  aria-label={`${kind} width`}
                  onClick={() => onDeviceChange(kind)}
                  className={cn(
                    "rounded p-1 text-muted-foreground transition-colors hover:text-foreground",
                    device === kind && "bg-muted text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                </button>
              ))}
            </div>

            <button type="button" aria-label="Refresh preview" onClick={onRefresh} className={cn(iconButton, "hidden sm:block")}>
              <RotateCw className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Open preview in a new tab"
              onClick={() => window.open(previewHref, "_blank", "noopener")}
              className={cn(iconButton, "hidden sm:block")}
            >
              <ExternalLink className="size-3.5" />
            </button>
          </>
        )}
      </div>

      {/* right cluster: state · ⋯ · Publish (the loudest button on the screen) */}
      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium md:inline",
          draftOpen ? FAMILY_CHIP.amber : FAMILY_CHIP.emerald,
        )}
      >
        {draftOpen ? `Draft v${versionNumber} — not published` : `Live · v${versionNumber}`}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="More" className="px-1.5" />}>
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onHistory}>
            <History className="size-3.5" /> Version history
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(liveHref, "_blank", "noopener")}>
            <ExternalLink className="size-3.5" /> View live site
          </DropdownMenuItem>
          {draftOpen && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onDiscard}>
                <Trash2 className="size-3.5" /> Discard draft
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {(draftOpen || pubOpen) && (
        <Popover
          open={pubOpen}
          onOpenChange={(open) => {
            setPubOpen(open);
            if (!open) setPubState("confirm");
          }}
        >
          <PopoverTrigger render={<Button size="sm" className="shrink-0 text-xs" />}>Publish</PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-4">
            {pubState === "confirm" && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold">Publish</p>
                  {draftSummary && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      v{versionNumber} — {draftSummary}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Your website URL</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                    <span className="truncate text-sm font-medium">{domain}</span>
                    <button
                      type="button"
                      aria-label="Preview before publishing"
                      onClick={() => window.open(previewHref, "_blank", "noopener")}
                      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-3.5" />
                    </button>
                  </div>
                </div>
                <Button size="sm" className="w-full" onClick={startPublish}>
                  Publish
                </Button>
              </div>
            )}

            {pubState === "publishing" && (
              <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                Publishing v{publishedNumber}…
              </div>
            )}

            {pubState === "live" && (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-emerald-500/15">
                  <Check className="size-5 text-emerald-600 dark:text-emerald-400" />
                </span>
                <div>
                  <p className="text-sm font-semibold">Your site is live!</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">v{publishedNumber} is on the internet.</p>
                </div>
                <div className="flex w-full items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <span className="truncate text-sm font-medium">{domain}</span>
                  <button
                    type="button"
                    aria-label="Copy link"
                    onClick={copyLink}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
                <div className="flex w-full gap-2">
                  <Button size="sm" className="flex-1" onClick={() => window.open(liveHref, "_blank", "noopener")}>
                    View site <ExternalLink className="size-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={copyLink}>
                    Copy link
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </header>
  );
}
