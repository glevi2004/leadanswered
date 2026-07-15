"use client";

/** DEV-ONLY visual check for Team (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";
import { PageHeader } from "@/components/app/PageHeader";
import { TeamClient } from "@/components/team/TeamClient";

export default function DevTeam() {
  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-8">
        <PageHeader title="Team" description="Who Sarah knows, and what each person can ask her." />
        <TeamClient />
      </div>
    </SarahProvider>
  );
}
