import { requireContractor } from "@/lib/dashboard-auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const contractor = await requireContractor();

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-6">
            <span className="font-semibold tracking-tight">{contractor.companyName}</span>
            <DashboardNav />
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button render={<a href="/auth/signout" />} variant="ghost" size="sm">
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
