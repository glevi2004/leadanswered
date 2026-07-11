"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChartNoAxesColumn,
  FileText,
  Globe,
  House,
  LogOut,
  PenLine,
  Receipt,
  Settings,
  Sparkles,
  Star,
  Timer,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { MODULES, NAV_CLUSTERS } from "@/lib/data/registry";
import type { ModuleKey, ModuleStatus, SurfaceKey } from "@/lib/data/shared";
import { useSarah } from "@/components/sarah/sarah-context";

const ICONS: Record<string, LucideIcon> = {
  House,
  Sparkles,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  Timer,
  Globe,
  PenLine,
  Star,
  ChartNoAxesColumn,
  UsersRound,
  Settings,
};

/**
 * The OS sidebar (00 §2): unlabeled clusters separated by spacing — the sales
 * pillars never render in the app. Settings pinned to the footer.
 */
export function AppSidebar({
  companyName,
  statuses,
}: {
  companyName: string;
  statuses: Record<ModuleKey, ModuleStatus>;
}) {
  const pathname = usePathname();
  const { pendingCount } = useSarah();

  const renderItem = (key: SurfaceKey) => {
    const entry = MODULES[key];
    const status = entry.defaultStatus ? statuses[key as ModuleKey] : "live";
    if (status === "hidden") return null;
    const active = pathname === entry.route || pathname.startsWith(entry.route + "/");
    const Icon = ICONS[entry.icon] ?? Sparkles;
    return (
      <SidebarMenuItem key={key}>
        <SidebarMenuButton isActive={active} tooltip={entry.label} render={<Link href={entry.route} />}>
          <Icon />
          <span>{entry.label}</span>
        </SidebarMenuButton>
        {key === "sarah" && pendingCount > 0 && (
          <SidebarMenuBadge className="rounded-full bg-primary px-1.5 text-primary-foreground">
            {pendingCount}
          </SidebarMenuBadge>
        )}
        {key !== "sarah" && status === "coming_soon" && (
          <SidebarMenuBadge className="text-[10px] text-muted-foreground group-data-[collapsible=icon]:hidden">
            soon
          </SidebarMenuBadge>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    // Quo-style shell: the rail sits naked on the app background (inset variant),
    // never collapses on desktop (resize instead — SidebarResizer); mobile keeps the Sheet.
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5">
          <div className="btn-glow flex size-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
            {companyName.slice(0, 1).toUpperCase()}
          </div>
          <span className="truncate font-semibold group-data-[collapsible=icon]:hidden">{companyName}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {NAV_CLUSTERS.map((cluster, i) => (
          <SidebarGroup key={i} className={i > 0 ? "pt-0" : undefined}>
            <SidebarGroupContent>
              <SidebarMenu>{cluster.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {renderItem("settings")}
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Sign out" render={<a href="/auth/signout" />}>
              <LogOut />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
