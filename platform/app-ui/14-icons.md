# 14 — KiwiIcons: a unique, animated icon system (Resend-style)

> Foundation-layer plan (extends `00-foundation.md` §8). Goal: replace stock lucide with icons
> that are (a) **ours** — a recognizable KiwiOS drawing style — and (b) **alive** — Resend-style
> choreographed hover/active animations on the nav and key surfaces. Explicitly OUT of scope:
> WebGL/3D hero objects.

## 1. How Resend does it (research, from their live site)

- Their icons are ordinary layered SVGs — but **every part is its own `<path>`** (flap, lines,
  dot), hand-drawn so the anatomy can be animated, not just the file.
- Animation is **Framer Motion** (`motion`): the wrapper carries the hover/state trigger, child
  paths have **variants** animated with springs and a **40–60ms stagger** — flap opens, *then*
  lines whoosh, *then* dot pops. The stagger + spring physics is the entire "alive" feeling.
- Simple cases (nav chevrons, arrows) are just Tailwind: `transition-transform duration-200
  group-hover:translate-y-0.5` keyed off a parent `group`/data-state. No JS.
- Everything animates transform/opacity/stroke only (no layout), and respects reduced motion.

## 2. What makes ours OURS: the drawing style + the motion

- **Stroke style matched to the app**: 24px grid, 1.75px round-cap strokes (between lucide's 2
  and Resend's 1.5) — consistent optical weight across the set, drawn by us, not stock.
- **A consistent motion voice**: every icon uses the same spring physics and the same
  stagger rhythm, and each one has a small choreography grounded in what the icon *is*
  (the door swings, the clock hand sweeps, the bars grow). Uniform physics + specific
  stories is the identity — no decorative gimmicks.
- Silhouettes stay conventional (a calendar still reads as a calendar); the drawing hand
  and the motion make them unmistakably KiwiOS.

## 3. Sourcing decision (the one call Levi owns — §8 Q1)

| Option | Unique? | Speed | Lock-in |
|---|---|---|---|
| **(a) Own paths + own motion system** (recommended) — copy the proven open-source pattern (pqoqubbw/icons, MIT: per-icon client components, imperative start/stop handle, motion variants) but **author our own 14 paths** in our stroke style | ★★★ | medium | none |
| (b) Adopt pqoqubbw/icons as-is (animated lucide-compatible set) | ★ | fastest | none, but looks like every other 2025 SaaS |
| (c) Paid animated sets (Lordicon/Rive) | ★★ | fast | runtime + license, hard to match our stroke style |

Recommendation: **(a)** — 14 icons is a small enough set to own outright.

## 4. Architecture (`apps/web/src/components/icons/`)

```
icons/
  kiwi-icon.tsx      → the primitive: hover/press/active plumbing, reduced-motion guard,
                        size + strokeWidth props, exposes an imperative handle
                        { startAnimation(), stopAnimation() } so parents (sidebar) can
                        trigger without hover
  variants.ts        → shared spring presets (POP, DRAW, SLIDE, SPIN) + the STAGGER constant
  home.tsx, sarah.tsx, crm.tsx, … one file per icon (motion.path children + variants)
  index.ts           → export map keyed by the registry icon names (00 §5 MODULES.icon)
```

- **Dependency:** `motion` (the framer-motion successor) — the only new package. Icons are
  small client components (~1–2KB each), imported individually (no barrel bloat).
- **Triggers, in priority order:**
  1. `hover`/`focus-visible` on the parent `group` (sidebar row, button) — the Resend moment;
  2. **route-activation**: when a nav item becomes active, the sidebar calls
     `startAnimation()` once — the icon "celebrates" being selected, then settles into its
     **active pose** (settled end-state of its choreography);
  3. `press`: a fast 0.92 scale squish on the whole svg.
- **Physics defaults:** springs `stiffness 320 / damping 17`, stagger `50ms`, total
  choreography ≤ 450ms. Draw-on effects via `pathLength` 0→1. Transform/opacity/stroke only.
- **Reduced motion:** `MotionConfig reducedMotion="user"` at the shell level — icons render
  their final pose, zero movement.
- **Registry hookup:** `MODULES[key].icon` (00 §5) switches from lucide names to KiwiIcon
  names; `AppSidebar`'s `ICONS` map imports from `components/icons`. Non-animated contexts
  (tables, badges) can render the same components static (`animate={false}`).

## 5. The set: 14 icons + per-icon choreography

| Icon | Drawing | Hover choreography |
|---|---|---|
| Home | house + door | roof draws in → door swings open 8° and settles |
| Sarah | four-point spark | points scale out staggered with a 20° rotate, center pulses |
| CRM | two heads | back head slides in from behind → front head bobs |
| Schedule | calendar | binder rings bounce → the page line sweeps across |
| Quotes | document | text lines write in top-to-bottom (pathLength) |
| Invoices | receipt w/ zigzag foot | zigzag ripples like paper tearing → total line slides in |
| Follow-ups | clock | hand sweeps 300° with spring overshoot, tick marks fade in |
| Website | globe | meridian spins a half-turn → equator draws across |
| Content | pen nib | nib tilts down → a written stroke draws out beneath it |
| Reviews | star | star traces its own outline (pathLength) → 6° wiggle |
| Analytics | three bars | bars grow from the baseline, staggered shortest-to-tallest |
| Team | three heads | two heads nudge apart → the third pops in between |
| Settings | gear | gear rotates 30° with overshoot and settles back |
| Launcher (special) | the white bubble mark | press: squish; hover: a quick 6° tilt-and-settle — the one place motion is allowed to be playful |

## 6. Where they live

Sidebar nav (all 13 + active poses) → widget launcher (special) → Sarah page tabs + approval
card kind-chips → empty/gated states (the icon runs its choreography once on mount — a quiet
delight) → Home stat-card icons if we add them later. Landing page (Astro, no React): CSS-only
subset — stroke-draw (`pathLength`/dashoffset) + transform transitions of the same SVG files;
no motion dependency there.

## 7. Build order (no dates; each step shippable)

1. `motion` dep + `kiwi-icon.tsx` primitive + `variants.ts` + **two pilot icons (Home, Sarah)**
   wired into the sidebar with hover/active/press triggers, plus a dev-only `/dev/icons`
   gallery route to review the set side by side (hover-all / play-all buttons).
2. Levi reviews the physics on the pilots → tune constants once, globally.
3. The remaining 11 nav icons + registry/AppSidebar switchover; lucide stays for generic UI
   chrome (chevrons, x, check — not identity surfaces).
4. The launcher special + gated/empty-state mount choreography.
5. Landing-page CSS subset (nav + module cards).
6. Retire unused lucide imports from identity surfaces.

## 8. Open questions

1. **Sourcing** — confirm option (a): own paths + own motion system (pqoqubbw pattern as
   reference only). This is the plan's premise.
2. **Active-pose** — does the active nav icon get a slightly heavier stroke (2px) beside the
   row highlight, or is the row highlight enough?
3. **Landing parity** — is the CSS-only subset enough there, or do we accept small React
   islands in Astro for full choreography on the module cards?
