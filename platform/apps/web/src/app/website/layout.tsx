import { requireOrganization } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { Toaster } from "@/components/ui/sonner";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";

/**
 * The builder takeover layout (03 §2): /website lives OUTSIDE the (app) shell
 * group — no sidebar, no widget, no rounded frame. Auth still required; the
 * Sarah context mounts here because the site chat and gated teaser consume it.
 */
export default async function WebsiteBuilderLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireOrganization();
  const demo = await isDemoMode();

  const ownerName = demo ? APEX.ownerName : ((organization.name as string)?.split(" ")[0] ?? "there");
  const welcome = [
    {
      id: "welcome",
      at: new Date().toISOString(),
      role: "sarah" as const,
      body: `Hi ${ownerName} — I'm Sarah. I'm already answering your line; ask me anything about your leads, schedule, or jobs. For now I answer by text — in-app replies are coming.`,
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
      {children}
      <Toaster position="top-center" />
    </SarahProvider>
  );
}
