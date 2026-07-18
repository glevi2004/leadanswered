"use client";

import * as React from "react";
import {
  Check,
  CircleAlert,
  Copy,
  Database,
  GitBranch,
  HardDrive,
  KeyRound,
  Lightbulb,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Table2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  cell,
  useConsole,
  type Advisor,
  type AuthData,
  type DatabaseData,
  type LoadState,
  type LogsData,
  type MigrationsData,
  type Overview,
  type SecretsData,
  type StorageData,
  type UsersData,
} from "./useConsole";

/**
 * The Database-view CONSOLE — a mirror-with-key-actions of the department's one shared Supabase
 * project (canvas.md §"Database view"). A left sidebar of tabs (Database · Migrations · Storage ·
 * Authentication · Users · Secrets · Logs · Suggestions); each pane reads its `/api/console/*`
 * proxy and renders the mirror + honest-empty state. Database / Migrations / Secrets are wired
 * for real browse; the rest render their shape + empty state. "Key actions" (generate secret key,
 * add redirect, create bucket, add user) show as affordances — the read-only mutations that aren't
 * in the GET contract yet are disabled TODOs. Rendered by the frame inside the Department card.
 */

type TabId =
  | "database"
  | "migrations"
  | "storage"
  | "auth"
  | "users"
  | "secrets"
  | "logs"
  | "suggestions";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "database", label: "Database", icon: Database },
  { id: "migrations", label: "Migrations", icon: GitBranch },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "auth", label: "Authentication", icon: ShieldCheck },
  { id: "users", label: "Users", icon: Users },
  { id: "secrets", label: "Secrets", icon: KeyRound },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "suggestions", label: "Suggestions", icon: Lightbulb },
];

