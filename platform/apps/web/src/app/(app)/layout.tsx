import { cookies } from "next/headers";
import { requireOrganization } from "@/lib/dashboard-auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { SarahDock, SarahTrigger, SarahWidget } from "@/components/sarah/SarahWidget";
import { SidebarResizer } from "@/components/app/SidebarResizer";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULE_KEYS } from "@/lib/data/registry";
import type { ModuleKey, ModuleStatus } from "@/lib/data/shared";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_ESCALATIONS, APEX_PAST_CHATS, APEX_THREAD } from "@/lib/data/fixtures/apex";
import { listOpenEscalations } from "@/lib/data/home";

/**
 * The OS shell (00 §2–§3): sidebar with unlabeled clusters + the global Sarah
 * widget on every page. Demo mode swaps in the Apex Roofing fixtures; real
 * accounts start honest-empty until each module's backend lands.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireOrganization();
  const cookieStore = await cookies();
  const savedWidth = Number(cookieStore.get("sidebar_width")?.value);
  const sidebarWidth = savedWidth >= 192 && savedWidth <= 336 ? `${savedWidth}px` : undefined;
  // « collapse state persists via the kit's own cookie (toggleSidebar writes it).
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";
  const demo = await isDemoMode();

  const statuses = Object.fromEntries(
    MODULE_KEYS.map((key) => [key, resolveModuleStatus(organization, key, demo)]),
  ) as Record<ModuleKey, ModuleStatus>;

  const ownerName = demo ? APEX.ownerName : ((organization.name as string)?.split(" ")[0] ?? "there");
  const assistantName = (organization.sarahName as string) || "Lu";
  const escalations = demo ? APEX_ESCALATIONS : await listOpenEscalations(organization.id).catch(() => []);

  const welcome = [
    {
      id: "welcome",
      at: new Date().toISOString(),
      role: "sarah" as const,
      body: `Hi ${ownerName} — I'm ${assistantName}. I'm already answering your line; ask me anything about your leads, schedule, or jobs. For now I answer by text — in-app replies are coming.`,
      via: "app" as const,
    },
  ];

  return (
    <SarahProvider
      key={demo ? "demo" : "real"} // remount the client state when the demo toggle flips
      demo={demo}
      isNewOrg={organization.demoProfile === "new"}
      ownerName={ownerName}
      assistantName={assistantName}
      initialMessages={demo ? APEX_THREAD : welcome}
      initialApprovals={demo ? APEX_APPROVALS : []}
      initialActions={demo ? APEX_ACTIONS : []}
      initialEscalations={escalations}
      initialPastChats={demo ? APEX_PAST_CHATS : []}
    >
      <SidebarProvider
        defaultOpen={sidebarOpen}
        style={sidebarWidth ? ({ "--sidebar-width": sidebarWidth } as React.CSSProperties) : undefined}
      >
        <AppSidebar
          companyName={demo ? APEX.companyName : organization.companyName}
          statuses={statuses}
          demo={demo}
        />
        <SidebarResizer />
        {/* The rounded frame: fixed to the viewport on desktop, content scrolls inside it. */}
        <SidebarInset className="md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:h-[calc(100svh-1rem)] md:overflow-hidden">
          {/* Mobile only: a real bar (drawer trigger needs a home; toggles live in the drawer). */}
          <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-4 md:hidden">
            <SidebarTrigger />
            <SarahTrigger />
          </header>
          {/* Desktop: the Sarah button floats in the frame's corner, its text on the SAME LINE
              as the open dock's header (icon + chat title): dock line centers at 32px viewport
              (aside py-2 + header py-2.5 + row half 14); h-8 button at top-2 → 8+8+16 = 32px. */}
          <div className="absolute right-6 top-2 z-20 hidden items-center gap-2 md:flex">
            <SarahTrigger />
          </div>
          <main className="flex-1 md:min-h-0 md:overflow-y-auto">
            <div className="flex min-h-full flex-col p-4 pb-24 sm:p-6">{children}</div>
          </main>
        </SidebarInset>
        {/* The dock sits OUTSIDE the rounded frame, on the shell — like the website chat column. */}
        <SarahDock />
        <SarahWidget />
        <Toaster position="top-center" />
      </SidebarProvider>
    </SarahProvider>
  );
}
