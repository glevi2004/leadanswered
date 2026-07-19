import { cookies } from "next/headers";
import { requireOrganization } from "@/lib/dashboard-auth";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "@/components/ui/sonner";
import { SarahProvider } from "@/components/sarah/sarah-context";
import { SarahDock, SarahTrigger, SarahWidget } from "@/components/sarah/SarahWidget";
import { SidebarResizer } from "@/components/app/SidebarResizer";
import { resolveModuleStatus } from "@/lib/data/gating";
import { MODULE_KEYS } from "@/lib/data/registry";
import type { ModuleKey, ModuleStatus } from "@/lib/data/shared";

/**
 * The OS shell (00 §2–§3): sidebar with unlabeled clusters + the global Sarah
 * widget on every page. Every account renders from its real org, honest-empty
 * until each module's backend lands.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireOrganization();
  const cookieStore = await cookies();
  const savedWidth = Number(cookieStore.get("sidebar_width")?.value);
  const sidebarWidth = savedWidth >= 192 && savedWidth <= 336 ? `${savedWidth}px` : undefined;
  // « collapse state persists via the kit's own cookie (toggleSidebar writes it).
  const sidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  const statuses = Object.fromEntries(
    MODULE_KEYS.map((key) => [key, resolveModuleStatus(organization, key)]),
  ) as Record<ModuleKey, ModuleStatus>;

  const ownerName = (organization.name as string)?.split(" ")[0] ?? "there";
  const assistantName = (organization.sarahName as string) || "Lu";

  // NO seeded greeting (docs/product.md §0): the thread is the REAL persisted conversation
  // (rehydrated client-side). During onboarding Lu speaks first (her kickoff opener), so there's
  // no onboarding empty state; a post-onboarding empty thread shows the honest build prompt.
  // A template message pretending to be Lu contradicted onboarding-mode and rendered stale copy.
  return (
    <SarahProvider
      ownerName={ownerName}
      assistantName={assistantName}
      initialMessages={[]}
      initialApprovals={[]}
      initialActions={[]}
      initialEscalations={[]}
      initialPastChats={[]}
    >
      <SidebarProvider
        defaultOpen={sidebarOpen}
        style={sidebarWidth ? ({ "--sidebar-width": sidebarWidth } as React.CSSProperties) : undefined}
      >
        <AppSidebar
          companyName={organization.companyName}
          statuses={statuses}
        />
        <SidebarResizer />
        {/* The rounded frame: fixed to the viewport on desktop, content scrolls inside it.
            Recessed (neu-card-in) — a sunken well the raised nodes/cards sit IN, not a raised
            panel floating above the shell. The unlayered .neu-card-in bg + inset shadow win over
            the base component's raised shadow-sm, so no border/shadow utilities are needed. */}
        <SidebarInset className="neu-card-in md:peer-data-[variant=inset]:rounded-2xl md:h-[calc(100svh-1rem)] md:overflow-hidden">
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
