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

## 2. What makes ours OURS: the drawing style + the seed

- **Stroke style matched to the app**: 24px grid, 1.75px round-cap strokes (between lucide's 2
  and Resend's 1.5) — consistent optical weight across the set.
- **The signature: every icon carries exactly one filled "kiwi seed"** — a small teardrop/dot
  accent in the brand green (`#58C411` light / `#9EEA6C` dark) placed where the icon's "life"
  is: the door knob on Home, the calendar's booked day, the star's center, the chat bubble's
  dot. On hover, **the seed is always the last thing to move** (pop/orbit at the end of the
  stagger) — a consistent punchline across all icons.
- This gives uniqueness without abandoning legibility: silhouettes stay conventional (a
  calendar still reads as a calendar), the style + seed make them unmistakably KiwiOS.

## 3. Sourcing decision (the one call Levi owns — §8 Q1)

| Option | Unique? | Speed | Lock-in |
|---|---|---|---|
| **(a) Own paths + own motion system** (recommended) — copy the proven open-source pattern (pqoqubbw/icons, MIT: per-icon client components, imperative start/stop handle, motion variants) but **author our own 14 paths** with the seed motif | ★★★ | medium | none |
| (b) Adopt pqoqubbw/icons as-is (animated lucide-compatible set) | ★ | fastest | none, but looks like every other 2025 SaaS |
| (c) Paid animated sets (Lordicon/Rive) | ★★ | fast | runtime + license, hard to theme the seed |

Recommendation: **(a)** — 14 icons is a small enough set to own outright, and the seed motif
only works if we draw them.

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
     **active pose** (seed filled, slight weight increase);
  3. `press`: a fast 0.92 scale squish on the whole svg.
- **Physics defaults:** springs `stiffness 320 / damping 17`, stagger `50ms`, total
  choreography ≤ 450ms. Draw-on effects via `pathLength` 0→1. Transform/opacity/stroke only.
- **Reduced motion:** `MotionConfig reducedMotion="user"` at the shell level — icons render
  their final pose, zero movement.
- **Registry hookup:** `MODULES[key].icon` (00 §5) switches from lucide names to KiwiIcon
  names; `AppSidebar`'s `ICONS` map imports from `components/icons`. Non-animated contexts
  (tables, badges) can render the same components static (`animate={false}`).

## 5. The set: 14 icons + per-icon choreography

| Icon | Drawing | Hover choreography (…always ends on the seed) |
|---|---|---|
| Home | house, door, seed = knob | roof draws in → door swings 8° → knob pops |
| Sarah | four-point spark, seed = center | points scale out staggered w/ 20° rotate → center seed pulses |
| CRM | two heads, seed = front head's dot | back head slides in from behind → front bobs → seed pops |
| Schedule | calendar, seed = one day cell | page line sweeps → rings bounce → the booked-day seed drops in |
| Quotes | doc, seed = period after last line | lines write in top-to-bottom (pathLength) → seed lands |
| Invoices | receipt w/ zigzag foot, seed = total dot | zigzag ripples → amount line slides → seed pops |
| Follow-ups | clock, seed = hand pivot | hand sweeps 300° spring → tick marks fade in → pivot seed pulses |
| Website | globe, seed = "you are here" | meridian spins half-turn → equator draws → location seed pops |
| Content | pen nib + stroke, seed = ink drop | nib tilts → written stroke draws in → ink-drop seed falls |
| Reviews | star, seed = center | star traces its outline (pathLength) → wiggles 6° → center fills |
| Analytics | three bars, seed = topping the tallest | bars grow staggered from baseline → seed lands on the peak |
| Team | three heads, seed = the new one | two heads nudge apart → third pops in as the seed |
| Settings | gear, seed = axle | gear rotates 30° with overshoot → axle seed pulses |
| Launcher (special) | the white bubble mark | press: squish; hover: bubble tilts 6° + 3 tiny seeds splash out and fall back — the one place we go showier |

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
2. Levi reviews physics + the seed idea on the pilots → tune constants once, globally.
3. The remaining 11 nav icons + registry/AppSidebar switchover; lucide stays for generic UI
   chrome (chevrons, x, check — not identity surfaces).
4. The launcher special + gated/empty-state mount choreography.
5. Landing-page CSS subset (nav + module cards).
6. Retire unused lucide imports from identity surfaces.

## 8. Open questions

1. **Sourcing** — confirm option (a): own paths + own motion system (pqoqubbw pattern as
   reference only). This is the plan's premise.
2. **Seed color on active** — filled brand green always, or neutral until hover/active
   (quieter sidebar)? Spec assumes: neutral idle, green on hover/active.
3. **Active-pose weight** — do active nav icons also switch to a slightly heavier stroke
   (2px), or is the filled seed enough selection signal beside the row highlight?
4. **How showy is the launcher** — seeds-splash on hover (spec'd) vs. only on first page load
   per session vs. never (squish only).
5. **Landing parity** — is the CSS-only subset enough there, or do we accept small React
   islands in Astro for full choreography on the module cards?
