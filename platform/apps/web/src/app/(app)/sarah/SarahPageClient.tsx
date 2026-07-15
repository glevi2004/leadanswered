"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { useSarah } from "@/components/sarah/sarah-context";
import { SarahThread } from "@/components/sarah/SarahThread";
import { SarahComposer } from "@/components/sarah/SarahComposer";
import { ApprovalCard } from "@/components/app/ApprovalCard";
import { SarahIcon } from "@/components/icons/sarah";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 18) return "Afternoon";
  return "Evening";
}

/**
 * /sarah — the AI Assistant page. The SAME Lu chat that lives in the dock's
 * "Lu" tab, rendered full-page: one calm, focused conversation with Lu, who
 * speaks for all the department agents. Abstracted from the canvas — no graph,
 * no agent panels, no department machinery. Reuses the shared thread + composer
 * (SarahThread / SarahComposer, with their suggestion chips) and, like the dock,
 * surfaces anything that needs the owner (escalations + approvals) inline above
 * the thread — so /sarah?tab=approvals deep-links still land on the pending work.
 */
export function SarahPageClient() {
  const {
    messages,
    typing,
    approvals,
    escalations,
    beginEscalationAnswer,
    startNewChat,
    ownerName,
    assistantName,
  } = useSarah();

  const firstName = ownerName?.split(" ")[0] ?? "there";
  const hasPending = approvals.length > 0 || escalations.length > 0;

  // Claude-style landing: a fresh chat (nothing you've sent, nothing pending)
  // opens with a centered greeting + composer; your first message drops the
  // composer to the bottom and the thread takes over.
  const fresh = !messages.some((m) => m.role === "owner") && !hasPending;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col [--bubble-surface:var(--background)]">
      {/* Header — Lu's identity + New chat. She speaks for every agent. */}
      <header className="flex shrink-0 items-center justify-between gap-2 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <SarahIcon className="size-7 shrink-0 text-foreground" />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">{assistantName}</span>
            <span className="truncate text-xs text-muted-foreground">Speaks for all your agents</span>
          </div>
        </div>
        <button
          type="button"
          onClick={startNewChat}
          className="flex h-8 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
        >
          <Plus className="size-4" />
          New chat
        </button>
      </header>

      {fresh ? (
        // Fresh: greeting + composer, centered in the space (Claude landing).
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 px-4 pb-[10vh]">
          <div className="flex items-center gap-3">
            <SarahIcon className="size-8" />
            <h2 className="text-3xl font-semibold tracking-tight">
              {greeting()}, <span className="text-gradient-green">{firstName}</span>
            </h2>
          </div>
          <SarahComposer showContext={false} className="w-full" />
        </div>
      ) : (
        // Active: pending work + thread scroll; composer docked at the bottom.
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto py-1">
            {escalations.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {escalations.map((e) => (
                  <div key={e.id} className="rounded-xl border bg-card p-3">
                    <p className="text-[11px] font-medium text-orange-700 dark:text-orange-300">
                      Question · {e.contactName}
                    </p>
                    <p className="mt-1 text-sm">&ldquo;{e.question}&rdquo;</p>
                    <button
                      type="button"
                      onClick={() => beginEscalationAnswer(e)}
                      className="mt-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
                    >
                      Answer — {assistantName} passes it along
                    </button>
                  </div>
                ))}
              </div>
            )}
            {approvals.length > 0 && (
              <div className="mb-3 flex flex-col gap-2">
                {approvals.map((a) => (
                  <ApprovalCard key={a.id} approval={a} compact />
                ))}
              </div>
            )}
            <SarahThread messages={messages} typing={typing} />
          </div>
          <div className="pb-1 pt-2">
            <SarahComposer showContext={false} />
          </div>
        </div>
      )}
    </div>
  );
}
