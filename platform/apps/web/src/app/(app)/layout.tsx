import { requireOrganization } from "@/lib/dashboard-auth";
import { Toaster } from "@/components/ui/sonner";
import { LuProvider } from "@/components/lu/lu-context";
import { LuDock, LuDockMobile } from "@/components/lu/LuDock";
import { UserMenu } from "@/components/UserMenu";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The app shell: a full-bleed canvas with the account menu floating top-left and the Lu chat
 * sidebar on the right (collapsible to a rail). No nav sidebar — the canvas is home; Settings
 * and Team live behind the account menu.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const organization = await requireOrganization();

  const ownerName = (organization.name as string)?.split(" ")[0] ?? "there";
  const assistantName = (organization.assistantName as string) || "Lu";

  return (
    <LuProvider
      ownerName={ownerName}
      assistantName={assistantName}
      initialMessages={[]}
      initialApprovals={[]}
      initialActions={[]}
      initialEscalations={[]}
      initialPastChats={[]}
    >
      <div className="relative flex h-svh flex-col overflow-hidden bg-background text-foreground">
        {/* The account menu (+ theme toggle), floating over the canvas top-left. */}
        <div className="absolute left-3 top-3 z-30 flex items-center gap-2">
          <UserMenu companyName={organization.companyName} />
          <ThemeToggle />
        </div>

        {/* The page content. The canvas is full-bleed (it cancels this padding); other pages
            (Settings, Team, task detail…) scroll inside it with padding. */}
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex min-h-full flex-col p-4 pb-24 sm:p-6">{children}</div>
        </main>

        {/* The one chat sidebar — desktop rail-collapsible dock + mobile bottom sheet. */}
        <LuDock />
        <LuDockMobile />
        <Toaster position="top-center" />
      </div>
    </LuProvider>
  );
}
