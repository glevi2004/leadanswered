"use client";

import { TeamSetup } from "@/components/team/TeamSetup";
import { patchOnboardedProfile } from "@/lib/org-cookie";
import type { Member } from "@/lib/data/team/types";

/**
 * The Team page's copy of the team-setup experience (same as onboarding's last
 * step): Lu chat + live graph, but here every change persists to the onboarded
 * org's profile cookie so the team survives navigation.
 */
export function TeamSetupPersisted({ ownerName, initialMembers }: { ownerName: string; initialMembers: Member[] }) {
  return (
    <TeamSetup
      ownerName={ownerName}
      initialMembers={initialMembers}
      onMembersChange={(members) =>
        patchOnboardedProfile({ seedMembers: members.filter((m) => m.roleKey !== "owner") })
      }
      className="h-[calc(100svh-9rem)]"
    />
  );
}
