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

## Phase 2 — real OAuth (not built)

The roadmap target (nothing below is built): replace paste-a-token with proper installs, keeping the same
store shape + org-scoped ports so **only the connect routes change**.

- **GitHub App** — an installable App (user-to-server OAuth during install + minted **installation tokens**
  for repo ops, in place of the raw PAT). Register at github.com/settings/apps/new; env
  `GITHUB_APP_ID` / `GITHUB_APP_CLIENT_ID` / `GITHUB_APP_CLIENT_SECRET` / `GITHUB_APP_PRIVATE_KEY`.
- **Vercel Integration** — an OAuth Integration (vercel.com/integrations/console); env
  `VERCEL_CLIENT_ID` / `VERCEL_CLIENT_SECRET`.
- **Supabase** — **Management-API OAuth** in place of the pasted management token / service key, plus wiring
  the brokered secret into the build pipeline (the console-only → build-capable step).
