# TODO: channel-aware sequential intake (before the open-ended agent)

> Parked while we do the demo. This is the real fix for the "Sarah re-asks the same
> true/false thing" problem. It is NOT a prompt tweak — it's a deterministic step.

## The problem
Leaving the key true/false determinations (is-this-an-estimate, is-homeowner) to the
open-ended agent doesn't work — it re-asks, rewords, and meanders. Prompt-stacking has
failed repeatedly. We need specific, deterministic actions for these steps.

## The design: two phases

**Phase 1 — Intake (deterministic + sequential).** A short scripted sequence, chosen
BY CHANNEL. Each step sends ONE fixed message and captures ONE specific answer
(value/boolean). Code decides what's next. The agent does NOT run here.

**Phase 2 — Open (the current agent).** Only after intake resolves do we hand off to
today's tool-using Sarah for the flexible part (project details, address, times,
booking, escalation).

## Intake steps, per channel

**Missed call** (we know nothing):
1. Reason — fixed msg: "sorry we missed your call, how can we help?" → capture reply →
   classify: `estimate` / `existing_customer` / `other`.
   - `existing_customer` or `other` → fire escalate action, done.
   - `estimate` → continue.
2. Homeowner — fixed msg: "are you the homeowner, or the person who'd approve the
   work?" → resolve to true/false.
   - false → deterministic owner-handoff step (ask name + number).
3. → hand to the agent (project details, address, booking).

**Email / website lead** (estimate already known):
1. Skip the reason step.
2. Homeowner step (same).
3. → hand to the agent.

Different channel = different step list. That's the flexibility.

## How a true/false step resolves (the part that isn't "prompt")
Each answer runs through ONE focused classifier — a single dedicated call whose only
job is: does this reply mean yes / no / unclear? Returns an enum; CODE branches on it.
Not the conversational agent, not stacked instructions. `unclear` → re-ask once in
plainer words, then default. (Zero-model alternative: keyword rules — brittle on odd
phrasings. Recommendation: the focused classifier.)

## What it changes (when we build it)
- A small intake state machine in `handleInbound` that runs before the agent, keyed off
  the existing `conversation.state` + channel.
- A focused yes/no + intent classifier function.
- The agent prompt LOSES the ownership/intent-asking duty (handled in intake); the agent
  only runs in the open phase.

## Open decisions to confirm before building
1. Missed-call step list = `reason → homeowner → agent`?
2. Make homeowner a deterministic step too (strong rec — it's the one that keeps
   breaking), or only the intent triage?
3. Focused classifier vs pure keyword rules for the yes/no?
