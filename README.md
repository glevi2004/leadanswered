# Answered

AI lead-response agency. We text inbound leads in under 60 seconds, qualify them, and put confirmed appointments on the client's calendar.

This repo houses everything: strategy, GTM, delivery SOPs, the marketing site, and tooling.

## Where things live

| Folder | What's in it |
|---|---|
| `playbook/` | What we sell, who we sell to, pricing, the realistic 12-month picture. **Read this first.** |
| `gtm/` | How we actually find clients: cold calls + LinkedIn video. Daily schedule, ramp plan, scripts. |
| `sales/` | Pipeline, prospect lists, call notes. |
| `delivery/` | How we onboard a client and ship their AI in 48 hours. |
| `clients/` | Per-client folders. **Gitignore once real.** |
| `platform/` | The product itself: the app codebase (`apps/` + `packages/`), the build spec (`SCOPE.md`), and the marketing site (`landing-page/`). |
| `tools/` | Internal automation: `scraper.py`, list builders, audit scripts. |
| `brand/` | Voice, one-liner, logo assets. |
| `ops/` | Stack costs, legal, weekly metrics. |

## Reading order (new contributor or future me)

1. `playbook/01-offering.md` — what we sell
2. `playbook/03-verticals.md` — who we sell to
3. `gtm/01-strategy.md` — the channel mix
4. `gtm/02-daily-schedule.md` — what a day looks like
5. `gtm/03-ramp-plan.md` — what the first 8 weeks look like

Everything else: read on demand.

## Building the product

The product lives in `platform/`. Start with `platform/SCOPE.md` — it's the build spec and source of truth. Build in the phases it defines, one at a time (Echo Bot → Sarah MVP → intake → onboarding → dashboard).
# leadanswered
