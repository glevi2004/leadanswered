# Build plan — Onboarding, rebuilt (boot up your company, not set up a receptionist)

> Levi + Claude, 2026-07-15. Companion to **`AGENTS-BACKEND.md`** / **`ENGINEERING-AGENT.md`**.
> Replaces the `/dev/onboarding` sketch (`OnboardingSketch.tsx`, 1311 lines). **Two shifts:**
> (1) the **spine** changes from "SMS receptionist setup" → "boot up your company + its departments";
> (2) the **UI is rebuilt ground-up, state-of-the-art, video-game / Wii-like** — the current sketch is a
> plain motion shell, **NOT** the target. **Only the Engineering agent is real**; the other 7 departments
> render as **"In development."** Lu must actually **work** (real conversation → real DB → handoff), not
> the current cookie mock.

## 0. The shift (why a rebuild, not a copy-swap)

The current Lu flow is rebranded to "Lu"/`lu.computer` but its mental model is still the old assistant:
`business → links → scan → handle → name Lu → site → email inbox → your cell → text-yourself →
hours you can take jobs → Google Calendar → team`. Half of that (phone, SMS, the 844 line,
"when can I book you for jobs," the reviews ladder, the inbox) is the product we pivoted *away* from.
And it writes a **browser cookie**, never a DB — there is **no "departments" concept in the data** yet
(code still has 4 old agent presets: `receptionist/followups/reviews/content`). So the spine changes.

- **Keep:** the two-panel conversation layout, the real Claude team-chat step (already works,
  `api/team/chat`), the "links → Lu learns your brand" scan moment (now it feeds the **Engineering agent**
  so it builds on-brand), the design tokens worth reusing (`--elev-*`, `.neu-raise`, `.gloss`).
- **Drop (receptionist-era):** phone, SMS, the 844 line, "hours for jobs," calendar-for-booking, the
  email inbox, the reviews ladder.
- **Build new:** the **"your company assembles"** moment, **real DB provisioning**, and the **pixel /
  game layer** (today pixel-art lives only in `CompanyCanvas.tsx` — bring it into onboarding).

## 1. The reshaped flow

| # | Step | What Lu does | Keep/Drop/New |
|---|---|---|---|
| 0 | **Welcome** | Meet Lu. "Let's set up your company." | reframe |
| 1 | **What do you do** | Free-text business description (already trade-agnostic). | keep |
| 2 | **Links → learn your brand** | Paste site/socials → the scan animation. Framed: "so your agents build in your voice." Feeds Engineering. | keep, reframe |
| 3 | **Your handle** | `you.lu.computer` — now meaningful: it's where Engineering ships your sites. | keep, reframe |
| 4 | **★ Your company takes shape** | **The 8 department nodes assemble onto your canvas** (the Wii "world builds" moment). **Engineering lights up ACTIVE; the other 7 land dimmed as "In development" locked levels.** | **NEW — the heart** |
| 5 | **Meet your Engineer** | The one real agent. Short beat: sets up its `contract`, tees the first real action ("what should we build first?"). | **NEW** |
| 6 | **Team** (optional) | The existing real Claude team-graph convo. | keep |
| 7 | **Into the app** | Land on your canvas — your company, Engineering ready to build. | reframe |

Step 4 is the pivot: from "set up a receptionist" to **"boot up your company."**

## 2. UI — state-of-the-art, video-game / Wii-like (GROUND-UP)

Not the current look. Personality lives in **motion**, not an avatar (LOCKED: no mascot).

- **The centerpiece is step 4** — departments don't fade in, they **assemble**: each node **pops with a
  springy overshoot + a pixel "poof"** as Lu names it, until your company map is whole. Booting a console,
  not filling a form.
- **Pixel charging loader** — the ONE "Lu is thinking" touch (while the LLM call is in flight). A
  **pixelated charging orb** (the landing radial orb, chunky pixels, fills ring-by-ring, then pops into the
  message). Reusable `<PixelThinking/>` so it's shared with the dock later. Her text renders in the
  **normal font** (no voice-bars, no pixelate-in — dropped).
- **Wii ambient:** **mosaic/pixel wipe** between steps (screen pixelates out, next resolves in);
  **tactile hovers** (chunky scale + shadow-lift, like Wii channel tiles); **soft blips** (quiet menu
  tick on advance, pop on node-land — muted by default, toggle).
- **Locked levels:** the 7 in-dev departments = **dimmed pixel tiles with a little lock + "In development"** —
  reads as *ambition* (the whole world is coming), not *missing features*.
- **Extend, don't fork:** build on `--elev-*` / `.neu-raise` / `.gloss` + the pixel-art layer already in
  `CompanyCanvas`. Fonts stay Plus Jakarta Sans + IBM Plex Mono.

## 3. Engineering real, the other 7 "In development"

- Provisioning creates **8 `Department` rows**; Engineering gets `status: active` + a real **`Agent`** row
  (with a `contract`); the other 7 get `status: in_development` and **no agent** (locked tiles).
