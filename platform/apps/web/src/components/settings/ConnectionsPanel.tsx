"use client";

import * as React from "react";
import { Check, Loader2, Plug, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Connections — BYO connect (token-paste MVP). Three rows (GitHub, Vercel, Supabase): each
 * shows connected / not-connected, reveals a password paste on Connect, and offers Disconnect
 * when connected. Talks ONLY to the same-origin proxy routes under `/api/connect/*` (which
 * resolve the session org server-side — the browser never sends an orgId). The owner connects
 * their OWN GitHub + Vercel + Supabase; the Engineer then builds every department's sites into
 * that one shared Supabase project (canvas.md "the backend"). Used in Settings + onboarding.
 *
 * Contract (proxy → apps/api):
 *   GET    /api/connect/status                                → { github, vercel, supabase }
 *   POST   /api/connect/github   { token }                    → { ok, login? } | { error }
 *   POST   /api/connect/vercel   { token, teamId? }           → { ok } | { error }
 *   POST   /api/connect/supabase { projectRef, serviceKey }   → { ok } | { error }
 *   DELETE /api/connect/github|vercel|supabase                → { ok }
 */

type Provider = "github" | "vercel" | "supabase";

interface Status {
  github: boolean;
  vercel: boolean;
  supabase: boolean;
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

/** Supabase lightning mark — lucide dropped brand icons. */
function SupabaseMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13.2 1.3c.6-.75 1.8-.34 1.8.62V9.5h5.9c1.02 0 1.6 1.18.96 1.98l-8.06 10.2c-.6.76-1.82.35-1.82-.61V14H6.1c-1.02 0-1.6-1.18-.96-1.98L13.2 1.3Z" />
    </svg>
  );
}

/**
 * A field on a provider's connect form. `primary` fields render as a password; `text` fields
 * render as plain text. Ordered by the array in each provider; the payload key is what apps/api
 * expects. A field with `required` gates the Save button.
 */
interface Field {
  payloadKey: string;
  kind: "primary" | "text";
  label: string;
  placeholder: string;
  required?: boolean;
}

interface ProviderDef {
  key: Provider;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  hint: React.ReactNode;
  tokenUrl: string;
  /** Ordered fields shown on the connect form. The first is auto-focused. */
  fields: Field[];
  /** Phase-2 install flow (byo-connect): when set, the PRIMARY affordance is this install
   * link (the provider's own consent/install screen) and token-paste demotes to a fallback. */
  installHref?: string;
  installLabel?: string;
}

