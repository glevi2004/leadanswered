import { requireOrganization } from "@/lib/dashboard-auth";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { Toaster } from "@/components/ui/sonner";

/**
 * Chrome-less rendering for canvas nodes — /embed/[node] serves the REAL page bodies
 * (department dashboards + agent workplaces) with no sidebar/frame, so the company
 * canvas can render them live in scaled iframes. Mirrors sites/[siteId]/layout.tsx:
 * auth still required; SarahProvider mounts because Sarah-driven bodies (the Support
 * department = SarahPageClient) consume it.
 */
export default async function EmbedLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireOrganization();

  const ownerName = (organization.name as string)?.split(" ")[0] ?? "there";

  // No seeded greeting — same rule as the app shell (the thread is the real conversation;
  // the old template here was pure pre-pivot copy: "leads, schedule, or jobs").
  return (
    <SarahProvider
      ownerName={ownerName}
      initialMessages={[]}
      initialApprovals={[]}
      initialActions={[]}
    >
      {/* Chrome-less body; follows the active theme (next-themes on the iframe's own
          <html>) so canvas previews match whichever theme the owner is in. */}
      <div className="min-h-screen bg-background p-6 text-foreground">{children}</div>
      <Toaster position="top-center" />
    </SarahProvider>
  );
}
