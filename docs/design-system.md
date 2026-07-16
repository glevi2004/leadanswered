# Lu Computer — Design System

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

**North star:** an editorial, Cofounder-flavored **org canvas rendered as pressable game-console hardware** — a
monochrome light/dark base where color appears only as soft-tint chips, **pixel used as an accent** (meters,
numerals, asset icons, hero art), and a **Wii + Apple material split**: neumorphic/glossy hardware you press,
frosted glass that floats above it. All-sans. "Like Cofounder & Browserbase, but more tactile."

The live component board is **`/dev/design`** (dev-only, light/dark toggle + `--neu-strength` knob). New
primitives live in `apps/web/src/components/ds/`. This doc is the spec; the board is the source of truth for
look. Material CSS recipes + the focused-site components are in [design-depth.md](./design-depth.md); the
per-component rollout map is [design-components.md](./design-components.md).

---

## 0. The three locked decisions

| Fork | Decision | Consequence |
|---|---|---|
| **Pixel intensity** | **Pixel-accented editorial** | Clean neumorphic/editorial chrome. Pixel confined to a defined *pixel layer* (below). No pixel font, no blocky borders on chrome. |
| **Material metaphor** | **Wii + Apple, zoned** | Neumorphism + gloss for *tactile* things you press. Frosted **glass** for *floating* things (nav pills, overlays, dock). Each material has one job. |
| **Typography** | **All-sans, no serif anywhere** — incl. the wordmark | The "Lu" wordmark is Plus Jakarta Sans. Serif is fully retired. |

---

## 1. Material zoning — the core rule

The whole system reads as **two materials with clear jobs**. Never mix them on one element.

**NEU / GLOSS (the "Wii hardware" — tactile, opaque, pressable).** For anything you touch or that represents a
physical object on the canvas:
- `.neu-raise` + `.neu-socket` → department **nodes**, agent pillows (pillow-in-socket, dual light source).
- `.gloss` → pressable controls: chevrons, segmented actions, tabs' active pill, page-nav, small chips.
- `.gloss-ink` → the charcoal FAB (`+`), task pills, primary emphasis.
- `.btn-glow` (kept name) → the primary button slab.
- Press physics: `active:translate-y-px` (small), `.gloss:active` (inset + drop). Cards hover-lift `-2px`.
- Tunable via **`--neu-strength`** (0–1.6 on the board; ship default `1`).

**GLASS (the "Apple" — frosted, translucent, floating).** For anything that hovers *above* the hardware and
lets the scene show through:
- `.glass` → top-nav pills, command bar, floating panels, the Lu dock container.
- `.glass-ink` → dark frosted variant (dark bar over a bright canvas; achievement/`GamePill`).
- `.glass-hero` → frosted pane sized to sit over pixel-art hero scenes (marketing).
- Never gets a press state. Glass floats; it is not pressed.

> Rule of thumb: **if it sits on the canvas, it's neu/gloss. If it floats over the canvas, it's glass.**

---

## 2. The pixel layer — where pixel is allowed (and where it is NOT)

Pixel is a **signature accent**, exactly as Cofounder/Browserbase use it. It appears in these places only:

1. **Segmented meters** — `PixelMeter` (green→amber→red ramp). The single most recognizable Lu motif. `rows`
   stacks a denser pixel field.
