# Lu Computer — Manifesto

> The why, in one page. The full argument — the target architecture, its rationale, failure semantics, and
> threat model — is the research paper: **[paper.md](./paper.md)**. Everything in this repo cascades from it:
> paper (theory) → this manifesto (why) → [FOUNDATION.md](./FOUNDATION.md) (what we're building) →
> [docs/harness-spec.md](./docs/harness-spec.md) (how, substrate by substrate) →
> [DEVELOPMENT.md](./DEVELOPMENT.md) (where we are). Money: [BUSINESS.md](./BUSINESS.md) · Order:
> [ROADMAP.md](./ROADMAP.md).

## AI that codes is not AI that operates

The agents everyone uses today — Claude Code, Cursor — proved that a model can interleave reasoning with
real execution. But they run as a synchronous session on *your* laptop, with *one* model, *your* secrets in
the environment, and *you* in the loop as the system's middleware: pasting credentials, repairing the
environment, stitching artifacts together, babysitting the terminal so the run doesn't die when the lid
closes.

That's a structural ceiling, not a model limitation. An output (code that was written) is not an outcome
(a thing that verifiably works, live). Crossing from one to the other is an **infrastructure** problem —
and the infrastructure is what the paper specifies:

- a **control plane** that turns a goal into a plan the owner approves, then into tasks agents execute;
- **ephemeral sandboxes** for the work, **durable journaled state** for the workflow — containers die,
  executions survive;
- **memory** that outlives any session, and **credentials** brokered per task instead of sprayed into a shell;
- **many models**, routed by what each task actually needs — never one model doing everything;
- and an **empirical verification loop**: the system proves its work in the live environment before it
  claims success.

## The bet

Lu is that harness, built deliberately as a *harness* — we compose proven substrates (e2b sandboxes,
durable queues, Postgres, the model providers) and contribute the layer none of them provide: the
schemas, lifecycle, and control loop that bind them into a system that pursues goals.

We begin in **engineering** because it is the one domain where the loop already closes — code is
verifiable, so the system can check its own work end to end. The kernel is domain-general; departments
beyond Engineering are the same pattern with different tools ([ROADMAP.md](./ROADMAP.md)).

We build for **technical founders and small teams (≤10)**, into **their own accounts** — Lu is hosted,
but what agents build lands in the customer's GitHub/Vercel/Supabase, owned and paid for by them
([FOUNDATION.md §7](./FOUNDATION.md)).

## The human's new job

When the system is the continuous executor — planning, building, verifying, and asking only at the
gates that matter — the human stops being the terminal supervisor and becomes what they were always best
used as: **the systems architect**. You state intent and set constraints; the computer does the work.

*Cursor made you a faster developer. Lu makes the computer the developer.*