export default function DatabaseConsole({ className }: { className?: string }) {
  const [tab, setTab] = React.useState<TabId>("database");
  const { data: overview } = useConsole<Overview>("overview", { connected: false });

  return (
    <div
      className={cn(
        "flex h-full min-h-[440px] w-full overflow-hidden rounded-xl border border-border bg-card text-foreground",
        className,
      )}
    >
      {/* sidebar */}
      <nav className="flex w-44 shrink-0 flex-col border-r border-border bg-muted/30 p-2">
        <p className="t-caption px-2 pb-2 pt-1">Console</p>
        <ul className="flex flex-1 flex-col gap-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => setTab(id)}
                aria-current={tab === id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  tab === id
                    ? "bg-background font-medium text-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            </li>
          ))}
        </ul>
        <ConnectionPill overview={overview} />
      </nav>

      {/* content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Panel tab={tab} />
      </div>
    </div>
  );
}

function ConnectionPill({ overview }: { overview: Overview }) {
  return (
    <div className="mt-2 flex items-center gap-2 rounded-md border border-border/70 px-2 py-1.5">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          overview.connected ? "bg-emerald-500" : "bg-muted-foreground/40",
        )}
      />
      <span className="min-w-0 truncate font-mono text-[0.7rem] text-muted-foreground">
        {overview.connected ? (overview.projectRef ?? "connected") : "not connected"}
      </span>
    </div>
  );
}

function Panel({ tab }: { tab: TabId }) {
  switch (tab) {
    case "database":
      return <DatabasePanel />;
    case "migrations":
      return <MigrationsPanel />;
    case "storage":
      return <StoragePanel />;
    case "auth":
      return <AuthPanel />;
    case "users":
      return <UsersPanel />;
    case "secrets":
      return <SecretsPanel />;
    case "logs":
      return <LogsPanel />;
    case "suggestions":
      return <SuggestionsPanel />;
  }
}

/* ------------------------------------------------------------------ shared bits */

function PaneHeader({
  title,
  state,
  onReload,
  children,
}: {
  title: string;
  state: LoadState;
  onReload: () => void;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-2 border-b border-border px-4 py-2.5">
      <h2 className="t-title">{title}</h2>
      {state === "loading" && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      <div className="ml-auto flex items-center gap-1.5">
        {children}
        <Button variant="ghost" size="icon-xs" onClick={onReload} title="Refresh">
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
    </header>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <Icon className="size-7 text-muted-foreground/50" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {hint && <p className="max-w-xs text-xs text-muted-foreground/70">{hint}</p>}
    </div>
  );
}

/**
 * Run a console WRITE action through the proxy (§8b ladder 0b). Returns ok; surfaces the api's
 * error message when it fails. Callers confirm() first — these mutate the org's real Supabase.
 */
async function consoleAct(action: string, params: Record<string, unknown> = {}): Promise<boolean> {
  try {
    const res = await fetch("/api/console/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(data.error || "That didn't work — check the connection and try again.");
      return false;
    }
    return true;
  } catch {
    toast.error("That didn't work — check the connection and try again.");
    return false;
  }
}

/** A key action button. `todo` renders it disabled with an explanatory tooltip (mutation not wired yet). */
function KeyAction({
  icon: Icon,
  children,
  onClick,
  todo,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  onClick?: () => void;
  todo?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="xs"
      onClick={onClick}
      disabled={todo}
      title={todo ? "Coming soon" : undefined}
    >
      <Icon className="size-3.5" />
      {children}
    </Button>
  );
}

function LevelBadge({ level }: { level: string }) {
  const l = level.toLowerCase();
  const tone =
    l === "error" || l === "critical"
      ? "bg-destructive/10 text-destructive"
      : l === "warn" || l === "warning"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground";
  return (
    <span className={cn("rounded px-1.5 py-0.5 font-mono text-[0.65rem] uppercase", tone)}>
      {level}
    </span>
  );
}

/** Read-only data grid; empty → the console's honest "query returned no results". */
function DataGrid({ rows }: { rows: Record<string, unknown>[] }) {
  if (!rows.length) {
    return <EmptyState icon={Table2} title="The query returned no results" />;
  }
  const cols = Object.keys(rows[0]);
  return (
    <div className="overflow-auto">
      <table className="w-full border-collapse text-left font-mono text-xs">
        <thead className="sticky top-0 bg-muted/60 backdrop-blur">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="border-b border-border px-3 py-2 font-medium text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/60 hover:bg-muted/40">
              {cols.map((c) => (
                <td key={c} className="max-w-xs truncate px-3 py-1.5">
                  {cell(row[c]) || <span className="text-muted-foreground/40">NULL</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CopyField({ label, value, mono = true }: { label: string; value?: string; mono?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    if (!value) return;
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <div className="flex flex-col gap-1">
      <span className="t-caption">{label}</span>
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <code className={cn("min-w-0 flex-1 truncate text-xs", mono && "font-mono")}>
          {value || <span className="text-muted-foreground/50">—</span>}
        </code>
        {value && (
          <button
            type="button"
            onClick={copy}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Database (wired) */

const DB_EMPTY: DatabaseData = { schemas: [], tables: [] };

function DatabasePanel() {
  const list = useConsole<DatabaseData>("database", DB_EMPTY);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const [ranQuery, setRanQuery] = React.useState<string | null>(null);

  const detailParams: Record<string, string> | undefined = selected
    ? { table: selected }
    : ranQuery != null
      ? { query: ranQuery }
      : undefined;
  const detail = useConsole<DatabaseData>("database", DB_EMPTY, detailParams);

  const selectTable = (name: string) => {
    setRanQuery(null);
    setSelected(name);
  };
  const run = () => {
    const q = query.trim();
    if (!q) return;
    setSelected(null);
    setRanQuery(q);
  };

  return (
    <>
      <PaneHeader title="Database" state={list.state} onReload={list.reload} />
      <div className="flex min-h-0 flex-1">
        {/* table list */}
        <aside className="flex w-52 shrink-0 flex-col border-r border-border">
          <p className="t-caption px-3 pb-1 pt-3">Tables</p>
          <ul className="min-h-0 flex-1 overflow-auto px-1.5 pb-2">
            {list.data.tables.length === 0 ? (
              <li className="px-2 py-2 text-xs text-muted-foreground">
                {list.state === "loading" ? "Loading…" : "No tables yet"}
              </li>
            ) : (
              list.data.tables.map((t) => {
                const key = `${t.schema}.${t.name}`;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => selectTable(key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        selected === key
                          ? "bg-muted font-medium"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                      )}
                    >
                      <Table2 className="size-3.5 shrink-0" />
                      <span className="min-w-0 flex-1 truncate font-mono">{t.name}</span>
                      {typeof t.rows === "number" && (
                        <span className="shrink-0 font-mono text-[0.65rem] text-muted-foreground/60">
                          {t.rows}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* browse / query */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start gap-2 border-b border-border p-3">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") run();
              }}
              placeholder="select * from …  (read-only)"
              spellCheck={false}
              rows={2}
              className="min-h-0 flex-1 resize-none rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs outline-none focus-visible:border-ring"
            />
            <Button size="xs" onClick={run} disabled={!query.trim()}>
              <Play className="size-3.5" />
              Run
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {selected == null && ranQuery == null ? (
              <EmptyState
                icon={Database}
                title="Select a table to browse"
                hint="Pick a table on the left, or run a read-only query above."
              />
            ) : (
              <DataGrid rows={detail.data.rows ?? []} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Migrations (wired) */

const MIGRATIONS_EMPTY: MigrationsData = { migrations: [] };

function MigrationsPanel() {
  const { data, state, reload } = useConsole<MigrationsData>("migrations", MIGRATIONS_EMPTY);
  return (
    <>
      <PaneHeader title="Migrations" state={state} onReload={reload} />
      <div className="min-h-0 flex-1 overflow-auto">
        {data.migrations.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title="No migrations yet"
            hint="Schema changes the Engineer applies show up here as an ordered history."
          />
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr>
                <th className="border-b border-border px-4 py-2 font-medium text-muted-foreground">
                  Version
                </th>
                <th className="border-b border-border px-4 py-2 font-medium text-muted-foreground">
                  Name
                </th>
              </tr>
            </thead>
            <tbody>
              {data.migrations.map((m) => (
                <tr key={m.version} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="px-4 py-2 font-mono text-muted-foreground">{m.version}</td>
                  <td className="px-4 py-2 font-mono">{m.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Secrets (wired) */

const SECRETS_EMPTY: SecretsData = {};

function SecretsPanel() {
  const { data, state, reload } = useConsole<SecretsData>("secrets", SECRETS_EMPTY);
  const secretSet = (data.secretKeyState ?? "").toLowerCase() === "set";
  return (
    <>
      <PaneHeader title="Secrets" state={state} onReload={reload}>
        <KeyAction
          icon={KeyRound}
          onClick={async () => {
            if (!window.confirm("Rotate the project's secret key? Anything using the old key stops working.")) return;
            if (await consoleAct("rotate-secret")) {
              toast.success("Secret key rotated.");
              reload();
            }
          }}
        >
          {secretSet ? "Rotate secret key" : "Generate secret key"}
        </KeyAction>
      </PaneHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <CopyField label="Project URL" value={data.projectUrl} />
        <CopyField label="Publishable key (anon)" value={data.publishableKey} />
        <div className="flex flex-col gap-1">
          <span className="t-caption">Secret key</span>
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {secretSet
                ? "A secret key is set — brokered server-side, never shown."
                : "No secret key set."}
            </span>
            <span
              className={cn(
                "ml-auto rounded px-1.5 py-0.5 font-mono text-[0.65rem] uppercase",
                secretSet ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted",
              )}
            >
              {data.secretKeyState ?? "unset"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Storage (shape + empty) */

const STORAGE_EMPTY: StorageData = { buckets: [] };

function StoragePanel() {
  const { data, state, reload } = useConsole<StorageData>("storage", STORAGE_EMPTY);
  return (
    <>
      <PaneHeader title="Storage" state={state} onReload={reload}>
        <KeyAction
          icon={Plus}
          onClick={async () => {
            const name = window.prompt("Bucket name:")?.trim();
            if (!name) return;
            if (await consoleAct("create-bucket", { name })) {
              toast.success(`Bucket "${name}" created.`);
              reload();
            }
          }}
        >
          New bucket
        </KeyAction>
      </PaneHeader>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {data.buckets.length === 0 ? (
          <EmptyState icon={HardDrive} title="No storage buckets" hint="Create a bucket to store files." />
        ) : (
          <ul className="space-y-1">
            {data.buckets.map((b) => (
              <li
                key={b.id ?? b.name}
                className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2"
              >
                <HardDrive className="size-4 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-mono text-sm">{b.name}</span>
                {b.public && (
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.65rem] uppercase text-muted-foreground">
                    public
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Authentication (shape + empty) */

const AUTH_EMPTY: AuthData = { settings: {}, redirectUrls: [], providers: [] };

function AuthPanel() {
  const { data, state, reload } = useConsole<AuthData>("auth", AUTH_EMPTY);
  const settingEntries = Object.entries(data.settings ?? {});
  return (
    <>
      <PaneHeader title="Authentication" state={state} onReload={reload}>
        <KeyAction
          icon={Plus}
          onClick={async () => {
            const url = window.prompt("Redirect URL to allow (https://…):")?.trim();
            if (!url) return;
            if (await consoleAct("add-redirect", { url })) {
              toast.success("Redirect URL added.");
              reload();
            }
          }}
        >
          Add redirect URL
        </KeyAction>
      </PaneHeader>
      <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
        <section>
          <p className="t-caption pb-2">Settings</p>
          {settingEntries.length === 0 ? (
            <p className="text-xs text-muted-foreground">No settings loaded.</p>
          ) : (
            <ul className="space-y-1">
              {settingEntries.map(([k, v]) => (
                <li
                  key={k}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  <span className="font-mono text-muted-foreground">{k}</span>
                  <span className="font-mono">{cell(v)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="t-caption pb-2">Redirect URLs</p>
          {data.redirectUrls.length === 0 ? (
            <p className="text-xs text-muted-foreground">No redirect URLs configured.</p>
          ) : (
            <ul className="space-y-1">
              {data.redirectUrls.map((u) => (
                <li
                  key={u}
                  className="truncate rounded-md border border-border px-3 py-1.5 font-mono text-xs"
                >
                  {u}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="t-caption pb-2">Providers</p>
          {data.providers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No providers configured.</p>
          ) : (
            <ul className="space-y-1">
              {data.providers.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs"
                >
                  <span className="font-medium capitalize">{p.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[0.65rem] uppercase",
                      p.enabled
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.enabled ? "on" : "off"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Users (shape + empty) */

const USERS_EMPTY: UsersData = { count: 0, recent: [] };

function UsersPanel() {
  const { data, state, reload } = useConsole<UsersData>("users", USERS_EMPTY);
  return (
    <>
      <PaneHeader title="Users" state={state} onReload={reload}>
        <KeyAction
          icon={Plus}
          onClick={async () => {
            const email = window.prompt("New user's email:")?.trim();
            if (!email) return;
            if (await consoleAct("add-user", { email })) {
              toast.success(`User ${email} added.`);
              reload();
            }
          }}
        >
          Add user
        </KeyAction>
      </PaneHeader>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mb-4 inline-flex flex-col rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="t-caption">Total users</span>
          <span className="t-num text-2xl font-semibold">{data.count}</span>
        </div>

        <p className="t-caption pb-2">Recent</p>
        {data.recent.length === 0 ? (
          <EmptyState icon={Users} title="No users yet" hint="Signups to the shared project appear here." />
        ) : (
          <table className="w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr>
                <th className="border-b border-border px-3 py-2 font-medium text-muted-foreground">
                  Email
                </th>
                <th className="border-b border-border px-3 py-2 font-medium text-muted-foreground">
                  Provider
                </th>
                <th className="border-b border-border px-3 py-2 font-medium text-muted-foreground">
                  Created
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((u, i) => (
                <tr key={u.id ?? i} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2 font-mono">{u.email ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{u.provider ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{u.createdAt ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Logs (shape + empty) */

const LOGS_EMPTY: LogsData = { logs: [] };

function LogsPanel() {
  const { data, state, reload } = useConsole<LogsData>("logs", LOGS_EMPTY);
  return (
    <>
      <PaneHeader title="Logs" state={state} onReload={reload} />
      <div className="min-h-0 flex-1 overflow-auto">
        {data.logs.length === 0 ? (
          <EmptyState icon={ScrollText} title="No logs found" hint="Function and edge logs will stream here." />
        ) : (
          <ul className="divide-y divide-border/60 font-mono text-xs">
            {data.logs.map((l, i) => (
              <li key={l.id ?? i} className="flex items-start gap-2 px-3 py-1.5 hover:bg-muted/40">
                {l.level && <LevelBadge level={l.level} />}
                <span className="shrink-0 text-muted-foreground/60">{l.timestamp}</span>
                <span className="min-w-0 flex-1 break-all">{l.event_message ?? l.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Suggestions (shape + empty) */

const SUGGESTIONS_EMPTY: { advisors: Advisor[] } = { advisors: [] };

function SuggestionsPanel() {
  const { data, state, reload } = useConsole("suggestions", SUGGESTIONS_EMPTY);
  return (
    <>
      <PaneHeader title="Suggestions" state={state} onReload={reload} />
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {data.advisors.length === 0 ? (
          <EmptyState
            icon={CircleAlert}
            title="No suggestions right now"
            hint="Security and performance advisors (unused index, RLS with no policy) surface here."
          />
        ) : (
          <ul className="space-y-2">
            {data.advisors.map((a, i) => (
              <li key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <LevelBadge level={a.level} />
                  <span className="text-sm font-medium">{a.title}</span>
                  <span className="ml-auto font-mono text-[0.65rem] uppercase text-muted-foreground/60">
                    {a.category}
                  </span>
                </div>
                {a.detail && <p className="mt-1.5 text-xs text-muted-foreground">{a.detail}</p>}
                <div className="mt-2 flex gap-1.5">
                  <KeyAction icon={Check} todo>
                    Apply
                  </KeyAction>
                  <KeyAction icon={CircleAlert} todo>
                    Dismiss
                  </KeyAction>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
