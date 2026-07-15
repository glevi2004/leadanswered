"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Plus } from "lucide-react";
import type { AgentId } from "@/lib/workspace/agent-presets";
import { AGENT_PRESETS } from "@/lib/workspace/agent-presets";
import { AGENT_ICON } from "@/components/workspace/AppSetupPanel";
import { AgentHire } from "@/components/workspace/AppSetup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * The Agents container — a grid of AI-worker presets you "hire". Hired cards open
 * their detail surface (Manage); un-hired cards open the Lu-guided hire flow in a
 * dialog. Initial hired-state comes from the server; a fresh hire flips the card
 * and lands you on that agent's detail surface.
 */

export function AgentsClient({ hired: initialHired }: { hired: Record<AgentId, boolean> }) {
  const router = useRouter();
  const [hired, setHired] = React.useState(initialHired);
  const [hiring, setHiring] = React.useState<AgentId | null>(null);

  const hirePreset = hiring ? AGENT_PRESETS.find((p) => p.id === hiring) : null;

  const onHired = (id: AgentId) => {
    setHired((h) => ({ ...h, [id]: true }));
    setHiring(null);
    const href = AGENT_PRESETS.find((p) => p.id === id)?.detailHref ?? "/agents";
    router.push(href);
    router.refresh();
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {AGENT_PRESETS.map((preset) => {
          const Icon = AGENT_ICON[preset.icon];
          const isHired = hired[preset.id];
          const summary = `${preset.leashOptions[0].label} · ${preset.voiceHint}`;
          return (
            <div
              key={preset.id}
              className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs transition-colors hover:border-foreground/20"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-background text-foreground shadow-xs">
                  <Icon className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold leading-tight">{preset.label}</p>
                    {isHired && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3" strokeWidth={3} /> On the team
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{preset.blurb}</p>
                </div>
              </div>

              <p className="line-clamp-2 text-xs text-muted-foreground/80">{summary}</p>

              <div className="mt-auto flex items-center justify-between border-t pt-3">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {preset.id === "receptionist" ? "Always on" : isHired ? "Hired" : "Available"}
                </span>
                {isHired ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    nativeButton={false}
                    render={<Link href={preset.detailHref} />}
                  >
                    {preset.id === "receptionist" ? "Open" : "Manage"} <ArrowRight className="size-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => setHiring(preset.id)}>
                    <Plus className="size-3.5" /> Hire
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={hiring !== null} onOpenChange={(open) => !open && setHiring(null)}>
        <DialogContent className="gap-0 border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-3xl" showCloseButton={false}>
          <DialogTitle className="sr-only">{hirePreset ? `Hire ${hirePreset.label}` : "Hire an agent"}</DialogTitle>
          {hiring && <AgentHire agentId={hiring} onDone={onHired} onCancel={() => setHiring(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
