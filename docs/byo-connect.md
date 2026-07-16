# BYO connect — customers bring their own GitHub / Vercel / Supabase

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md) §7 and
> [DEVELOPMENT.md](../DEVELOPMENT.md). This is the productization that replaces the dogfood single-token
> setup: the Engineer builds into the **customer's own** accounts, which they own and pay for.

## The shape

Each org connects its own providers once; the Engineer then builds into **their** accounts:

| Provider | Primitive | Per-org secret we store | Needed for |
|---|---|---|---|
| **GitHub** | a **GitHub App** the org installs (+ user-auth token) | `installationId` / user token | every build (the repo) |
| **Vercel** | a **Vercel Integration** (OAuth) | `accessToken` + `teamId` | every build (hosting) |
| **Supabase** | Supabase **OAuth** (Management API) | `accessToken` + `orgRef` | apps with a backend — **phase 2** |

We start with **GitHub + Vercel** (a site needs those). Supabase is phase 2 (when a build needs a DB).

## Data model (`packages/db`)

- **`GithubConnection`** already exists (unused) — repurpose: `orgId`, `installationId`, `accountLogin`,
  encrypted `userToken?`. One per org.
- **Add `VercelConnection`** — `orgId`, encrypted `accessToken`, `teamId?`, `vercelUserId?`. One per org.
- Tokens are **encrypted at rest** with the existing AES-256-GCM helper (the one guarding Google-calendar
  tokens — `CALENDAR_TOKEN_KEY`). Additive migration; dev-validate first.

## The flows (routes on the web app, session-scoped)

1. **Connect GitHub** → redirect to the App's install/authorize URL → GitHub calls back to
   `/connect/github/callback` → we resolve the session org, exchange for the installation (+ user token),
   store a `GithubConnection`, redirect back to the canvas.
2. **Connect Vercel** → redirect to the Vercel OAuth URL → callback to `/connect/vercel/callback` →
   exchange `code` for an access token + team → store a `VercelConnection`.
3. **Connect UI** — a step in onboarding + a Settings → Connections panel: two buttons, each showing
   connected / not-connected. The Engineer is only dispatchable once GitHub + Vercel are connected.

## Port swap (the mechanical core)

The `git` and `deploy` ports become **org-scoped**: `getGit(orgId)` / `getDeploy(orgId)` resolve that org's
connection and bind the token; if no connection exists, fall back to the env token (the dogfood path stays
working). `resolveEngineeringDeps(deps, orgId)` threads the orgId through, and the Engineer's tools already
carry `ctx.orgId`. No change to the tool bodies.

## What you register (the two apps) — the unblock

**GitHub App** — github.com/settings/apps/new:
- Name **Lu** (or Lu Computer); Homepage = your app URL.
- Repository permissions: **Administration: Read & write** (create repos), **Contents: Read & write**,
  **Pull requests: Read & write**. Metadata: read.
- Enable **"Request user authorization (OAuth) during installation."**
- "Where can it be installed": **Any account.**
- Generate a **private key** (.pem). Note the **App ID**, **Client ID**, **Client secret**.
- → send me: App ID, Client ID, Client secret, the private key. (Callback URL: I'll give you the exact one
  as I wire the route — GitHub lets you add it after creation.)
- Env: `GITHUB_APP_ID`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_PRIVATE_KEY`.

**Vercel Integration** — vercel.com/integrations/console → Create:
- Name **Lu**; developer/OAuth type.
- Note the **Client ID** + **Client secret**. (Redirect URL: I'll give it to you as I wire the route.)
- Env: `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`.

## Build order

1. Data model (`GithubConnection` repurpose + `VercelConnection`) + encryption. *(no secrets needed)*
2. Org-scoped `git` + `deploy` ports (per-org token, env fallback). *(no secrets needed)*
3. The connect routes + callbacks (needs the app client ids/secrets).
4. The connect UI (onboarding + Settings).
5. Gate Engineer dispatch on "GitHub + Vercel connected."
6. Phase 2: Supabase connect + the Data port.
