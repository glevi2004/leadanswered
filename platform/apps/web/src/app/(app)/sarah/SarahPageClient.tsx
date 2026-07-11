"use client";

import * as React from "react";
import { CircleCheck, Sparkles } from "lucide-react";
import { useSarah } from "@/components/sarah/sarah-context";
import { SarahThread } from "@/components/sarah/SarahThread";
import { SarahComposer } from "@/components/sarah/SarahComposer";
import { ApprovalCard } from "@/components/app/ApprovalCard";
import { SarahActionRow } from "@/components/app/SarahActionRow";
import { EmptyState } from "@/components/app/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODULES } from "@/lib/data/registry";
import type { ModuleKey } from "@/lib/data/shared";
import { cn } from "@/lib/utils";

/** /sarah — the full-screen surface: chat, the activity log, the approvals queue (02-sarah). */
export function SarahPageClient() {
  const { messages, typing, approvals, actions, pendingCount } = useSarah();
  const [moduleFilter, setModuleFilter] = React.useState<ModuleKey | "core" | "all">("all");

  const modulesInFeed = Array.from(new Set(actions.map((a) => a.module)));
  const filtered = moduleFilter === "all" ? actions : actions.filter((a) => a.module === moduleFilter);

  return (
    <Tabs defaultValue="chat" className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="btn-glow flex size-9 items-center justify-center rounded-full">
            <Sparkles className="size-4.5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight leading-none">Sarah</h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" /> Answering your line right now
            </p>
          </div>
        </div>
        <TabsList>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="approvals" className="gap-1.5">
            Approvals
            {pendingCount > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="chat" className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border bg-card shadow-xs [--bubble-surface:var(--card)]">
          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <SarahThread messages={messages} typing={typing} className="mx-auto max-w-2xl" />
          </div>
          <div className="border-t px-4 py-3 sm:px-6">
            <SarahComposer showContext={false} className="mx-auto max-w-2xl" />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="activity" className="mt-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {(["all", ...modulesInFeed] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModuleFilter(m as typeof moduleFilter)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                moduleFilter === m
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "all" ? "All" : m === "core" ? "Conversations" : MODULES[m as ModuleKey]?.label}
            </button>
          ))}
        </div>
        {filtered.length === 0 ? (
          <EmptyState icon={Sparkles} title="Everything Sarah does will show up here." />
        ) : (
          <div className="flex max-w-2xl flex-col">
            {filtered.map((a) => (
              <SarahActionRow key={a.id} action={a} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="approvals" className="mt-4">
        {approvals.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Nothing waiting on you."
            body="Sarah will ask before anything goes out to a customer — drafts land here for your OK."
          />
        ) : (
          <div className="grid max-w-4xl gap-3 lg:grid-cols-2">
            {approvals.map((a) => (
              <ApprovalCard key={a.id} approval={a} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
