"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import type { AgentIconKey, AgentPreset } from "@/lib/workspace/agent-presets";
import { LuIcon } from "@/components/icons/lu";
import { FollowupsIcon, ContentIcon, ReviewsIcon } from "@/components/icons/nav-icons";
import { cn } from "@/lib/utils";

/**
 * The LIVE right panel of the agent hire — the coworker coming to life as Lu
 * settles the two things that shape them: their LEASH (how much rope) and their
 * VOICE (the tone). The agent's icon + blurb sit up top; each row fills in with
 * an emerald check the moment `config[field]` lands; and a tasteful preview mock
 * shows the agent joining the team with those choices.
 */

type IconComponent = React.ComponentType<{ className?: string }>;

export const AGENT_ICON: Record<AgentIconKey, IconComponent> = {
  receptionist: LuIcon,
  reviews: ReviewsIcon,
  content: ContentIcon,
  followups: FollowupsIcon,
};

type Config = { leash?: string; voice?: string };

export function AgentComingToLife({ preset, config }: { preset: AgentPreset; config: Config }) {
  const Icon = AGENT_ICON[preset.icon];
  const leashLabel = preset.leashOptions.find((o) => o.value === config.leash)?.label;
  const voiceLabel = config.voice ? sentenceCase(config.voice) : undefined;

  const rows: { key: string; label: string; value?: string }[] = [
    { key: "leash", label: "How much rope", value: leashLabel },
    { key: "voice", label: "Voice", value: voiceLabel },
  ];

  return (
    <div className="flex h-full w-full flex-col gap-6 overflow-y-auto bg-sidebar/40 p-6">
      {/* header — the agent itself */}
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border bg-background text-foreground shadow-xs">
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold leading-tight">{preset.label}</p>
          <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{preset.blurb}</p>
        </div>
      </div>

      {/* your setup — each choice fills in as Lu settles it */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your setup</h3>
        <div className="divide-y overflow-hidden rounded-2xl border bg-background">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-3 px-3.5 py-3">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <AnimatePresence mode="wait" initial={false}>
                {r.value ? (
                  <motion.span
                    key={`set-${r.value}`}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="flex items-center gap-1.5 text-right text-sm font-medium text-foreground"
                  >
                    <motion.span
                      initial={{ scale: 0.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"
                    >
                      <Check className="size-2.5" strokeWidth={3} />
                    </motion.span>
                    {r.value}
                  </motion.span>
                ) : (
                  <motion.span
                    key="unset"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-muted-foreground/40"
                  >
                    …
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* preview — the agent joining the team */}
      <section className="flex min-h-0 flex-1 flex-col">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</h3>
        <div className="flex-1">
          <div className="rounded-2xl border bg-background p-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border bg-sidebar/60 text-foreground">
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{preset.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {config.leash || config.voice ? "Coming to life…" : "Waiting on you"}
                </p>
              </div>
              <span className="ml-auto flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" /> On the team
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
              {leashLabel && <Pill>{leashLabel}</Pill>}
              {voiceLabel && <Pill>{voiceLabel}</Pill>}
              {!leashLabel && !voiceLabel && (
                <span className="text-[11px] text-muted-foreground">Tell Lu how you want them and it fills in here.</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function sentenceCase(s: string): string {
  const t = s.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}
