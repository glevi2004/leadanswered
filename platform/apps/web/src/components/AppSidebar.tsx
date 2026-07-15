"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { MODULES, NAV_CLUSTERS } from "@/lib/data/registry";
import type { ModuleKey, ModuleStatus, SurfaceKey } from "@/lib/data/shared";
import { useSarah } from "@/components/sarah/sarah-context";
import { DemoToggle } from "@/components/app/DemoToggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { DashboardIcon, type IconState } from "@/components/icons/dashboard";
import { SarahIcon } from "@/components/icons/sarah";
import { CrmIcon } from "@/components/icons/crm";
import { ScheduleIcon } from "@/components/icons/schedule";
import {
  AnalyticsIcon,
  ContentIcon,
  FollowupsIcon,
  InvoicesIcon,
  QuotesIcon,
  ReviewsIcon,
  SettingsIcon,
  SignOutIcon,
  TeamIcon,
  WebsiteIcon,
} from "@/components/icons/nav-icons";

/** The full animated nav set (14-icons.md) — one component per surface. */
const KIWI_ICONS: Record<SurfaceKey, React.ComponentType<{ state?: IconState; className?: string }>> = {
  home: DashboardIcon,
  sarah: SarahIcon,
  canvas: TeamIcon, // network/org-graph glyph — reads as the radial company canvas
  crm: CrmIcon,
  schedule: ScheduleIcon,
  money: InvoicesIcon, // wallet/dollar — Money rolls up quotes + invoices
  quotes: QuotesIcon,
  invoices: InvoicesIcon,
  followups: FollowupsIcon,
  website: WebsiteIcon,
  content: ContentIcon,
  reviews: ReviewsIcon,
  analytics: AnalyticsIcon,
  team: TeamIcon,
  agents: SarahIcon, // bot/sparkles — the AI coworkers surface
  sites: WebsiteIcon, // globe — the website/landing-pages surface
  settings: SettingsIcon,
};

/**
 * The OS sidebar (00 §2): unlabeled clusters separated by spacing — the sales
 * pillars never render in the app. Settings pinned to the footer. Row-level
 * hover drives each icon's choreography.
 */
export function AppSidebar({
  companyName,
  statuses,
  demo,
}: {
  companyName: string;
  statuses: Record<ModuleKey, ModuleStatus>;
  demo: boolean;
}) {
  const pathname = usePathname();
  const { pendingCount } = useSarah();
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);

  const stateFor = (key: string, active: boolean): IconState =>
    hoveredKey === key ? "hover" : active ? "active" : "idle";

  const renderItem = (key: SurfaceKey) => {
    const entry = MODULES[key];
    const status = entry.defaultStatus ? statuses[key as ModuleKey] : "live";
    if (status === "hidden") return null;
    const active = pathname === entry.route || pathname.startsWith(entry.route + "/");
    const KiwiIcon = KIWI_ICONS[key];
    return (
      <SidebarMenuItem
        key={key}
        onMouseEnter={() => setHoveredKey(key)}
        onMouseLeave={() => setHoveredKey((k) => (k === key ? null : k))}
      >
        <SidebarMenuButton
          isActive={active}
          tooltip={entry.label}
          className="gap-2.5 [&>svg]:size-[18px]"
          render={<Link href={entry.route} />}
        >
          <KiwiIcon state={stateFor(key, active)} />
          <span>{entry.label}</span>
        </SidebarMenuButton>
        {/* badge uses an explicit fg/bg pair + counters for its built-in
            hover/active text swaps (they turned the number invisible on ink) */}
        {key === "sarah" && pendingCount > 0 && (
          <SidebarMenuBadge className="rounded-full bg-foreground px-1.5 text-background peer-hover/menu-button:text-background peer-data-active/menu-button:text-background">
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
    // Quo-style shell: the rail sits naked on the app background (inset variant).
    // « next to the company name collapses to an Apollo-style icon rail
    // (Levi 2026-07-13); expanded width stays drag-resizable (SidebarResizer).
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1.5 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:px-0">
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand (⌘B)" : "Collapse (⌘B)"}
            onClick={toggleSidebar}
            className="order-last ml-auto hidden rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground md:block group-data-[collapsible=icon]:order-first group-data-[collapsible=icon]:ml-0"
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
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
        {/* utility toggles live here, above Settings (Levi 2026-07-12); hidden on the icon rail */}
        <div className="flex items-center justify-between gap-1.5 px-2 pb-1 group-data-[collapsible=icon]:hidden">
          <DemoToggle demo={demo} />
          <ThemeToggle />
        </div>
        <SidebarMenu>
          {renderItem("settings")}
          <SidebarMenuItem
            onMouseEnter={() => setHoveredKey("signout")}
            onMouseLeave={() => setHoveredKey((k) => (k === "signout" ? null : k))}
          >
            <SidebarMenuButton
              tooltip="Sign out"
              className="gap-2.5 [&>svg]:size-[18px]"
              render={<a href="/auth/signout" />}
            >
              <SignOutIcon state={stateFor("signout", false)} />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