2. **Flowing pixel motion** — the same pixel vocabulary, animated: `PixelLoader` (a travelling-wave / "booting
   up your company" loader) and `PixelVoice` (Lu's voice/activity equalizer — idle/listening/speaking). Lu's
   loading + voice language.
3. **Mono numerals** — big metrics in IBM Plex Mono (`234`, `10,291`, `58%`), `tabular-nums`.
4. **Pixel-art asset icons** — `PixelIcon` (folder/file/app/chart/sparkle), filled + blocky, in a glossy
   `PixelTile`. Reserved for *objects/assets* (files, artifacts, apps) — the deliberate opposite of the app's
   stroke line-icons (nav, actions).
5. **Dither / checker textures** — `.pixel-dither`, `.pixel-checker` behind hero blocks.

The landing hero is a **minimal editorial feature section** (ref: Cofounder "A full roadmap"): a left copy
column (pixel-folder tile → headline → muted paragraph → mono links) + a `.canvas-dots` dotted panel holding
`TaskStage`/`TaskCard` roadmap columns (one active card, the rest ghosted).

**Never pixel:** body/label typography, nav chrome, borders, form fields, line-icons, data tables. Chrome stays
clean editorial; pixel is the jewelry.

---

## 3. Foundations

### 3.1 Color
Base is **monochrome editorial** (`globals.css`); color is *only* soft-tint chips.

- **Neutrals** — Light: `--background #f0f0f0` · `--card #ffffff` · `--border #e4e4e4` · `--muted #ebebeb` ·
  `--foreground #2b2b2b`. Dark: `--background #1e1e23` · `--card #28282d` · `--border #323237` ·
  `--foreground #f0f0f0`.
- **Interactive accent (canonical, single):** **`#5b9bff`** — selection rings, active dots/rows, focus
  emphasis, range thumbs. *This is the one interactive blue.*
- **Semantic STATUS families** (by meaning; render as **12% bg / strong text** chip): gray=dormant ·
  blue=in-flight · violet=being-worked · emerald=good · amber=needs-an-eye · red=lost. Registry:
  `lib/dashboard-ui.ts`.
- **Categorical KINDS** (by type, one hue each, chip-only): message `#3B82F6` · quote `#8B5CF6` ·
  invoice `#10B981` · review `#F59E0B` · post `#EC4899` · site `#6366F1` · question `#F97316`. Registry:
  `ApprovalCard.tsx`.
- **Two-blues note:** `#5b9bff` (interactive/selection) and `#3B82F6` (categorical "message") are **separate
  scales by design** — one is chrome state, one is a data category; they never share a surface. Do not merge them.
- **Meter ramp:** green `hsl(135)` → amber → red `hsl(4)`, hue-interpolated per cell (`PixelMeter`).

### 3.2 Typography — all-sans
- **Sans:** Plus Jakarta Sans (`--font-sans`, also `--font-heading`) — greeting, H1s, body, labels, nav,
  wordmark.
- **Mono:** IBM Plex Mono (`--font-plex-mono`) — **numerals**, uppercase micro-labels, terminal empty states
  ("All caught up"), timestamps, code/URLs.
- **No serif** in the codebase. Do not reintroduce it.
- Numerals always `tabular-nums`.

### 3.3 Spacing, radii, elevation
- Radius base `--radius: 0.75rem`; scale `--radius-sm…-4xl` (×0.6…×2.6). Named: `--radius-frame 20px` (site
  frames), `--radius-node 26px` (agent pills), `--radius-pill 9999px` (floating pills).
- **Elevation ladder** (theme-flipping, light source = top): `.elev-1` resting card · `.elev-2` floating
  pill/button · `.elev-3` FAB / focused frame · `.elev-4` dock / popover / dialog. Each =
  `box-shadow: var(--elev-N), var(--bevel-top)`. Full token recipes in [design-depth.md](./design-depth.md).

---

## 4. Component catalog

### 4.1 Signature primitives — `components/ds/`
| Component | Purpose | Ref |
|---|---|---|
| `PixelMeter` | Segmented green→amber→red ramp meter. Full-ramp (decorative) or `value`-driven; `rows` for a denser field; tones `ramp/green/blue/violet/amber`; `sm/md`. | Cofounder "Sign ups" |
| `PixelLoader` | Flowing pixel meter — travelling-wave / "booting up your company" loader; `rows` → flowing field. Binary marching-band cells (snap on/off, no fade); embossed by default, opt-in `screen` = LCD panel + glow. | Lu motion language |
| `PixelVoice` | Lu's voice/activity equalizer — bottom-anchored rising pixel columns growing in discrete `steps()` blocks; states `idle/listening/speaking`. | Lu motion language |
| `MeterBar` | Continuous thick rounded fill in a recessed `.neu-socket`. Honest single %. Tones + `height`. | Cofounder "58% Open Rate" |
| `DeltaPill` | Mono % change chip, circled up/down arrow, green up / red down. | Cofounder "+12% / 10%" |
| `StatBlock` | The metric tile: uppercase label + mono numeral + `PixelMeter` + `DeltaPill`. `bare` for embedding. | Cofounder stat row |
| `PixelIcon` + `PixelTile` | Crisp pixel-art asset glyphs (folder/file/app/chart/sparkle) on a glossy raised tile. | Cofounder blue folder |
| `GlassNav` | Floating frosted nav pill; active = raised chip; `ink` variant over dark/photo. | Cofounder hero nav |
| `GamePill` | Frosted `glass-ink` achievement/status pill (dot + label + value) that floats over scenes. | Cofounder "Task Completed" |
| `TaskCard` + `TaskStage` | Roadmap/quest card (user/agent/approval; todo/active/locked/done) grouped in a labeled stage column. | Cofounder roadmap kanban |

### 4.2 Existing primitives (on the depth system)
`ui/button` (default=`.btn-glow`, outline/secondary=`.elev-btn`), `ui/card` (`.elev-1` + hairline ring),
`ui/badge`, `ui/progress`, `StatCard`/`SparklineStat` (`.card-lift`), `EmptyState` (dashed, `mono` variant),
`DataTable`, `RoadmapStepper`, `NeedsYou`, `CompanyCanvas` (the full neu/gloss showcase), animated line-icons.

### 4.3 Patterns demoed inline on the board (extract to `ds/` when reused)
Segmented control (neu-socket + gloss), tactile `Toggle` (glossy knob), raised-pill `Tabs`, `PageNav` dot-pager
(iPod/Wii, active dot `#5b9bff`), `NeuNode` (department pillow), `StatusChip`.

---

## 5. Branding debt

The product renamed **Lead Answered → Lu Computer** (lu.computer); the assistant persona **Sarah → Lu**; the
vertical **roofing/contractor → any service business**; "kiwi" dropped. Newer layers already use "Lu"; drift is
concentrated in three older layers (also tracked in [ROADMAP.md](../ROADMAP.md)).

**HIGH — user-visible (fix first):**
- **"Lead Answered" brand** still shipped: `layout.tsx` (app title + old tagline), ~15 page `<title>`s (all
  `— Lead Answered`), sign-in/welcome/set-password copy, `PublicDocLayout.tsx` "Sent via Lead Answered"
  (customer-facing).
- **"Sarah" hardcoded as the assistant** in ~59 UI strings (registry promises, empty states, toasts, labels)
  that render literally "Sarah" instead of routing through the existing `assistantName` (which already defaults
  to "Lu"). Spread across schedule, reviews, team, followups, content, crm, quotes, invoices, analytics, the Lu
  widget.

**MEDIUM — config defaults + demo:**
- Backend persona default `sarahName @default("Sarah")` (`schema.prisma`, `onboarding.ts`, `seed.ts`) feeds the
  *real* customer identity (`worker.ts`, `intake/engine.ts`, `prompt.ts`). Flip the default to `"Lu"`.
- Old lead-email domain `leadanswered.com` (`env.ts`, `.env.example`).
- Vertical-specific language in LLM prompts/examples (`engineeringTools.ts`, `team/chat/route.ts`, `judge.ts`).
- Old demo fixtures (`fixtures/*`, `DemoToggle.tsx`) — re-theme to a vertical-neutral sample, or keep as
  intentional demo data.

**LOW — internal (safe, cosmetic):**
- Package names `@leadanswered/*` (~50 import sites) → `@lu/*` (one rename decision).
- `KIWI_ICONS`/`KiwiIcon` naming, `SarahWidget`/`sarah-context`/`sarahName` identifiers, the `/sarah` route,
  ~30 "Sarah"/"trades" code comments, the repo directory name.

**Fix order:** (1) global "Lead Answered → Lu Computer" (titles + `layout.tsx` + auth/public copy — pure
find/replace, most visible); (2) route the ~59 "Sarah" strings through `assistantName`, flip the `sarahName`
default, fix sender identity; (3) lead-email domain; (4) demo re-theme; (5) internal renames when convenient.

---

## 6. Adoption plan

1. **Foundation:** `.glass*`, `.pixelated`, `.pixel-dither/checker` in `globals.css`; `ds/` primitives; the
   board at `/dev/design`.
2. **Iterate on the board** — tune `--neu-strength`, meter cell size, pixel-icon glyphs, glass blur.
3. **Roll signature components into product:** `StatBlock`/`PixelMeter` into `analytics` + dept dashboards;
   `GlassNav` into the top-nav/canvas chrome; `PixelIcon`/`PixelTile` for files/artifacts/apps; `GamePill` for
   canvas agent-updates; `TaskCard`/`TaskStage` to replace/augment `RoadmapStepper`. (See
   [design-components.md](./design-components.md) for the full map.)
4. **Branding debt sweep** (§5) — a separate PR track from the visual system; start with HIGH.
5. **Verify** every rolled-in surface in **light AND dark** (headless-Chrome screenshots, both themes).

## 7. Out of scope (v1)
Real hero pixel-art generation (Higgsfield), mobile depth polish, full `RoadmapStepper` replacement, and the
branding-debt code changes (register only).
