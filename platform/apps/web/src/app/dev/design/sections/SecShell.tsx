"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Frame, Cap, GalleryHeading } from "../_ui";
import { DashboardIcon } from "@/components/icons/dashboard";
import { CrmIcon } from "@/components/icons/crm";
import { ScheduleIcon } from "@/components/icons/schedule";
import { SarahIcon } from "@/components/icons/sarah";
import {
  ContentIcon, InvoicesIcon, ReviewsIcon, SettingsIcon, SignOutIcon, TeamIcon, WebsiteIcon,
  type IconState,
} from "@/components/icons/nav-icons";

/* The REAL animated nav icons (same set the app sidebar uses) — one per surface. */
const NAV: { key: string; label: string; Icon: React.ComponentType<{ state?: IconState; className?: string }> }[] = [
  { key: "home", label: "Home", Icon: DashboardIcon },
  { key: "canvas", label: "Canvas", Icon: TeamIcon },
  { key: "chat", label: "Lu", Icon: SarahIcon },
  { key: "crm", label: "CRM", Icon: CrmIcon },
  { key: "schedule", label: "Schedule", Icon: ScheduleIcon },
  { key: "money", label: "Money", Icon: InvoicesIcon },
  { key: "sites", label: "Sites", Icon: WebsiteIcon },
  { key: "content", label: "Content", Icon: ContentIcon },
  { key: "reviews", label: "Reviews", Icon: ReviewsIcon },
  { key: "team", label: "Team", Icon: TeamIcon },
];

/* Interactive sidebar built on the real animated icons + real collapse behavior. */
function SidebarRail() {
  const [collapsed, setCollapsed] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [active, setActive] = useState("crm");
  const stateFor = (key: string) => (hover === key ? "hover" : active === key ? "active" : "idle") as IconState;

  const Row = ({ item, footer = false }: { item: (typeof NAV)[number]; footer?: boolean }) => {
    const on = active === item.key;
    return (
      <button
        onMouseEnter={() => setHover(item.key)}
        onMouseLeave={() => setHover((k) => (k === item.key ? null : k))}
        onClick={() => !footer && setActive(item.key)}
        className={cn(
          "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
          collapsed && "justify-center px-0",
          on && !footer
            ? "bg-[#5b9bff]/10 font-medium text-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-foreground",
        )}
        title={collapsed ? item.label : undefined}
      >
        {on && !footer && <span className="absolute -left-0.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-[#5b9bff]" />}
        <item.Icon state={stateFor(item.key)} className="size-[18px] shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    );
  };

  return (
    <div
      className={cn("flex flex-col rounded-2xl border border-border/60 bg-sidebar p-2.5 transition-[width] duration-200 ease-out", collapsed ? "w-[62px]" : "w-[236px]")}
      style={{ height: 468 }}
    >
      <div className={cn("flex items-center gap-2 px-1 py-1.5", collapsed && "flex-col gap-1.5 px-0")}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground", collapsed ? "order-first" : "order-last ml-auto")}
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            {collapsed ? <path d="M6 4l4 4-4 4" /> : <path d="M10 4 6 8l4 4" />}
          </svg>
        </button>
        <div className="gloss-ink grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white">L</div>
        {!collapsed && <span className="truncate font-semibold text-sidebar-foreground">Lead Answered</span>}
      </div>

      <div className="mt-2 flex flex-1 flex-col gap-0.5 overflow-hidden">
        {NAV.map((item) => <Row key={item.key} item={item} />)}
      </div>

      <div className="mt-2 flex flex-col gap-0.5 border-t border-border/50 pt-2">
        <Row item={{ key: "settings", label: "Settings", Icon: SettingsIcon }} footer />
        <Row item={{ key: "signout", label: "Sign out", Icon: SignOutIcon }} footer />
      </div>
    </div>
  );
}

function HeaderControls() {
  return (
    <div className="flex items-center gap-2">
      <div className="neu-socket flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="4.2" /><path d="m13 13-2.6-2.6" /></svg>
        <span className="text-[12px]">Search customers…</span>
      </div>
      <button className="gloss press rounded-lg px-3 py-1.5 text-[12px] font-medium text-foreground">Theme</button>
      <button className="gloss-ink press rounded-lg px-3 py-1.5 text-[12px] font-medium text-white">Upgrade</button>
    </div>
  );
}

function EditorialPageHeader({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="t-caption">{kicker}</div>
        <h1 className="t-h1 mt-1 text-foreground">{title}</h1>
        <p className="t-body mt-1 max-w-md text-muted-foreground">{description}</p>
      </div>
      <HeaderControls />
    </div>
  );
}

export default function SecShell() {
  return (
    <div className="flex flex-col gap-8">
      <GalleryHeading tag="AppSidebar (real animated icons) · PageHeader · SidebarInset">App components — shell &amp; chrome</GalleryHeading>

      <Frame title="Sidebar rail" tag="real animated nav-icons · hover to animate · click « to collapse (interactive)">
        <div className="flex items-start gap-6">
          <SidebarRail />
          <Cap>reuses the app&rsquo;s animated icon set + collapse behavior — hover a row to draw its icon, click the chevron to collapse to the icon rail</Cap>
        </div>
      </Frame>

      <Frame title="Page header" tag="mono kicker · t-h1 title · gloss header controls">
        <div className="neu-card rounded-2xl bg-card p-5">
          <EditorialPageHeader kicker="CRM" title="Customers" description="Every lead and customer Lu has touched, kept warm without you lifting a finger." />
        </div>
      </Frame>

      <Frame title="Content frame (shell)" tag="elev-2 console frame · every route renders inside it">
        <div className="elev-2 rounded-[20px] bg-background p-5">
          <EditorialPageHeader kicker="MONEY" title="Invoices" description="Quotes and invoices Lu is tracking on your behalf." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="neu-card rounded-2xl bg-card p-4">
              <div className="t-caption">Outstanding</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">$4,280</div>
            </div>
            <div className="neu-card rounded-2xl bg-card p-4">
              <div className="t-caption">Paid this month</div>
              <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">$11,960</div>
            </div>
          </div>
        </div>
      </Frame>
    </div>
  );
}
