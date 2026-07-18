# DEVELOPMENT — the TODO

> The one file that answers **"what are we doing next?"** Everything else: [paper.md](./paper.md) (theory)
> · [COMPANY.md](./COMPANY.md) (why/what/money) · [docs/system.md](./docs/system.md) (the machine) ·
> [docs/product.md](./docs/product.md) (the experience) · [docs/design-system.md](./docs/design-system.md)
> (the look).

## How we work

- **NOW holds exactly one task**, defined by the outcomes it must produce — observable results, not
  intentions — and "done when" checks we verify before touching anything else.
- **NEXT holds at most 5**, each with a one-line outcome. **LATER** is a parking lot; no detail allowed.
- Nothing gets built that isn't the NOW task. Finishing NOW = verify its outcomes, update the docs it
  touched, promote one thing from NEXT.
- Always check the code before claiming status — docs describe the repo, the repo doesn't describe the docs.

---

## NOW — Skills become files; docs become the Library

The heart of the harness is markdown playbooks Lu follows, and the documents she produces must live
somewhere the owner can always find. Today the onboarding playbook is a string inside TypeScript, it ends
too early (at department activation), and the Business Plan is never seen again after its chat moment.

**Outcomes:**

1. **Skills are real `.md` files.** `apps/api/src/agent/skills/*.md` (name/description frontmatter),
   loaded from disk by the registry; `onboarding.md` is the first. Adding a skill = adding a file — no
   TypeScript change.
2. **The onboarding playbook runs to first value.** Five stages: learn the company → Business Plan →
   connect the stack (Lu drives the connect cards) → system architecture (a Library doc, approved like a
   plan) → first build. The org's current stage is in Lu's situational block, so she resumes mid-way after
   any reload. Onboarding ends when the owner has **shipped something**, not when a form is filled.
3. **The Library shows company documents.** The dock Library tab (and Company) lists org docs — Business
   Plan, architecture, decisions, migrations — from the artifact rows that already exist. Each opens a
   full page; **Ask Lu to revise** prefills the composer. Everything follows one-object-three-sizes
   (card in chat → row in Library → page).

**Done when:** a fresh org can be walked from sign-up to a shipped first build entirely by the playbook;
the Business Plan is findable in the Library after a reload; dropping a new `.md` into `skills/` registers
it with zero code changes.

**Status (2026-07-18): BUILT — awaiting the live walkthrough.** Skills load from real `.md` files
(drop-in registration verified in dev AND against the compiled dist); the five-stage playbook +
COMPANY SETUP stage line are injected until the org ships; `draft_doc` + the `approve_doc` gate exist;
the Library ships as preview cards (dock Library tab) + rows (Company) + a **Notion-style viewer** at
`/doc/[id]` (outline sidebar from headings, last-updated, Ask-Lu-to-revise, the approve gate inline) +
the chat card for a doc awaiting approval. Remaining before this checks off: the fresh-org live
walkthrough (sign-up → shipped first build, driven by the playbook).

## NEXT

1. **Design-partner unblock** — GitHub App public · Vercel Integration public/unlisted · regenerate the
   two chat-exposed OAuth secrets (Vercel Integration + Supabase) · stop seeding platform keys into user
   terminals. *Outcome: a stranger's org can connect all three providers and no platform secret is
   reachable from their session.*
2. **Canvas grants become real** — ＋-menu notes/files create backing Artifacts (`refId`); content
   persists server-side. *Outcome: a note connected `reads` to the Engineer actually appears in its build
   context and survives reload.*
3. **Slack goes live** — Levi registers the Slack app (manifest ready); set `SLACK_*` env; live pass.
   *Outcome: DM Lu in Slack → plan → Approve button → build → Publish button → live, no web UI touched.*
4. **Verification screenshots** — Playwright in the sandbox captures the preview; evidence thumbnails on
   the task page. *Outcome: every verify verdict carries visual proof.*
5. **Railway deploy adapter** — second `Deploy`-port adapter for long-running servers Lu builds.
   *Outcome: a customer app that needs a worker/server deploys somewhere real.* (Parked until a build
   needs it.)

## LATER

Re-planning (plan v2 on failed verification) · pgvector memory + AST code index · `Task.model` threading +
registry-driven coding model · usage-bucket enforcement on every entry point · Flux/Higgsfield image
models · watch-the-build (terminal attached to the build sandbox pty) · Revert All rollback endpoint ·
departments beyond Engineering · phone + email channels · presets beyond Business · Sarah→Lu rename +
landing-page rewrite · prebuilt e2b template · per-task credential scopes + egress allowlists · managed
hosting tier · xAI/Grok in the gateway.

---

## Shipped (compressed — details in git history)

- **2026-07-18 — the dogfood ladder**: Task Detail page (`/task/[id]`) + card/row/page unification · live
  workspace (working agents, real Request-changes/Retry, wired console actions) · GitHub sandbox-token
  downscoping + branch protection · existing-project import + repo profiles · empirical verification
  (preview fetch + repo tests in sandbox, hard-gated) · Slack channel v1 (dormant) · Supabase build tools
  + the migration gate · web git-connected to Vercel (pushes auto-deploy everything) · API proxy auth ·
  stuck-task reaper · spawn/supervise ordered sub-agents · lu.computer domains.
- **2026-07-18 — BYO through their apps**: GitHub App + Vercel Integration + Supabase OAuth (refresh
  tokens, project picker), install-first connect UX, connect card in chat.
- **2026-07-17 — the flow layer**: AgentEvent journal · situational block · report-backs into the thread ·
  thread rehydration · plan gate + acceptance verification + publish code-gate · onboarding v2 (static
  sign-up + Lu onboards in-workspace) · the skill system (TS v1).
- **Earlier**: the agent runtime (orchestrator, Engineer, e2b, BullMQ durable worker — live), canvas +
  dock, metering + memory + consolidation, waitlist self-serve, model gateway + picker.
