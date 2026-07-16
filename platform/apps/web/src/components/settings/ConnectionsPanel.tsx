"use client";

import * as React from "react";
import { Check, Loader2, Plug, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Connections — BYO connect (token-paste MVP). Two rows (GitHub, Vercel): each shows
 * connected / not-connected, reveals a password token-paste on Connect, and offers
 * Disconnect when connected. Talks ONLY to the same-origin proxy routes under
 * `/api/connect/*` (which resolve the session org server-side — the browser never sends
 * an orgId). The owner connects their OWN GitHub + Vercel; the Engineer then builds into
 * their accounts. Used in Settings and surfaced in onboarding.
 *
 * Contract (proxy → apps/api):
 *   GET    /api/connect/status          → { github, vercel }
 *   POST   /api/connect/github { token } → { ok, login? } | { error }
 *   POST   /api/connect/vercel { token, teamId? } → { ok } | { error }
 *   DELETE /api/connect/github|vercel    → { ok }
 */

type Provider = "github" | "vercel";

interface Status {
  github: boolean;
  vercel: boolean;
}

/** GitHub octocat mark — lucide dropped brand icons (see FacebookMark in OnboardingSketch). */
function GithubMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.75.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.31-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z" />
    </svg>
  );
}

/** Vercel triangle mark — lucide dropped brand icons. */
function VercelMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2 22 20H2L12 2Z" />
    </svg>
  );
}

const PROVIDERS: {
  key: Provider;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: React.ReactNode;
  placeholder: string;
  tokenUrl: string;
}[] = [
  {
    key: "github",
    label: "GitHub",
    icon: GithubMark,
    hint: (
      <>
        Settings → Developer settings → Personal access tokens (classic). Create one with the{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">repo</code> scope.
      </>
    ),
    placeholder: "ghp_…",
    tokenUrl: "https://github.com/settings/tokens/new?scopes=repo&description=Lu",
  },
  {
    key: "vercel",
    label: "Vercel",
    icon: VercelMark,
    hint: <>Account Settings → Tokens → Create Token, then paste it here.</>,
    placeholder: "Vercel access token",
    tokenUrl: "https://vercel.com/account/tokens",
  },
];

export function ConnectionsPanel({ className }: { className?: string }) {
  const [status, setStatus] = React.useState<Status | null>(null);
  const [logins, setLogins] = React.useState<Partial<Record<Provider, string>>>({});
  const [open, setOpen] = React.useState<Provider | null>(null);
  const [busy, setBusy] = React.useState<Provider | null>(null);
  const [errors, setErrors] = React.useState<Partial<Record<Provider, string>>>({});

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/connect/status", { cache: "no-store" });
      const data = (await res.json()) as Partial<Status>;
      setStatus({ github: Boolean(data.github), vercel: Boolean(data.vercel) });
    } catch {
      setStatus({ github: false, vercel: false });
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = async (provider: Provider, token: string, teamId?: string) => {
    setBusy(provider);
    setErrors((e) => ({ ...e, [provider]: undefined }));
    try {
      const res = await fetch(`/api/connect/${provider}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          provider === "vercel" ? { token, ...(teamId ? { teamId } : {}) } : { token },
        ),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; login?: string; error?: string };
      if (!res.ok || !data.ok) {
        setErrors((e) => ({ ...e, [provider]: data.error || "Couldn't connect — check the token and try again." }));
        return;
      }
      if (data.login) setLogins((l) => ({ ...l, [provider]: data.login }));
      setOpen(null);
      await refresh();
    } catch {
      setErrors((e) => ({ ...e, [provider]: "Something went wrong. Please try again." }));
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (provider: Provider) => {
    setBusy(provider);
    setErrors((e) => ({ ...e, [provider]: undefined }));
    try {
      const res = await fetch(`/api/connect/${provider}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErrors((e) => ({ ...e, [provider]: data.error || "Couldn't disconnect. Please try again." }));
        return;
      }
      setLogins((l) => ({ ...l, [provider]: undefined }));
      await refresh();
    } catch {
      setErrors((e) => ({ ...e, [provider]: "Something went wrong. Please try again." }));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={cn("divide-y divide-border/60", className)}>
      {PROVIDERS.map((p) => (
        <ProviderRow
          key={p.key}
          provider={p}
          connected={status?.[p.key] ?? false}
          login={logins[p.key]}
          loading={status === null}
          busy={busy === p.key}
          open={open === p.key}
          error={errors[p.key]}
          onToggle={() => {
            setErrors((e) => ({ ...e, [p.key]: undefined }));
            setOpen((o) => (o === p.key ? null : p.key));
          }}
          onConnect={(token, teamId) => connect(p.key, token, teamId)}
          onDisconnect={() => disconnect(p.key)}
        />
      ))}
    </div>
  );
}

function ProviderRow({
  provider,
  connected,
  login,
  loading,
  busy,
  open,
  error,
  onToggle,
  onConnect,
  onDisconnect,
}: {
  provider: (typeof PROVIDERS)[number];
  connected: boolean;
  login?: string;
  loading: boolean;
  busy: boolean;
  open: boolean;
  error?: string;
  onToggle: () => void;
  onConnect: (token: string, teamId?: string) => void;
  onDisconnect: () => void;
}) {
  const [token, setToken] = React.useState("");
  const [teamId, setTeamId] = React.useState("");
  const Icon = provider.icon;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim() || busy) return;
    onConnect(token.trim(), teamId.trim() || undefined);
  };

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{provider.label}</p>
          {loading ? (
            <p className="text-xs text-muted-foreground">Checking…</p>
          ) : connected ? (
            <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
              <Check className="size-3.5" /> Connected{login ? ` · ${login}` : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Not connected</p>
          )}
        </div>
        {loading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : connected ? (
          <Button variant="ghost" size="sm" onClick={onDisconnect} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Disconnect"}
          </Button>
        ) : (
          <Button variant={open ? "ghost" : "outline"} size="sm" onClick={onToggle} disabled={busy}>
            {open ? (
              <>
                <X className="size-3.5" /> Cancel
              </>
            ) : (
              <>
                <Plug className="size-3.5" /> Connect
              </>
            )}
          </Button>
        )}
      </div>

      {open && !connected && (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2 pl-12">
          <Label htmlFor={`${provider.key}-token`} className="text-xs text-muted-foreground">
            Paste your {provider.label} token
          </Label>
          <div className="flex gap-2">
            <Input
              id={`${provider.key}-token`}
              type="password"
              autoComplete="off"
              autoFocus
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={provider.placeholder}
              aria-invalid={!!error}
            />
            <Button type="submit" size="sm" disabled={!token.trim() || busy}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
            </Button>
          </div>
          {provider.key === "vercel" && (
            <Input
              type="text"
              autoComplete="off"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Team ID (optional — leave blank for personal account)"
            />
          )}
          <p className="text-xs text-muted-foreground">
            {provider.hint}{" "}
            <a href={provider.tokenUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
              Open {provider.label}
            </a>
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </form>
      )}

      {error && (!open || connected) && <p className="mt-2 pl-12 text-xs text-destructive">{error}</p>}
    </div>
  );
}
