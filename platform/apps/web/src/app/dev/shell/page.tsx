/** DEV-ONLY visual check for the app shell / sidebar (public in development). */
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarResizer } from "@/components/app/SidebarResizer";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { MODULE_KEYS } from "@/lib/data/registry";
import type { ModuleKey, ModuleStatus } from "@/lib/data/shared";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";

export default async function DevShell({ searchParams }: { searchParams: Promise<{ collapsed?: string }> }) {
  const sp = await searchParams;
  const statuses = Object.fromEntries(
    MODULE_KEYS.map((key) => [key, key === "crm" || key === "schedule" ? "live" : "preview"]),
  ) as Record<ModuleKey, ModuleStatus>;

  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <SidebarProvider defaultOpen={sp.collapsed !== "1"}>
        <AppSidebar companyName={APEX.companyName} statuses={statuses} demo />
        <SidebarResizer />
        <SidebarInset className="md:peer-data-[variant=inset]:rounded-2xl md:peer-data-[variant=inset]:border md:h-[calc(100svh-1rem)] md:overflow-hidden">
          <div className="p-8 text-sm text-muted-foreground">Shell harness — click « / » in the rail header.</div>
        </SidebarInset>
      </SidebarProvider>
    </SarahProvider>
  );
}
