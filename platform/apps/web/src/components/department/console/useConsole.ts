"use client";

import * as React from "react";

/**
 * CLIENT-side reader for the Database-view console. Each tab reads its same-origin Next proxy
 * under `/api/console/*` — which resolves the session org and forwards to apps/api — so the
 * browser never touches Railway and never handles an orgId. Every read degrades to an honest
 * fallback (no-org, network error, non-2xx) so a tab renders its empty state, never throws.
 * Unlike the dock this does NOT poll: the console is a browse surface, read once per tab open
 * (with a manual reload).
 */

/** GET /api/console/overview → connection state of the shared Supabase project. */
export interface Overview {
  connected: boolean;
  projectRef?: string;
  projectUrl?: string;
}

export interface TableRef {
  schema: string;
  name: string;
  rows?: number;
}

/** GET /api/console/database (+ ?table= | ?query=) → schema mirror + optional row browse. */
export interface DatabaseData {
  schemas: string[];
  tables: TableRef[];
  rows?: Record<string, unknown>[];
}

export interface Migration {
  version: string;
  name: string;
}

/** GET /api/console/migrations */
export interface MigrationsData {
  migrations: Migration[];
}

export interface Bucket {
  id?: string;
  name: string;
  public?: boolean;
  createdAt?: string;
}

/** GET /api/console/storage */
export interface StorageData {
  buckets: Bucket[];
}

export interface AuthProvider {
  name: string;
  enabled?: boolean;
}

/** GET /api/console/auth */
export interface AuthData {
  settings: Record<string, unknown>;
  redirectUrls: string[];
  providers: AuthProvider[];
}

export interface UserRow {
  id?: string;
  email?: string;
  provider?: string;
  createdAt?: string;
  lastSignInAt?: string;
}

/** GET /api/console/users */
export interface UsersData {
  count: number;
  recent: UserRow[];
  series?: { date: string; count: number }[];
}

/** GET /api/console/secrets — the secret key itself is brokered, only its state is returned. */
export interface SecretsData {
  projectUrl?: string;
  publishableKey?: string;
  secretKeyState?: string;
}

export interface LogRow {
  id?: string;
  timestamp?: string;
  level?: string;
  message?: string;
  event_message?: string;
}

/** GET /api/console/logs */
export interface LogsData {
  logs: LogRow[];
}

export interface Advisor {
  title: string;
  level: string;
  category: string;
  detail?: string;
}

/** GET /api/console/suggestions */
export interface SuggestionsData {
  advisors: Advisor[];
}

export type LoadState = "loading" | "ready" | "error";

/**
 * Read a console tab once (and on `params` change / manual reload). Keeps `fallback` as the
 * value across a failure so the panel always has a well-shaped object to render.
 */
export function useConsole<T>(
  tab: string,
  fallback: T,
  params?: Record<string, string>,
): { data: T; state: LoadState; reload: () => void } {
  const [data, setData] = React.useState<T>(fallback);
  const [state, setState] = React.useState<LoadState>("loading");
  const qs =
    params && Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : "";

  const load = React.useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/console/${tab}${qs}`, { cache: "no-store" });
      if (!res.ok) {
        setData(fallback);
        setState("error");
        return;
      }
      setData((await res.json()) as T);
      setState("ready");
    } catch {
      setData(fallback);
      setState("error");
    }
    // fallback is a stable module-scope constant; excluding it keeps this callback stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, qs]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return { data, state, reload: load };
}

/** Render any cell value as a string for the read-only data grid. */
export function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
