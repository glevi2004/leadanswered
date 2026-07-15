import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { Toaster } from "@/components/ui/sonner";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";

/**
 * Chrome-less rendering for canvas nodes — /embed/[node] serves the REAL page bodies
 * (department dashboards + agent workplaces) with no sidebar/frame, so the company
 * canvas can render them live in scaled iframes. Mirrors sites/[siteId]/layout.tsx:
 * auth still required; SarahProvider mounts because Sarah-driven bodies (the Support
 * department = SarahPageClient) consume it.
 */
export default async function EmbedLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();

  const ownerName = demo ? APEX.ownerName : ((organization.name as string)?.split(" ")[0] ?? "there");
  const welcome = [
    {
      id: "welcome",
      at: new Date().toISOString(),
      role: "sarah" as const,
      body: `Hi ${ownerName} — I'm here. Ask me anything about your leads, schedule, or jobs.`,
      via: "app" as const,
    },
  ];

  return (
    <SarahProvider
      key={demo ? "demo" : "real"}
      demo={demo}
      ownerName={ownerName}
      initialMessages={demo ? APEX_THREAD : welcome}
      initialApprovals={demo ? APEX_APPROVALS : []}
      initialActions={demo ? APEX_ACTIONS : []}
    >
      {/* Chrome-less body; follows the active theme (next-themes on the iframe's own
          <html>) so canvas previews match whichever theme the owner is in. */}
      <div className="min-h-screen bg-background p-6 text-foreground">{children}</div>
      <Toaster position="top-center" />
    </SarahProvider>
  );
}
