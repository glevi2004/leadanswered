"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Site, SitePresetId } from "@/lib/data/website/types";
import { SITE_PRESETS, presetLabel } from "@/lib/data/website/presets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/app/EmptyState";
import { cn } from "@/lib/utils";
import { createSiteAction, deleteSiteAction } from "./actions";

/**
 * The Sites browse surface (client): the org's sites as cards + a "New site"
 * flow that opens the preset picker, creates on the mock seam, and drops you
 * into that site's builder. Publish/domain are modeled state, never real DNS.
 */
export function SitesBrowser({ sites }: { sites: Site[] }) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [creatingPreset, setCreatingPreset] = React.useState<SitePresetId | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const create = (presetId: SitePresetId) => {
    setCreatingPreset(presetId);
    startTransition(async () => {
      try {
        const { siteId } = await createSiteAction(presetId);
        setPickerOpen(false);
        router.push(`/sites/${siteId}`);
      } catch {
        toast.error("Couldn't create that site — try again.");
        setCreatingPreset(null);
      }
    });
  };

  const remove = (site: Site) => {
    setDeletingId(site.id);
    startTransition(async () => {
      const { ok } = await deleteSiteAction(site.id);
      if (ok) toast(`Deleted “${site.name ?? site.domain}”.`);
      else toast.error("Couldn't delete that site.");
      setDeletingId(null);
      router.refresh();
    });
  };

  return (
    <>
      {sites.length === 0 ? (
        <div className="flex flex-col gap-4">
          <EmptyState
            title="No sites yet"
            body="Spin up a marketing page, a booking site, a blog, or a client portal — then shape it just by texting your assistant."
          />
          <div>
            <Button onClick={() => setPickerOpen(true)} className="gap-1.5">
              <Plus className="size-4" /> New site
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} onDelete={remove} deleting={deletingId === site.id && pending} />
          ))}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex min-h-[8.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/40 hover:text-foreground"
          >
            <Plus className="size-5" />
            New site
          </button>
        </div>
      )}

      <PresetPicker
        open={pickerOpen}
        onOpenChange={(o) => !pending && setPickerOpen(o)}
        onPick={create}
        pending={pending}
        creatingPreset={creatingPreset}
      />
    </>
  );
}

function SiteCard({ site, onDelete, deleting }: { site: Site; onDelete: (s: Site) => void; deleting: boolean }) {
  const live = site.published ?? site.status === "live";
  const domain = site.customDomain ?? site.domain;
  return (
    <Card size="sm" className="justify-between">
      <CardHeader>
        <CardTitle>{site.name ?? site.domain}</CardTitle>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{presetLabel(site.preset)}</Badge>
          <Badge variant={live ? "secondary" : "outline"} className={cn(!live && "text-muted-foreground")}>
            {live ? "Published" : "Draft"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground">{domain}</CardContent>
      <CardFooter className="justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" nativeButton={false} render={<Link href={`/sites/${site.id}`} />}>
            Open builder
          </Button>
          <Button
            size="sm"
            variant="outline"
            render={<a href={site.previewUrl} target="_blank" rel="noreferrer" />}
          >
            Preview <ExternalLink className="size-3.5" />
          </Button>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`Delete ${site.name ?? site.domain}`}
          disabled={deleting}
          onClick={() => onDelete(site)}
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </CardFooter>
    </Card>
  );
}

function PresetPicker({
  open,
  onOpenChange,
  onPick,
  pending,
  creatingPreset,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (presetId: SitePresetId) => void;
  pending: boolean;
  creatingPreset: SitePresetId | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a new site</DialogTitle>
          <DialogDescription>Pick a starter — you can shape everything by texting your assistant.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {SITE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const busy = pending && creatingPreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={pending}
                onClick={() => onPick(preset.id)}
                className="flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors hover:border-foreground/30 hover:bg-muted/40 disabled:opacity-60"
              >
                <span className="flex items-center gap-2 font-medium">
                  {busy ? <Loader2 className="size-4 animate-spin text-primary" /> : <Icon className="size-4 text-primary" />}
                  {preset.label}
                </span>
                <span className="text-xs text-muted-foreground">{preset.blurb}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
