"use client";

import * as React from "react";
import {
  Check, CreditCard, ExternalLink, Globe, Mail, Plus, Server, Sparkles,
} from "lucide-react";
import { useSarah } from "./sarah-context";
import { useDockData, useSites } from "@/lib/dock/live";
import { deriveAgents, importantLinks, useConnectStatus } from "./dock-data";
import { ConnectionsPanel } from "@/components/settings/ConnectionsPanel";
import { cn } from "@/lib/utils";

/**
 * Company — the org view (canvas.md §"the dock"). The Stack (Domain / Email / Payment /
 * Hosting), Important links (the real sites), and the provisioned Agents. Hosting is driven by
 * the real `/api/connect/status`; Domain/Email/Payment are honest "Setup" placeholders (no data
 * source yet). Agents are the departments with a real footprint; clicking one opens its panel.
 */
export function DockCompany() {
  const { widgetOpen, setSelectedAgent } = useSarah();
  const { tasks } = useDockData(widgetOpen);
  const { sites } = useSites(widgetOpen);
  const connect = useConnectStatus(widgetOpen);

  const hostingConnected = connect.github && connect.vercel;
  const links = importantLinks(sites);
  const agents = deriveAgents(tasks, sites);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 text-sm">
      {/* The Stack */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="font-medium text-foreground">Stack</p>
        <p className="mt-0.5 text-xs text-muted-foreground">The rails your company runs on.</p>
        <div className="mt-3 space-y-1">
          {/* UI honesty (docs/workflow.md §7): Domain/Email/Payment have no data source yet —
              they say Soon, not a "Setup" chip pretending there's a flow behind it. */}
          <StackRow icon={Globe} label="Domain" connected={false} soon />
          <StackRow icon={Mail} label="Email" connected={false} soon />
          <StackRow icon={CreditCard} label="Payment" connected={false} soon />
          <StackRow icon={Server} label="Hosting" connected={hostingConnected} />
          {/* Hosting = the REAL connect panel (token paste · status · disconnect), right here —
              the old sub-rows were display-only chips that answered clicks with nothing. */}
          <div className="ml-8 mt-1 border-l pl-3">
            <ConnectionsPanel />
          </div>
        </div>
      </div>

      {/* Important links */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="font-medium text-foreground">Important links</p>
        <p className="mt-0.5 text-xs text-muted-foreground">Your live app and marketing site.</p>
        {links.length > 0 ? (
          <div className="mt-3 space-y-2">
            {links.map((l) => (
              <div key={l.id} className="flex items-center gap-2.5 rounded-lg border bg-background px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{l.label}</p>
                  <p className="truncate text-xs text-muted-foreground">{l.host}</p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                  {l.status}
                </span>
                {l.url && (
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${l.label}`}
                    className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">No sites yet — the Engineer&rsquo;s builds show up here.</p>
        )}
      </div>

      {/* Agents */}
      <div className="rounded-xl border bg-card p-4 elev-1">
        <p className="font-medium text-foreground">Agents</p>
        <p className="mt-0.5 text-xs text-muted-foreground">The departments working for you.</p>
        {agents.length > 0 ? (
          <div className="mt-3 space-y-2">
            {agents.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setSelectedAgent(a.key)}
                className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-muted"
              >
                <span
                  className="grid size-8 shrink-0 place-items-center rounded-md"
                  style={{ backgroundColor: `rgba(${a.accent},0.14)`, color: `rgb(${a.accent})` }}
                >
                  <Sparkles className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{a.agentName}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.label}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            No agents provisioned yet — ask Lu to get a department working.
          </p>
        )}
        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-2 flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-muted-foreground/70"
        >
          <Plus className="size-3.5" /> New agent
          <span className="rounded bg-muted px-1 py-px font-mono text-[9px] uppercase tracking-wide">Soon</span>
        </button>
      </div>
    </div>
  );
}

/** A Stack row — icon, label, and a Connected/Setup/Soon chip. */
function StackRow({
  icon: Icon,
  label,
  connected,
  soon = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  connected: boolean;
  soon?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
      {soon ? (
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted-foreground/70">
          Soon
        </span>
      ) : (
        <StatusChip connected={connected} />
      )}
    </div>
  );
}

/** Connected (green + check) vs Setup (muted) — the one honest state chip. */
function StatusChip({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
      <Check className="size-3" /> Connected
    </span>
  ) : (
    <span className={cn("shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground")}>
      Setup
    </span>
  );
}
