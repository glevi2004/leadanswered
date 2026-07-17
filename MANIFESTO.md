# Lu Computer — Manifesto

## The problem

Writing code stopped being the hard part. Code was the **first knowledge work AI mastered** — because it's
*verifiable* (it compiles or it doesn't; the test passes or it doesn't), *abundant* (every commit that ever
fixed a bug is training data), and *fast* (write → run → error → fix in seconds, no human in the loop).
Cursor and Claude Code will type it for you now.

But typing was never where the work was — **"Engineering" was never one job.** Shipping software means
**planning** it, writing a **spec**, choosing an **architecture**, modeling the **database**, designing the
**frontend**, building the **backend**, **testing** that it actually works, managing **secrets** and
**environments**, **deploying** it, then **monitoring** it and fixing it at 2am — every one a discipline with
its own process, the kind a real company hires an architect, a DBA, backend and frontend engineers, a
designer, QA, and DevOps to run. AI made the *typing* fast and left the founder doing **all the other jobs,
alone.** That's operating software, and no tool removed it — it made you a faster developer and left you the
operator.

And the moment you want software to *act on its own* — send the email, chase the invoice, answer the
customer — you're back to hand-wiring Zapier and n8n: drag nodes, glue credentials, babysit. Fragile,
technical, still not autonomous.

## The shift

Every tool so far kept the same **shape: an assistant in your editor.** Autocomplete guessed the next token;
Copilot, the next block; Cursor made multi-file changes and ran commands. Each was a real jump — and each
made *you* a faster developer. But you stayed the system: the architect, the tester, the one who deploys and
gets paged. A faster typist is still doing all twelve jobs alone.

The unlock isn't a smarter assistant — it's a different **shape**. The loop **closes** when four things exist
at once: **a goal** you state, **a manager** that turns it into a plan and orchestrates the work, **a team**
of specialist agents that each own a discipline and hold the real tools to *do* it, and **verification** —
the machine runs the code, tests it, and feeds the result back, checking its own work. (The same
verifiability that made code fall to AI is exactly what lets the loop close.) You command; agents build,
test, ship, and run — you only step in to approve what's irreversible.

But agents can only close that loop if they can actually *act* — and a model, on its own, can't. It reasons
in a chat window; it can't run code, keep state, or reach your accounts. Real work takes real infrastructure:
somewhere in the cloud to run, memory of what you're building, and genuine ways to act — deploy to a URL,
open your repo, reach your data.

**So we built agents a computer. That's Lu.**

## What Lu is

> Claude Code lives in your editor and helps you type. Lu owns everything *around* the code — it provisions
> the infra, ships to a real URL in your own accounts, and keeps it running overnight. **The editor is a
> tool; Lu is the computer.**

"Computer" is the *shape* of the product — a canvas, a cloud terminal, files, programs (agents), channels.
What's real about it is not a metaphor: real code in a real sandbox, real software at a real URL, a real
phone number. It puts together three things:

**A body — it can act.** A screen (the canvas), a shell (a cloud terminal), files (the Library + the
Context that learns your stack and how you work), and real channels: **deploy**, plus a **phone**, an
**inbox**, and **Slack**. Its agents reach the world — ship the site, run the migration, answer the text.

**A cloud that never sleeps.** Give an agent a build tonight; it works while you sleep and you wake to a
shipped PR. Runs are durable — they keep going, wait for your approval, and resume, for hours. It lives in
the cloud, reachable by your whole team.

**A composable mind.** Agents are programs you wire together on the canvas — no glue code. Any agent runs
any model (Claude for the engineer, Grok for the CFO). Any agent can spawn and direct other agents, and
drive a live terminal. Lu runs the top; every agent can run the ones beneath it — an orchestrator that owns
an opinionated **roadmap** and drives you through it, not a dispatcher that just routes tasks.

## Who it's for

**Technical founders and small software teams (up to ~10).** People who already pay an AI to write code and
are tired of being the operator around it. They have their own GitHub, Vercel, and Supabase — so Lu builds
*into their accounts*, and it feels like hiring the rest of the company rather than renting a sandbox.

We start narrow on purpose. Lu goes a mile deep on the one job that already works — **build and ship
software** — instead of an inch deep across everything.

## The expansion

The core is general, but we earn breadth; we don't claim it. Lu lands on **Engineering** — the agent that
builds and ships — and grows outward one department at a time (Support, Finance, Sales, …), each following
the same pattern. As the agents arrive, the buyer widens from the technical founder to the whole company,
and the pitch turns from *"ship your software"* into *"run your company."* That's the destination, not the
opening line.

**North star: Cursor made you a faster developer. Lu makes the computer the developer.**

## The bet

The company of the near future is not a team operating software. It is a founder and a computer full of
agents that build, ship, and run the work — that you reach by text, email, and Slack, and that keep working
while you sleep. **Lu Computer is that computer.**

## What's true today

Honesty over hype. Live now: the canvas, the cloud terminal, the orchestrator, approvals, and the
**Engineering agent end to end** — it writes real code in a real e2b sandbox and ships to a real URL —
plus **BYO connect** (your own GitHub/Vercel, token-paste today) and the **durable worker** (built; it
activates when Redis is configured). Still ahead: **one-click OAuth** connect, the **channels**
(phone/email/Slack), and the departments beyond Engineering. See [ROADMAP.md](./ROADMAP.md) (the order) and
[DEVELOPMENT.md](./DEVELOPMENT.md) (the live status tracker) for shipped-vs-next.

---

*Canon: [FOUNDATION.md](./FOUNDATION.md) (how it's built) · [DEVELOPMENT.md](./DEVELOPMENT.md) (where we
are) · [BUSINESS.md](./BUSINESS.md) (how it makes money) · [ROADMAP.md](./ROADMAP.md) (where it's going) ·
[docs/building-agents.md](./docs/building-agents.md) (how we build agents).*
