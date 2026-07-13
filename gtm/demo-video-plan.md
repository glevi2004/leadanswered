# Demo plan — Lead Answered

## The idea
A missed call becomes a booked roofing job. Live. The peak: the customer needs it urgent, Sarah won't promise that on her own, she asks the owner, the owner taps yes, she books it.

## What I can and can't plan
It's the live system. I only control **my inputs** — what I text as the customer, what I tap as the owner, and the account setup. **I do not script Sarah's replies.** So this plan is inputs + setup + how to film. Her words are live.

## The 4 moments
| Moment | I do this | I'm betting Sarah does this (live) |
|---|---|---|
| 1. Missed call | call the number, let it ring out | texts the customer back in seconds |
| 2. Details | "roof's leaking bad after the storm — 42 Maple St, Newton" | gets what she needs, confirms it's her area |
| 3. The ask (peak) | "it's pouring into my living room, can someone get out ASAP?" | won't promise urgent alone → asks the owner |
| 3b. Owner (browser) | I tap "prioritize him — first thing tomorrow" | relays it, moves to booking |
| 4. Book + ping | "great" → tap the time she offers | books tomorrow AM; owner's phone gets "new booking" |

## Why not "do you offer financing?"
You're right — escalating a *fact* makes her look dumb ("why doesn't it just know that?"). Escalation has to be a **decision only the human can make right then**. "Can someone come ASAP" is a dispatch call — she looks smart for asking. And the owner's answer sends them to a real slot, so the booking still works.

## This beat is the riskiest — it's live
She might not escalate on every run. Two things bias it: set the demo account's escalation topics to include "urgent / same-day requests," and make my message a clear emergency. Budget takes. If she just books it smoothly without asking, that's still a fine take — redo to get the peak.

## Build (small — a demo harness, not a feature)
1. **Owner thread → browser.** The owner's number is stuck, so deliver *that one thread* to the landing-page phone UI: a live stream of messages sent to the demo-owner number, and a reply box that injects a real inbound webhook — same engine, real path, not simulated.
2. **Demo account = Apex**, with open slots tomorrow morning, service area covering the address, escalation topics incl. urgent, one owner recipient on the demo number.
3. **Reset button** to wipe the demo lead between takes.
4. **Not Cal.com** — booking is our own availability grid + Postgres. (Your brief was off on this.)

## My lines (cue card — only my inputs)
1. [miss the call]
2. "roof started leaking bad after the storm. 42 Maple St, Newton"
3. "it's coming into the living room now, can someone get out ASAP?"
4. [owner tap] "prioritize him — first slot tomorrow morning"
5. "perfect"
6. [tap the time she offers]

## Film
- 16:9. iPhone left, browser phone right, same size.
- DND on both. Rename your contact "Customer" so your number's hidden. Close other threads, tabs, terminal.
- One warm-up run, then reset.
- 6–8 takes, keep the cleanest single run.
- Edit only trims the wait between real messages (typing dots cover the cut). Never change her words.

## Two calls I need from you
1. Escalation = emergency dispatch (my pick). Good, or a different trigger?
2. Open on the real missed call (trim the ring), or just text in?
