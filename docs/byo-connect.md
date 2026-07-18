# BYO connect — customers bring their own GitHub / Vercel / Supabase

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md) §7.

Each org connects its **own** providers so the Engineer builds into **their** accounts (which they own and
pay for), replacing the dogfood single-token setup. Cross-refs: [building-agents.md](./building-agents.md) §4
(the Engineer, the consumer of these ports) and [DEVELOPMENT.md](../DEVELOPMENT.md) ("BYO connect").

## What's shipped — token-paste MVP

Connect is a **paste-a-token** flow today. Routes: `apps/api/src/routes/connect.ts`; encryption:
`apps/api/src/crypto/tokens.ts`. Each `POST /api/connect/{provider}` **verifies** the pasted token against
the provider's API, then stores it **AES-256-GCM encrypted at rest** (`v1:<iv>:<tag>:<ciphertext>`, key =
`CALENDAR_TOKEN_KEY`; store getters decrypt on read).

| Provider | Endpoint | Paste | Verified by |
|---|---|---|---|
| **GitHub** | `POST /api/connect/github` | a classic **PAT with `repo` scope** | Octokit `GET /user` |
| **Vercel** | `POST /api/connect/vercel` | an access token (+ optional `teamId`) | `GET /v2/user` |
| **Supabase** | `POST /api/connect/supabase` | `projectRef` + `serviceKey` (+ optional management token) | Management API `GET /v1/projects/{ref}`, else project auth-admin |

Each provider also has a `DELETE /api/connect/{provider}` (idempotent) and a shared
`GET /api/connect/status?orgId=` → `{ github, vercel, supabase }`.

## Org-scoped ports

The `git` and `deploy` ports are **org-scoped**: `getGitForOrg(store, orgId)` / `getDeployForOrg(store, orgId)`
resolve that org's stored token and bind it; if the org has no connection, they **fall back to the env token**
(the dogfood path stays working). The Engineer's tools already carry `ctx.orgId`, so the tool bodies are
unchanged (`apps/api/src/agent/engineeringTools.ts`).

## Dispatch gate

The Engineer is only dispatchable once **GitHub AND Vercel** are connected (`orgHasConnections` in
`apps/api/src/connect/status.ts`). **Supabase is excluded from the gate** — a site needs a repo + hosting; a
DB is opt-in.

## Data model (`packages/db`)

The schema **already has** all three tables — `GithubConnection`, `VercelConnection`, `SupabaseConnection` —
each `orgId`-indexed with encrypted secret columns (`userToken` / `accessToken` / `serviceKey` +
`managementToken`). No table needs adding.

**Supabase is console-view-only today.** The stored `serviceKey` is **never handed to the build sandbox** and
is **not part of the build pipeline** — it backs read-only console views (config / migrations / advisors). A
build that needs a DB is Phase 2.

## Known gaps

- **No `@@unique([orgId])`** on the connection tables → the `findFirst → create` upsert is non-atomic, so
  concurrent connects can leave duplicate / stale tokens.
- **No token expiry / refresh / rotation** — a pasted token lives until manually replaced.
- **The raw PAT is injected into the e2b sandbox** as `GITHUB_TOKEN` (`apps/api/src/sandbox/e2b.ts`) — no
  scoped, short-lived installation token yet.

## Phase 2 — connect through THEIR apps (spec'd 2026-07-18, not built)

Replace paste-a-token with each provider's real install flow. The store shape + org-scoped ports stay;
what changes: the connect routes (each gains `/start` + `/callback`), the ConnectCard rows (buttons →
provider consent screens, token-paste kept behind a "paste a token instead" fallback link), and GitHub's
token minting. The dock card's 15s status poll flips rows to Connected when the popup closes.

