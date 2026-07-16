# Lu Computer — Business Model

> Part of the Lu Computer canon — the *why* is [MANIFESTO.md](./MANIFESTO.md), the *how* is
> [FOUNDATION.md](./FOUNDATION.md), the *what next* is [ROADMAP.md](./ROADMAP.md).

## What we sell

**The AI-native computer** — an operating system where a fleet of agents does real work on real
infrastructure. It's layered: a general **kernel** (canvas + Lu the orchestrator + agents that each get
a real machine), **presets** that wire it for a use case (Business, Studio/Dev, Personal, → Custom), and
the freedom to reshape any preset. We sell access to the computer **and the agent-work it does**.

**North star:** *Cursor put one agent in your editor. Lu puts a company of them on your computer.*

## Who pays

- **Front door — the Business preset (B2B).** A company points Lu at its operations and the departments
  run. This is where the money is and where we lead.
- **Dogfood/wedge — the Studio/Dev preset.** A fleet of coding agents building software; our own daily
  driver ("we build Lu with Lu") and the sharpest *replace-Cursor* story.
- **Funnel — Personal/solo.** Cheap entry, a single operator, one preset.

**Why B2B is the money (and necessary, not just lucrative):**
- **Willingness to pay** — a business buying "the back office runs itself" tolerates real monthly spend;
  a consumer caps low and churns after one project.
- **Retention** — B2B embeds into operations (switching cost). The longer Lu runs, the more each
  department's **Context** knows how *you* work — that's the moat, and it compounds per account.
- **Expansion** — usage scales with the business, so revenue grows without raising the sticker (below).

## How we charge

**The model: a monthly fee that *is* an included agent-usage bucket, plus overage. Seatless.** The fee
buys agent-work; heavy use bills as overage; the biggest accounts move to Enterprise. This is the model
every compute-heavy agent product converged on — a platform fee **+** metered usage:

| Product | Shape |
|---|---|
| **cofounder.co** (our price anchor) | fee = usage bucket + overage |
| **Cursor** (our ambition) | seat + usage pools |
| **Devin** (autonomous eng) | seat + ACU meter (~$2/ACU ≈ 15 min agent work) |

Nobody survives on flat-only — model tokens + sandbox compute + deploys are real, variable COGS.

**The ladder — price-matched to cofounder:**

| Tier | Price | Included | For |
|---|---|---|---|
| **Trial** | Free 7 days | ~$10 usage | funnel |
| **Pro** | **$20/mo** | $20 usage + overage | solo operator · Business preset · real publish |
| **Team** | **$50/mo** | $50 usage + overage | multiplayer · SOC 2 · priority · all presets |
| **Enterprise** | custom | usage order form | BYO compute/keys · SSO/SOC 2 · custom presets — the whale tier |

**The metered unit is the agent-hour** (≈ 15 min of autonomous agent work, benchmarked to ~$2 COGS à la
Devin's ACU), surfaced to the user as usage/credits. The included bucket is always **denominated in our
real COGS** — that's what makes a $20 sticker margin-safe.

**Where the B2B money actually comes from: overage + Enterprise, not the sticker.** Cheap entry lands the
account; a company running agents all day blows through the bucket and pays usage; whales go Enterprise.
Land-and-expand — a better B2B motion than a high seat price, and it keeps us price-matched to cofounder.

## Margin discipline (unit economics)

Our COGS is the **same class** as cofounder's — both run coding agents and provision real infra
(Vercel/Supabase/domains/images). The *only* place we can out-cost them is the "computer" feel:
persistent machines + a cloud terminal you can open anytime. If those stay warm, that's continuous
metered compute. We hold margin by design:

- **Ephemeral by default** — spin a sandbox up for a task, tear it down when it finishes.
- **Hibernate, don't idle** — e2b sandboxes pause/resume; the terminal sleeps when you're not typing and
  resumes on reconnect. Never pay for an idle machine.
- **Model-route** — cheap models for routine steps, the expensive ones only for hard coding.
- **Bucket sized to COGS** — if $20 of "agent work" costs more than $20 to serve, the fix is the bucket
  sizing, not the sticker.

## The frame in one line

**Match cofounder on price ($20 / $50), chase Cursor on ambition (the AI-native computer, not an
editor), and make the money B2B through usage overage and Enterprise.**
