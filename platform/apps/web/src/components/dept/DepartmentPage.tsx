"use client";

import * as React from "react";
import {
  Building2,
  CalendarClock,
  Code2,
  Database,
  Inbox as InboxIcon,
  LifeBuoy,
  Megaphone,
  Palette,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { agentById, type DeptId } from "@/lib/canvas/graph";
import { DEPT_ROADMAP } from "@/lib/canvas/dept-roadmap";
import { RoadmapStepper } from "./RoadmapStepper";
import { EmptyState } from "@/components/app/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The bespoke **Department page** (Cofounder "Sales Department" fidelity): a header
 * with a dept tile + "n/7 Setup" meter + Home/CRM/Inbox pill tabs, a horizontal
 * "{Dept} Roadmap" stepper, and a two-panel Home body (accounts + inbox). The CRM tab
 * reuses the real data surfaces (CRM for Sales, Invoices/Quotes for Finance). Served
 * chrome-less under /embed/{dept}-dept and rendered live on the company canvas.
 */

const DEPT_ICON: Record<DeptId, React.ComponentType<{ className?: string }>> = {
  sales: TrendingUp,
  operations: CalendarClock,
  finance: Wallet,
  legal: Scale,
  engineering: Code2,
  design: Palette,
  marketing: Megaphone,
  support: LifeBuoy,
};

export function DepartmentPage({ dept }: { dept: DeptId }) {
  const agent = agentById(dept);
  const roadmap = DEPT_ROADMAP[dept];
  if (!agent) return null;
  const Icon = DEPT_ICON[dept];

  return (
    <div className="mx-auto flex max-w-5xl flex-col">
      <Tabs defaultValue="home" className="gap-6">
        {/* ── header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground ring-1 ring-foreground/10">
              <Icon className="size-5" />
            </span>
            <h1 className="text-xl font-semibold tracking-tight">{agent.label} Department</h1>
          </div>
          <div className="flex items-center gap-3">
            <SetupMeter done={roadmap.setup[0]} total={roadmap.setup[1]} />
            <TabsList>
              <TabsTrigger value="home">Home</TabsTrigger>
              <TabsTrigger value="crm">CRM</TabsTrigger>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* ── Home ── */}
        <TabsContent value="home" className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{agent.label} Roadmap</CardTitle>
              <CardAction>
                <Button variant="outline" size="sm">
                  View Full Roadmap
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <RoadmapStepper steps={roadmap.steps} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <AccountsPanel agentName={agent.agentName} />
            <InboxPanel />
          </div>
        </TabsContent>

        {/* ── CRM ── */}
        <TabsContent value="crm">
          <EmptyState
            variant="mono"
            icon={Database}
            title="No records yet"
            body={`The ${agent.agentName}'s records show up here once work begins.`}
          />
        </TabsContent>

        {/* ── Inbox ── */}
        <TabsContent value="inbox">
          <InboxPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** The "n/7 Setup" label + a small segmented progress bar. */
function SetupMeter({ done, total }: { done: number; total: number }) {
  return (
    <div className="hidden items-center gap-2 sm:flex">
      <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">
        {done}/{total} Setup
      </span>
      <div className="flex items-center gap-0.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn("h-1.5 w-3.5 rounded-full", i < done ? "bg-foreground" : "bg-foreground/15")}
          />
        ))}
      </div>
    </div>
  );
}

/** Left Home panel: Accounts / Opportunities / Contacts pill tabs, honest-empty. */
function AccountsPanel({ agentName }: { agentName: string }) {
  return (
    <Card>
      <CardContent>
        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="mt-4">
            <EmptyState
              icon={Building2}
              title="No accounts saved yet."
              body={`Add target accounts manually, or ask the ${agentName} to save them from research work.`}
            />
          </TabsContent>
          <TabsContent value="opportunities" className="mt-4">
            <EmptyState
              title="No opportunities yet."
              body={`Deals appear here as the ${agentName} works the pipeline.`}
            />
          </TabsContent>
          <TabsContent value="contacts" className="mt-4">
            <EmptyState
              title="No contacts yet."
              body={`People you meet along the way get saved here by the ${agentName}.`}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

/** Right Home panel / Inbox tab: a thread list with the terminal empty state. */
function InboxPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbox</CardTitle>
      </CardHeader>
      <CardContent>
        <EmptyState
          variant="mono"
          icon={InboxIcon}
          title="All caught up"
          body="No threads match this inbox view."
        />
      </CardContent>
    </Card>
  );
}
