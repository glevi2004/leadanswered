import { cookies } from "next/headers";
import { requireOrganization } from "@/lib/dashboard-auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { SarahWidget } from "@/components/sarah/SarahWidget";
import { DemoToggle } from "@/components/app/DemoToggle";
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
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";
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
      demo={demo}
      ownerName={ownerName}
      initialMessages={demo ? APEX_THREAD : welcome}
      initialApprovals={demo ? APEX_APPROVALS : []}
      initialActions={demo ? APEX_ACTIONS : []}
    >
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar companyName={demo ? APEX.companyName : organization.companyName} statuses={statuses} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <DemoToggle demo={demo} />
              <ThemeToggle />
            </div>
          </header>
          <div className="flex-1 p-4 pb-24 sm:p-6">{children}</div>
        </SidebarInset>
        <SarahWidget />
        <Toaster position="top-center" />
      </SidebarProvider>
    </SarahProvider>
  );
}
