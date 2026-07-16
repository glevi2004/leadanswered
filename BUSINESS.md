# Lu Computer — Business Model

> Why: [MANIFESTO.md](./MANIFESTO.md) · How: [FOUNDATION.md](./FOUNDATION.md) · Next:
> [ROADMAP.md](./ROADMAP.md).

## What we sell

**The AI-native computer** — a workspace where agents do real work: a *body* of channels (screen, shell,
phone, inbox, Slack, deploy), a *cloud that never sleeps* (durable overnight runs), and a *composable
multi-model mind* (agents that orchestrate agents). It's layered: a general kernel + **presets**
(Business, Studio/Dev, Personal, Custom). We sell access to the computer **and the agent-work it does**.

## Who pays

- **Front door — Business (B2B).** A company points Lu at its operations and it runs. Where the money is.
- **Dogfood — Studio/Dev.** Coding agents; our own daily driver ("we build Lu with Lu").
- **Funnel — Personal / solo.** Cheap entry, one operator.

**Why B2B:** willingness to pay (a business tolerates real monthly spend; a consumer caps low and churns);
retention (the longer Lu runs, the more each Context knows how you work — the moat); expansion (usage
scales with the business).

## How we charge

**A monthly fee that *is* an included usage bucket, plus overage. Seatless.** Price-matched to cofounder:

| Tier | Price | Included | For |
|---|---|---|---|
| **Trial** | Free 7 days | ~$10 usage | funnel |
| **Pro** | **$20/mo** | $20 usage + overage | solo operator · real publish |
| **Team** | **$50/mo** | $50 usage + overage | multiplayer · SOC 2 · priority · all presets |
| **Enterprise** | custom | usage order form | SSO/SOC 2 · custom presets · managed hosting option |

The metered unit is the **agent-hour** (~15 min of agent work). **Where the B2B money is: overage +
Enterprise (land-and-expand), not the sticker** — a company running agents all day blows through its
bucket and pays usage.

## What it costs us — why the margin is clean

Because what agents build runs on the **customer's own infra** (BYO — [FOUNDATION §7](./FOUNDATION.md)),
**we are not the payer-of-record for hosting or databases.** Our COGS is only:

- **Agent compute** — model tokens + ephemeral e2b sandboxes, metered as agent-hours and covered by the
  bucket/overage.
- **The Lu product** — a cheap multi-tenant SaaS (fixed, tiny).

We hold margin by design: **ephemeral + hibernating sandboxes**, **model-routing** (cheap models for
routine steps), and **free = preview-only** (no standing infra). We never bleed on idle tenants because
**we don't host them.** *(Destination: an optional Lu-managed hosting tier, always metered so it pays for
itself.)*

## The competitive frame (2026)

| Product | Shape | Price |
|---|---|---|
| **cofounder.co** (our price anchor) | fee = usage bucket + overage | $20 / $50 |
| **Cursor** (our ambition) | seat + usage pools | $32–96/seat |
| **Devin** (autonomous eng) | seat + ACU meter | ~$2/ACU |

Everyone doing real, compute-heavy agent work converged on **fee + metered usage**. **Match cofounder on
price, chase Cursor on ambition, make the money B2B via overage + Enterprise.**
