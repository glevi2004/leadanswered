import type { AccountStatus } from "@/lib/organizations";

export type Variant = "default" | "secondary" | "destructive" | "outline";

/**
 * Account lifecycle (DERIVED) — the SELF-SERVE model (docs/product.md §5): the admin sends
 * the invite (or accepts from the waitlist, which invites automatically); the owner sets a
 * password and onboards THEMSELVES with Lu in the workspace. Informational only.
 */
export const accountMeta: Record<AccountStatus, { label: string; variant: Variant; hint: string }> = {
  live: { label: "Live", variant: "default", hint: "Accepted the invite and signed in — up and running." },
  invited: { label: "Invited", variant: "secondary", hint: "Invite sent; waiting for the owner to accept and onboard themselves." },
  onboarded: { label: "Onboarded", variant: "outline", hint: "Finished onboarding. If they were never invited (legacy state), send the invite." },
  new: { label: "New", variant: "outline", hint: "Created — send the invite; they set a password and Lu onboards them in the workspace." },
  none: { label: "No owner", variant: "destructive", hint: "No owner email assigned — add one, then send the invite." },
};
