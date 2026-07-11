import { cookies } from "next/headers";
import { requireOrganization } from "@/lib/dashboard-auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { SarahWidget } from "@/components/sarah/SarahWidget";
import { DemoToggle } from "@/components/app/DemoToggle";
import { SidebarResizer } from "@/components/app/SidebarResizer";
import { isDemoMode, resolveModuleStatus } from "@/lib/data/gating";
import { MODULE_KEYS } from "@/lib/data/registry";
import type { ModuleKey, ModuleStatus } from "@/lib/data/shared";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";

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
  const demo = await isDemoMode();

  const statuses = Object.fromEntries(
    MODULE_KEYS.map((key) => [key, resolveModuleStatus(organization, key, demo)]),
  ) as Record<ModuleKey, ModuleStatus>;

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
      key={demo ? "demo" : "real"} // remount the client state when the demo toggle flips
      demo={demo}
      ownerName={ownerName}
      initialMessages={demo ? APEX_THREAD : welcome}
      initialApprovals={demo ? APEX_APPROVALS : []}
      initialActions={demo ? APEX_ACTIONS : []}
    >
      <SidebarProvider style={sidebarWidth ? ({ "--sidebar-width": sidebarWidth } as React.CSSProperties) : undefined}>
        <AppSidebar companyName={demo ? APEX.companyName : organization.companyName} statuses={statuses} />
        <SidebarResizer />
        {/* The rounded frame: fixed to the viewport on desktop, content scrolls inside it. */}
        <SidebarInset className="md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:h-[calc(100svh-1rem)] md:overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
            <SidebarTrigger className="md:hidden" />
            <div className="flex flex-1 items-center justify-end gap-2">
              <DemoToggle demo={demo} />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 md:min-h-0 md:overflow-y-auto">
            <div className="flex min-h-full flex-col p-4 pb-24 sm:p-6">{children}</div>
          </main>
        </SidebarInset>
        <SarahWidget />
        <Toaster position="top-center" />
      </SidebarProvider>
    </SarahProvider>
  );
}
