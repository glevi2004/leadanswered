"use client";

/** DEV-ONLY visual check for the Follow-ups board (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import {
  APEX,
  APEX_ACTIONS,
  APEX_APPROVALS,
  APEX_CHASES,
  APEX_CHASE_LOG,
  APEX_CHASE_STATS,
  APEX_ESCALATIONS,
  APEX_FOLLOWUP_RULES,
  APEX_PAST_CHATS,
  APEX_THREAD,
} from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { FollowupsClient } from "@/components/followups/FollowupsClient";
import { SarahDock, SarahWidget } from "@/components/sarah/SarahWidget";

export default function DevFollowups() {
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
        <div className="m-2 min-w-0 flex-1 overflow-y-auto rounded-2xl border bg-background">
          <div className="mx-auto flex max-w-4xl flex-col gap-5 p-8">
        <PageHeader title="Follow-ups" description="What Sarah's chasing, when she'll act next — and why she's silent when she is." />
        <FollowupsClient
          chases={APEX_CHASES}
          rules={APEX_FOLLOWUP_RULES}
          log={APEX_CHASE_LOG}
          stats={APEX_CHASE_STATS}
          timezone="America/New_York"
        />
          </div>
        </div>
        <SarahDock />
      </div>
      <SarahWidget />
    </SarahProvider>
  );
}
