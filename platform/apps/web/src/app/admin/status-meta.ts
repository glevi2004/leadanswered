import type { AccountStatus } from "@/lib/contractors";

export type Variant = "default" | "secondary" | "destructive" | "outline";

/** Account lifecycle (DERIVED): New → (admin onboards → invite) → Invited → Live. Informational only. */
export const accountMeta: Record<AccountStatus, { label: string; variant: Variant; hint: string }> = {
  live: { label: "Live", variant: "default", hint: "Accepted the invite and signed in — up and running." },
  invited: { label: "Invited", variant: "secondary", hint: "Onboarded + invited; waiting for the owner to accept." },
  onboarded: { label: "Onboarded", variant: "outline", hint: "Setup done, but the invite hasn't been sent yet — send it." },
  new: { label: "New", variant: "outline", hint: "Created — run onboarding with them, then the invite goes out." },
  none: { label: "No owner", variant: "destructive", hint: "No owner email assigned — add one before onboarding." },
};

/** Twilio toll-free line verification (MANUAL). Informational only — doesn't gate sending. */
export const lineMeta: Record<string, { label: string; variant: Variant; hint: string }> = {
  verified: { label: "Line verified", variant: "default", hint: "Twilio toll-free verification complete." },
  pending: { label: "Line pending", variant: "secondary", hint: "Twilio toll-free verification still in progress." },
  failed: { label: "Line failed", variant: "destructive", hint: "Twilio verification failed — check Twilio." },
};