**GitHub — a GitHub App** ✅ *(BUILT + LIVE 2026-07-18 — the security win too, harness-spec §3 P1)*:
the "lu.computer" App (id 4328962, slug `lu-computer`) is registered; the api mints 1-hour repo-scoped
installation tokens (`git/githubApp.ts`, App JWT, per-install cache); `getGitForOrg` prefers the
installation over the pasted PAT; `POST /api/connect/github` accepts `{installationId}` (verified by
minting); web `/api/connect/github/{start,callback}` drive the install; the ConnectionsPanel GitHub row
leads with "Install the GitHub App", paste demoted to fallback. NOTE: the App is currently
**private** ("Only on this account") — flip to public (app settings → Advanced → Make public) before a
design partner connects. Original design notes:
- Register the "Lu Computer" App once (repo permissions: **Contents R/W · Pull requests R/W ·
  Administration R/W** for repo creation; webhook off for now; public app, direct install link — no
  marketplace listing needed).
- Flow: Connect → `github.com/apps/{slug}/installations/new` → the owner picks account + repos →
  redirect back with `installation_id` → stored in the **existing** `GithubConnection.installationId`.
- Tokens: the server mints **installation access tokens** (App JWT from `GITHUB_APP_PRIVATE_KEY` →
  `POST /app/installations/{id}/access_tokens`) — **1-hour, repo-scoped**. `installationToken()` in the
  Git port finally does what its name says; sandboxes stop receiving a forever-PAT. Repos are created
  in the installed account (the template is public, so `createUsingTemplate` works).
- Env: `GITHUB_APP_ID` / `GITHUB_APP_SLUG` / `GITHUB_APP_PRIVATE_KEY` (+ client id/secret only if we
  also want user-level OAuth during install).

**Vercel — an Integration**
- Create in the Integrations Console; keep it **unlisted** (direct install URL). Scopes: projects +
  deployments + domains.
- Flow: Connect → Vercel's install screen (they pick the team) → redirect with `code` +
  `configurationId` + `teamId` → exchange at `api.vercel.com/v2/oauth/access_token` (client id/secret)
  → store in the existing `VercelConnection.accessToken/teamId`. Tokens live until the owner removes
  the integration. The Deploy port is unchanged.
- Env: `VERCEL_CLIENT_ID` / `VERCEL_CLIENT_SECRET` / `VERCEL_REDIRECT_URI`.

**Supabase — an OAuth app (Management API)** ✅ *(BUILT 2026-07-18 — dormant until the OAuth app is registered + env set)*:
`connect/supabaseOAuth.ts` (authorize URL · code exchange · refresh · list projects · fetch service key ·
`validManagementToken` auto-refreshes); `SupabaseConnection` gained `refreshToken`/`expiresAt` + nullable
`serviceKey` (migration `20260718140000`); connect route handles `{code}` (exchange → auto-select if one
project) and `{projectRef}` (select → fetch key); web `/api/connect/supabase/{start,callback,projects}`;
ConnectionsPanel leads with "Connect Supabase" and shows a project picker when authorized-but-unpicked.
Env: `SUPABASE_OAUTH_CLIENT_ID` (api+web) · `SUPABASE_OAUTH_CLIENT_SECRET` (api). Original design notes:
- Register in the Supabase dashboard (org settings → OAuth Apps). Authorization-code flow:
  `api.supabase.com/v1/oauth/authorize` → owner approves org access → callback `code` → exchange at
  `/v1/oauth/token` → **access token + refresh token** (these EXPIRE — unlike the other two).
- Post-connect: list their projects via the Management API and let the owner PICK one (replaces pasting
  a project ref); fetch the project's keys on demand (`GET /v1/projects/{ref}/api-keys`) instead of
  storing a pasted service key.
- Schema: two additive columns on `SupabaseConnection` (`refreshToken`, `expiresAt`) + a refresh step in
  the console/broker path.
- Env: `SUPABASE_OAUTH_CLIENT_ID` / `SUPABASE_OAUTH_CLIENT_SECRET` / `SUPABASE_OAUTH_REDIRECT_URI`.

**Prerequisites only the owner-of-the-platform can do:** the three registrations (GitHub App · Vercel
Integration · Supabase OAuth app) — ~10 min of dashboard forms each, producing the client ids/secrets
above. Everything else is code. Build order: **GitHub App → Vercel → Supabase**.
