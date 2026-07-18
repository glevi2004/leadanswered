# Lu Computer — the company

> Why Lu exists, what it is, and how it makes money — one file. The theory is the paper
> ([paper.md](./paper.md)); how the machine works is [docs/system.md](./docs/system.md); what the user
> experiences is [docs/product.md](./docs/product.md); what we're doing next is
> [DEVELOPMENT.md](./DEVELOPMENT.md).

## Why — AI that codes is not AI that operates

Claude Code and Cursor proved a model can interleave reasoning with real execution. But they run as a
synchronous session on *your* laptop, with *your* secrets in the environment and *you* as the system's
middleware — pasting credentials, stitching artifacts, babysitting the terminal. That's a structural
ceiling, not a model limitation: an output (code that was written) is not an outcome (a thing that
verifiably works, live).

Crossing that gap is an **infrastructure** problem, and the infrastructure is what the paper specifies: a
control plane that turns a goal into an owner-approved plan and then into tasks; ephemeral sandboxes for
the work and durable journaled state for the workflow; memory that outlives any session; credentials
brokered per task; many models routed by need; and an empirical verification loop — the system proves its
work in the live environment before it claims success.

**The bet:** Lu is that harness, built deliberately as a *harness* — we compose proven substrates (e2b,
BullMQ, Postgres, the model providers, the GitHub/Vercel/Supabase APIs) and contribute only the layer none
of them provide: the schemas, lifecycle, and control loop that bind them into a system that pursues goals.
We begin in **engineering** because it's the one domain where the loop already closes — code is
verifiable — and the kernel is domain-general: every later department is the same pattern with different
tools.

When the system is the continuous executor, the human stops being the terminal supervisor and becomes the
**systems architect**: you state intent and set constraints; the computer does the work.

*Cursor made you a faster developer. Lu makes the computer the developer.*

## What — a workspace where AI agents do real work

The owner boots their company in onboarding, then works on the **canvas** — Lu at the center, departments
(each an agent, rendered as its own app) around her, resources (terminal · note · file · site) connected by
edges — with the **Lu dock** (chat + command) wrapped around it. The feel is one thing: **you talk to Lu,
she replies with cards**, and anything irreversible waits for your approval.

Live today: the canvas, the dock, the cloud terminal, the Engineering department end-to-end (plan → build
in a sandbox → PR → preview → verify → publish), onboarding, approvals, metering, memory. On the roadmap:
the other departments, the phone/email channels, presets beyond Business.

### The stack

Monorepo under `platform/` (pnpm workspace):

| Package | Role | Runs on |
|---|---|---|
| `apps/web` | Next.js — onboarding, canvas, dock, department surfaces | Vercel (`leadanswered-web` → app.lu.computer) |
| `apps/api` + worker | Express/TS — the agent runtime, routes, durable worker, terminal ws | Railway |
| `packages/db` | Prisma 7 schema + client | Supabase Postgres |
| `packages/core` | The multi-provider model gateway | — |
| `landing-page/` | Marketing site (Astro) | Vercel (`leadanswered` → lu.computer) |

Auth is Supabase (cookie sessions; a session maps to an `Organization` by owner email). The browser calls
same-origin Next routes that proxy to the api with a shared secret and resolve the org server-side; the
cloud terminal is the one direct `wss://` exception. Pushes to `main` auto-deploy **both** Railway (api)
and Vercel (web).

### Where what agents build lives — BYO by default

Three cost layers, and we are payer-of-record for only the first two:

- **Our product** — the web/api/DB above. A cheap multi-tenant SaaS.
- **Agent compute** — ephemeral e2b sandboxes + model tokens, metered per task (the agent-hour). Never a
  24/7 box.
- **What agents build → the customer's OWN accounts.** Lu connects their GitHub / Vercel / Supabase
  through each provider's real install flow and builds into *their* accounts; they own it and pay those
  bills directly. Zero hosting cost or risk to us. An optional Lu-managed + metered hosting tier is the
  at-scale destination, not v1.

## Money

**What we sell:** the computer around the code. Editors write code; Lu does everything else — plans,
builds, verifies, deploys, runs the database, keeps working overnight — and reports back in one
conversation.

**Who pays, in order:** technical founders and small software teams (≤10) first — they already pay an AI
to write code, already own their accounts, and are sick of operating everything around it. Ourselves
second — we build Lu with Lu, so the product and the demo are the same artifact. Then expansion: as
departments ship past Engineering, the account grows from "ship my software" to "run my company."

**How we charge:** a monthly fee that *is* an included usage bucket, plus overage. Seatless. BYO is the
cheap default (we host nothing of theirs); Managed is the step-up tier later.

| Tier | Price | Included | For |
|---|---|---|---|
| Trial | free 7 days | ~$10 usage | funnel |
| Pro | $20/mo | $20 usage + overage | solo technical founder |
| Team | $50/mo | $50 usage + overage | teams ≤10 |
| Enterprise | custom | usage order form | SSO · managed hosting |

The money is in overage + Managed + department expansion, not the sticker. Margin holds by design:
ephemeral sandboxes, model routing (cheap models for routine steps), free tier = preview-only, and on BYO
we simply don't host the customer's infra.

**The competitive frame (2026):** Claude Code / Cursor are who our buyer pays today — the wedge. Devin is
the autonomy comparison but sells to enterprise engineering teams; we sell to founders building from zero,
rent the coding agent (Claude Code *is* the engine, swappable), and own the company loop + BYO ownership.
cofounder.co is the price anchor and the expansion-phase rival: it goes an inch deep across eight
departments; Lu enters where the technical buyer already trusts agents, goes a mile deep, and expands out.

## Locked conventions

- Vocabulary is vertical-neutral: the tenant is an **Organization**, the person is the **owner**.
- The assistant is **Lu** (legacy `Sarah`/`leadanswered` strings are tracked debt).
- Agents reach the world only through **ports**; agents reach data only through the **Store**.
- Sandbox = e2b behind the port (swappable); coding agent = the owner's choice, headless in the sandbox.
- Humans gate the irreversible: plan approval, publish, migrations.
- Additive migrations only against prod; dev-validate first.
- **Ship one department fully, then dogfood it to build the next.**
