"use client";

/** DEV-ONLY visual check for the needs-you inbox + widget escalations (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_ESCALATIONS, APEX_PAST_CHATS, APEX_THREAD } from "@/lib/data/fixtures/apex";
import { NeedsAttention } from "@/app/(app)/home/HomeClient";
import { SarahDock, SarahTrigger, SarahWidget } from "@/components/sarah/SarahWidget";

export default function DevInbox() {
  return (
    <SarahProvider
      demo
      ownerName={APEX.ownerName}
      initialMessages={APEX_THREAD}
      initialApprovals={APEX_APPROVALS}
      initialActions={APEX_ACTIONS}
      initialEscalations={APEX_ESCALATIONS}
      initialPastChats={APEX_PAST_CHATS}
    >
      <div className="flex h-screen bg-sidebar">
        <div className="relative m-2 min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-background">
          <div className="absolute right-6 top-2 z-20 flex items-center gap-2">
            <SarahTrigger />
          </div>
          <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
            <h2 className="border-b pb-1 text-xs font-bold uppercase text-red-500">needs you (rows + escalation)</h2>
            <NeedsAttention />
          </div>
        </div>
        <SarahDock />
      </div>
      <SarahWidget />
    </SarahProvider>
  );
}
