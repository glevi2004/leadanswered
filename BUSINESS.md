# Lu Computer — Business Model

> Why: [MANIFESTO.md](./MANIFESTO.md) · How: [FOUNDATION.md](./FOUNDATION.md) · Next:
> [ROADMAP.md](./ROADMAP.md).

## What we sell

**The computer around the code.** Cursor and Claude Code write the code; Lu does everything else — the
infra, the deploy, the database, the running service — and keeps it alive overnight. It's a *body* of
channels (screen, shell, deploy, phone, inbox, Slack), a *cloud that never sleeps* (durable overnight
runs), and a *composable multi-model mind* (agents that orchestrate agents behind an opinionated roadmap).
We sell access to the computer **and the agent-work it does**.

## Who pays

- **Front door — technical founders & small software teams (≤10).** They already pay an AI to write code,
  they already own their GitHub/Vercel/Supabase, and they're sick of operating the stuff around it. This is
  who we sell to first, because it's the one job Lu already does end to end.
- **Dogfood — ourselves.** We build Lu with Lu; the Engineering agent is our daily driver, so the product
  and the demo are the same artifact.
- **Expansion — the rest of the company.** As agents ship past Engineering (Support, Finance, …), the
  account grows from "ship my software" into "run my company," and the buyer widens with it.

**Why this ICP:** proven willingness to pay (they *already* spend on Cursor/Claude Code/Devin — we're not
inventing the budget); natural BYO (they have the accounts, so "build into your own infra" is a feature,
not a chore); and land-and-expand (every new department is upsell into an account that already trusts us).
The durable money is the expansion phase — the longer Lu runs, the more each Context knows the stack, and
the more of the company it operates.

## How we charge

**A monthly fee that *is* an included usage bucket, plus overage. Seatless.** Two ways to buy, as a ladder
— BYO is the cheap default, Managed is the step up:

| | What | Posture | Who pays for what agents build |
|---|---|---|---|
| **BYO** *(default)* | agents build into *your* GitHub/Vercel/Supabase | **undercut** the anchor | the customer, directly |
| **Managed** *(step up)* | Lu fronts the infra and bills it through usage | **match** the anchor | Lu, metered |

Tiers (Managed posture shown; BYO sits below it because we carry no hosting):

| Tier | Price | Included | For |
|---|---|---|---|
| **Trial** | Free 7 days | ~$10 usage | funnel |
| **Pro** | **$20/mo** | $20 usage + overage | solo technical founder · real publish |
| **Team** | **$50/mo** | $50 usage + overage | teams ≤10 · multiplayer · SOC 2 · priority |
| **Enterprise** | custom | usage order form | SSO/SOC 2 · managed hosting · custom roadmaps |

The metered unit is the **agent-hour** (~15 min of agent work). **Where the money is: overage + Managed +
expansion into more departments — not the sticker.** A team running build agents all day blows through its
bucket and pays usage; the base fee is the on-ramp, not the revenue.

## What it costs us — why the margin is genuinely better

This is our one real economic edge over the anchor, and it comes straight from BYO
([FOUNDATION §7](./FOUNDATION.md)): **on BYO we are not the payer-of-record for hosting, databases, or
domains** — the customer's own accounts are. Cofounder hosts what its agents build; we don't. So at the
*same* price we keep more, and we can also offer the BYO tier *below* the anchor and still be healthy.

Our COGS is only:

- **Agent compute** — model tokens + ephemeral e2b sandboxes, metered as agent-hours, covered by the
  bucket/overage.
- **The Lu product** — a cheap multi-tenant SaaS (fixed, tiny).

We hold margin by design: **ephemeral + hibernating sandboxes**, **model-routing** (cheap models for
routine steps), and **free = preview-only** (no standing infra). We never bleed on idle tenants because on
BYO **we don't host them** — and Managed only ever runs metered, so it pays for itself.

## The competitive frame (2026)

Our ICP already lives in the developer-agent market, so that's the frame — with cofounder as the *price*
anchor, not the shape anchor:

| Product | Shape | Price | To us |
|---|---|---|---|
| **Claude Code / Cursor** | in-editor coding agent (seat + usage) | $20–96/seat | who our buyer pays **today** — the wedge is against them |
| **Devin** | autonomous eng (seat + ACU meter) | ~$2/ACU | the autonomy comp |
| **cofounder.co** | run-a-company agents (fee = usage bucket + overage) | $20 / $50 seatless | our **price anchor** + the expansion-phase rival |
| **Lindy · Zapier AI · Relay** | ops/workflow agents | various | *expansion-phase* comps — not the front door |

**The line:** the editor tools stop at the code; cofounder starts at "incorporate my company" and goes an
inch deep across eight departments. Lu enters where the technical buyer already trusts agents — building
and shipping — goes a mile deep there, and expands outward. **Undercut on BYO, match cofounder on Managed,
beat the editor tools on scope, make the money on overage + expansion.**