const PROVIDERS: ProviderDef[] = [
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
    tokenUrl: "https://github.com/settings/tokens/new?scopes=repo&description=Lu",
    fields: [{ payloadKey: "token", kind: "primary", label: "personal access token", placeholder: "ghp_…", required: true }],
    installHref: "/api/connect/github/start",
    installLabel: "Install the GitHub App",
  },
  {
    key: "vercel",
    label: "Vercel",
    icon: VercelMark,
    hint: <>Account Settings → Tokens → Create Token, then paste it here.</>,
    tokenUrl: "https://vercel.com/account/tokens",
    fields: [
      { payloadKey: "token", kind: "primary", label: "access token", placeholder: "Vercel access token", required: true },
      { payloadKey: "teamId", kind: "text", label: "Team ID", placeholder: "Team ID (optional — leave blank for personal account)" },
    ],
    installHref: "/api/connect/vercel/start",
    installLabel: "Install the Vercel Integration",
  },
  {
    key: "supabase",
    label: "Supabase",
    icon: SupabaseMark,
    hint: (
      <>
        Project Settings → API. Copy the <span className="font-medium">project ref</span> (in the Project URL) and the{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.7rem]">service_role</code> secret key.
      </>
    ),
    tokenUrl: "https://supabase.com/dashboard/project/_/settings/api",
    fields: [
      { payloadKey: "projectRef", kind: "text", label: "Project ref", placeholder: "Project ref (e.g. abcdwxyzmnop…)", required: true },
      { payloadKey: "serviceKey", kind: "primary", label: "service-role key", placeholder: "service_role key (eyJ…)", required: true },
    ],
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
      setStatus({
        github: Boolean(data.github),
        vercel: Boolean(data.vercel),
        supabase: Boolean(data.supabase),
      });
    } catch {
      setStatus({ github: false, vercel: false, supabase: false });
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const connect = async (provider: Provider, values: Record<string, string>) => {
    setBusy(provider);
    setErrors((e) => ({ ...e, [provider]: undefined }));
    try {
      const res = await fetch(`/api/connect/${provider}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; login?: string; error?: string };
      if (!res.ok || !data.ok) {
        setErrors((e) => ({ ...e, [provider]: data.error || "Couldn't connect — check the details and try again." }));
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
          onConnect={(values) => connect(p.key, values)}
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
  provider: ProviderDef;
  connected: boolean;
  login?: string;
  loading: boolean;
  busy: boolean;
  open: boolean;
  error?: string;
  onToggle: () => void;
  onConnect: (values: Record<string, string>) => void;
  onDisconnect: () => void;
}) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const Icon = provider.icon;

  const missingRequired = provider.fields.some((f) => f.required && !(values[f.payloadKey] ?? "").trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (missingRequired || busy) return;
    const payload: Record<string, string> = {};
    for (const f of provider.fields) {
      const v = (values[f.payloadKey] ?? "").trim();
      if (v) payload[f.payloadKey] = v;
    }
    onConnect(payload);
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
        ) : provider.installHref ? (
          // Phase-2 install (byo-connect): the provider's OWN consent screen is the primary
          // path — one click, no tokens to hunt down. Paste stays as the quiet fallback below.
          <Button size="sm" nativeButton={false} render={<a href={provider.installHref} />}>
            <Plug className="size-3.5" /> {provider.installLabel ?? `Connect ${provider.label}`}
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

      {/* The paste fallback toggle, only for install-first providers. */}
      {!loading && !connected && provider.installHref && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-1.5 pl-12 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {open ? "Hide token paste" : "…or paste a token instead"}
        </button>
      )}

      {open && !connected && (
        <form onSubmit={submit} className="mt-3 flex flex-col gap-2 pl-12">
          {provider.fields.map((f, i) => (
            <div key={f.payloadKey} className="flex flex-col gap-1.5">
              <Label htmlFor={`${provider.key}-${f.payloadKey}`} className="text-xs text-muted-foreground">
                Paste your {provider.label} {f.label}
              </Label>
              {f.kind === "primary" ? (
                <div className="flex gap-2">
                  <Input
                    id={`${provider.key}-${f.payloadKey}`}
                    type="password"
                    autoComplete="off"
                    autoFocus={i === 0}
                    value={values[f.payloadKey] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.payloadKey]: e.target.value }))}
                    placeholder={f.placeholder}
                    aria-invalid={!!error}
                  />
                  {/* Save sits next to the password field when it's last; else a standalone Save renders below */}
                  {i === provider.fields.length - 1 && (
                    <Button type="submit" size="sm" disabled={missingRequired || busy}>
                      {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                    </Button>
                  )}
                </div>
              ) : (
                <Input
                  id={`${provider.key}-${f.payloadKey}`}
                  type="text"
                  autoComplete="off"
                  autoFocus={i === 0}
                  value={values[f.payloadKey] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.payloadKey]: e.target.value }))}
                  placeholder={f.placeholder}
                  aria-invalid={!!error}
                />
              )}
            </div>
          ))}
          {/* If the last field isn't the password (e.g. an optional text field trails it), give Save its own row */}
          {provider.fields[provider.fields.length - 1]?.kind !== "primary" && (
            <Button type="submit" size="sm" className="self-start" disabled={missingRequired || busy}>
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
            </Button>
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