- The canvas + dock read this: Engineering is clickable/functional; the 7 show "In development" and can't
  be opened (or open to a "coming soon" beat).

## 4. Make her work (real, not the cookie mock)

The backend for this now exists (schema, Store, orchestrator, Engineering agent — `AGENTS-BACKEND.md`).
Order:
1. **Apply the additive DB migration** → the agent tables exist (Department/Agent/Task/Site/…).
2. **Provisioning server action** — at onboarding's end, create a real **org + 8 Department rows
   (Engineering active + agent, 7 in_development) + the Engineering `Agent`**. *(net-new; replaces
   `writeOnboardedProfile` cookie.)*
3. **Onboarding conversation → real endpoint** — reuse the `api/team/chat` pattern (real Claude,
   tool-calls that extract business/brand and drive provisioning).
4. **Canvas / dock read real rows** — Department/Agent/Task from the DB (retire the cookie profile for the
   Lu path; keep honest-empty).
5. **Wire Engineering** — "build me X" from the app → real Task → the sandbox pipeline
   (`ENGINEERING-AGENT.md`), streamed onto the canvas.

## 5. Cleanup debt (part of aligning to the new product)

- `SarahIcon` is used as Lu's glyph everywhere (`OnboardingSketch`, `AppSetupPanel`) → real Lu mark.
- `sarahName` field (default "Lu"), `la_org*` cookies ("LA" = Lead Answered), the `/sarah` route.
- Fully-stale surfaces: `app/welcome/page.tsx` ("Welcome to Lead Answered", "Sarah"), the admin wizard
  `config/sections.tsx` (roofers, estimates, "Sarah escalates"). Realign or retire.

## 6. Build order (each shippable)

1. **Migration applied** (dev DB first) — unblocks everything real.
2. **Provisioning action + real reads** — onboarding writes a real company; canvas shows it. *(Lu works.)*
3. **Reshaped flow (structure)** — new steps, drop receptionist rungs, real convo endpoint.
4. **Game/Wii UI pass** — `<PixelThinking/>`, the assemble-your-company centerpiece, mosaic wipes, locked
   tiles, blips.
5. **Wire Engineering** — the first real "build a site" from onboarding's tail into the app.

## 7. LOCKED decisions (2026-07-15)

- **No avatar**; personality via motion. **Pixel charging loader** is the only "thinking" touch (no
  voice-bars, no pixelate-in text — her text is the normal font).
- **Only Engineering is real**; the other 7 departments are **"In development"** (locked pixel tiles).
- **Real DB provisioning** (org + 8 Departments + Engineering Agent) **replaces the cookie mock.**
- **UI is a ground-up, state-of-the-art, video-game / Wii-like rebuild** — the current sketch is not the
  target.
- **Spine = "boot up your company"** (step 4 assembles the departments), not "set up a receptionist."

## 8. THE REAL HOOKUP — agreed 2026-07-15 (supersedes the game-UI over-reach in §2)

Decisions locked with Levi after reviewing the auth/onboarding map:

- **Signup = self-serve, waitlist-gated.** People join a **waitlist** (public). Levi **accepts** some. Accepted
  users get in and self-serve the **Lu onboarding** themselves (not the admin wizard). Reuse the existing
  Supabase-invite infra where possible (accept → shell org + invite → set-password → Lu onboarding).
- **Only Engineering.** Provisioning creates ONLY the Engineering department + the Engineer agent. Drop the
  7 "in development" departments entirely (no 8-dept grid, no assemble beat).
- **Onboarding UI = the minimalistic surgical version** (commit 2afb3ff): original cards + all steps
  (phone/sms/hours kept), subtle chat wave, smooth crossfades. NO pixel wipes, NO game-UI over-reach.
- **Ending:** team → **building** screen → **main page** (the app). The building screen = real provisioning.
- **Real, not mock.** Kill the `la_org_profile` cookie path for real users; a real new org renders the same
  honest-empty "all live" home the mock showed (carry the `demoProfile:"new"` behavior to real new orgs).
- **Migration: APPLIED TO PROD** (2026-07-15) — the agent tables are live on Supabase.

### Build order (small, verified increments — avoid another big fan-out)
1. **Provisioning → only Engineering** (`apps/api/onboarding/provision.ts`). Verify on dev DB.
2. **Real onboarding hookup** (`apps/web`): promote the Lu onboarding out of `/dev` to a gated real route;
   `openWorkspace()` → a server action that saves config to the **real** session org, flips
   `onboardingComplete`, and calls `POST /api/onboarding/provision` with the real org id. Kill the cookie
   short-circuit for real users; carry honest-empty to real new orgs. Ending = team → building → main page.
3. **Waitlist** (`apps/web`): public waitlist form + a `Waitlist` table + an admin accept action (accept →
   shell org + invite). Mostly new, isolated files.
4. **Canvas reads real Engineering** (`GET /api/departments`) instead of static graph data.
