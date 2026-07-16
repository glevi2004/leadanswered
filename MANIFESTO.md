# Lu Computer — Manifesto

## The thesis

Making a computer do something real has always meant development — and development has always been the
bottleneck. To ship a product, run an operation, or automate a process, someone had to *build* it: write
the code, wire the services, host it, operate it. Slow, expert-only, and it ended in **inert code someone
still had to run**.

Every tool we invented just sped up producing that artifact. Frameworks, no-code, Cursor — faster
keystrokes, same shape: you are still the builder, and still the operator.

And when people tried to make software *act on its own* — send the email, chase the invoice, move the
data — they hit the worst of it: **hand-wired workflows**. n8n, Zapier, Make. Drag a node, connect an
API, define a trigger, glue a credential. Fragile, technical, and *still not autonomous* — just a rigid
machine you programmed by hand.

**Agents end that.** They don't autocomplete — they *build, run, and operate*. You prompt, and the agent
composes the automation itself and spawns other agents to do the parts. The plumbing layer evaporates.
What's left is a new kind of development: **you command, and it builds and runs — for real.**

But an agent that does real work isn't just a model. It needs an orchestrator to direct it, memory,
tools, and real I/O to touch the world — an email to send from, a phone to answer, a place to deploy,
connections to your data. Those things, together, are a **computer**.

**Agents need a computer to do real work. So we built them one. That's Lu.**

## What it is

Lu Computer is a real computer for AI agents — and it puts together three things no one else does:

**A body.** Real faculties and real channels: a **screen** (the canvas), a **shell** (a cloud terminal you
can open), a **filesystem** (the Library + the Context that remembers how you work), and real I/O — a
**phone** number, an **inbox**, and **Slack** — so you reach the computer where you already are, and its
agents reach the world: send the mail, answer the text, post to the channel, ship to a domain. Not a
chatbot behind a form — an operator with hands.

**A cloud that never sleeps.** Give the Engineer a task tonight; it works while you sleep, and you wake to
a full timeline of what it did. Runs are durable — they survive, resume, and wait for your approval, for
hours. It's a cloud, not a box on your desk: reachable anywhere, by your whole team.

**A composable mind.** Agents are programs you compose on the fly. Any agent can run any model — Grok as
your CFO, Claude for the Engineer. Any agent can spawn and orchestrate other agents — the CFO spins up a
terminal and directs it. You wire them on the canvas by drawing the connection; no middleware, no glue.
Lu conducts the top; every agent can conduct beneath it.

A body, a cloud that never sleeps, and a mind that composes itself. **You command; it builds and runs.**

## One computer, many shapes

The **kernel** is general — a canvas, **Lu** the orchestrator, and agents with real machines and real
channels. On top, **presets** boot the computer for a use, each arriving with a Lu-generated **roadmap**
its agents work down:

- **Business** *(the front door)* — department agents run your company.
- **Studio / Dev** — a fleet of coding agents build and ship software. *It's how we build Lu with Lu.*
- **Personal** — your own agents for your own work.
- **→ Custom** — compose your own agents, wire your own channels.

Start from a preset and reshape it however you like — a dev tool, an automation tool, a business OS, or
whatever you point it at. Presets become a shareable library over time.

**The north star:** *Cursor made you a faster developer. Lu makes the computer the developer.*

## Why now

- **Agents crossed from assist to do.** They write software, hold conversations, operate machines, send
  mail and messages — they finish jobs, not keystrokes.
- **The plumbing era is ending.** You no longer wire workflows; you prompt, and the intelligence composes
  them — and composes the agents that run them.
- **Managed cloud makes it real and cheap.** Sandboxes, hosting, and databases are rentable primitives — a
  computer for agents is *orchestration over managed infra*, not a datacenter.

## The principles

1. **Agents do, dashboards don't.** The unit of value is a job finished, not a screen to operate.
2. **A real body.** Screen, shell, phone, inbox, Slack, deploy — agents act on the world with real I/O and
   real infrastructure. No mockups, no theater.
3. **Command, don't wire.** You compose agents and automations by prompting and drawing connections — the
   plumbing is the machine's job, not yours.
4. **You stay in command.** Agents propose; you approve what matters — spending, shipping, sending. Staged,
   legible, never a surprise.
5. **One computer, many shapes.** Boot it as a business, a studio, or your own thing; the longer it runs,
   the more its Context knows how *you* work.

## Who it's for

Anyone with work to be done and no wish to become a software operator — or a workflow engineer. We **lead
with business**: an owner points Lu at their operations and the back office simply *runs*, because that's
where the leverage and willingness to pay are clearest. We **dogfood with Dev** (we build Lu with Lu), and
open the computer to personal and custom uses as it matures.

## The bet

The company of the near future is not a team operating software. It is a founder and a computer full of
agents that do the work — that you reach by text, email, and Slack, and that keep working while you sleep.
**Lu Computer is that computer.**

---

*Canon: [FOUNDATION.md](./FOUNDATION.md) (how it's built) · [BUSINESS.md](./BUSINESS.md) (how it makes
money) · [ROADMAP.md](./ROADMAP.md) (where it's going).*
