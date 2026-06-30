import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/lib/contractors";

type Variant = "default" | "secondary" | "destructive" | "outline";

/** Account lifecycle (DERIVED): invite sent → accepted → finished setup. Informational only. */
export const accountMeta: Record<AccountStatus, { label: string; variant: Variant; hint: string }> = {
  live: { label: "Live", variant: "default", hint: "Finished setup — Sarah is configured and running." },
  accepted: { label: "Accepted", variant: "outline", hint: "Accepted the invite; hasn't finished onboarding yet." },
  invited: { label: "Invited", variant: "secondary", hint: "Invite sent; the owner hasn't accepted yet." },
  none: { label: "No owner", variant: "destructive", hint: "No owner email assigned — can't invite." },
};

/** Twilio toll-free line verification (MANUAL). Informational only — doesn't gate sending. */
export const lineMeta: Record<string, { label: string; variant: Variant; hint: string }> = {
  verified: { label: "Line verified", variant: "default", hint: "Twilio toll-free verification complete." },
  pending: { label: "Line pending", variant: "secondary", hint: "Twilio toll-free verification still in progress." },
  failed: { label: "Line failed", variant: "destructive", hint: "Twilio verification failed — check Twilio." },
};

export function AccountBadge({ status }: { status: AccountStatus }) {
  const a = accountMeta[status] ?? accountMeta.none;
  return (
    <Badge variant={a.variant} title={a.hint}>
      {a.label}
    </Badge>
  );
}

export function LineBadge({ status }: { status: string }) {
  const l = lineMeta[status] ?? lineMeta.pending;
  return (
    <Badge variant={l.variant} title={l.hint}>
      {l.label}
    </Badge>
  );
}
