# Lu Computer — the component rollout

> Part of the Lu Computer canon — see [FOUNDATION.md](../FOUNDATION.md).

`/dev/design` is the canonical **component gallery**: every real component in `apps/web/src/components/**` gets
a redesigned twin there, demoed in **light + dark**, before it is rolled into the product. Build on the board →
verify both themes → replace in product. This doc is the map: the foundation fixes, then the per-component
inventory by tranche.

The foundation and the primitives (Tranche 1) cascade app-wide, so they lead; the composite twins live on the
board and are swapped into the real, auth-gated surfaces as a reviewed sweep.

---

Design language is locked in [design-system.md](./design-system.md) and must be obeyed for every twin:
- **Material zoning** — neu/gloss = *tactile things you press* (nodes, buttons, controls, tiles);
  **glass** = *floating things* (nav pills, overlays, dock, toasts). One material per element.
- **Pixel layer** — accent only: `PixelMeter` / `PixelLoader` / `PixelVoice` (motion), mono numerals,
  `PixelIcon` (assets/objects only), dither/checker textures. Never on chrome, body type, or line-icons.
- **All-sans** (Plus Jakarta Sans) + **IBM Plex Mono** for numerals/micro-labels/timestamps.
- **Color** = monochrome base + soft-tint chips (status families / categorical kinds), one interactive blue `#5b9bff`.
- **Elevation ladder** `.elev-1…4`, depth duality `.neu-card` (raised) vs `.neu-card-in` (recessed).

---

## 0. Foundation fixes FIRST (they cascade to every component)

From the design review — do these before/with Tranche 1 or every twin inherits the weakness:

1. **Widen the elevation ladder.** `elev-1…4` and `neu-card` vs `neu-card-in` are near-identical today.
   Increase the deltas between rungs so raised/recessed reads at a glance.
2. **Re-model dark depth.** Drops barely register on the dark canvas → everything flattens to one charcoal.
   Add rim/edge highlights + a surface that genuinely lightens as it rises; drops become the secondary cue.
3. **Add the missing token layers:** a named **type scale** (display/h1/h2/title/body/label/mono-caption),
   a **spacing scale**, and **motion tokens** (durations + easings) so twins stop using ad-hoc `text-[13px]`/`px-2.5`.
4. **Define states once:** focus ring (`#5b9bff`), hover-lift, disabled, loading, invalid — reused by all primitives.
5. **A11y pass:** raise `--muted-foreground` contrast; min 12px on mono micro-labels; ensure meters never rely on hue alone.

Add a **"Foundations — states & scales"** frame to the board demoing the above.

---

## 1. Board reorganization

Add a top-level **"App components"** super-section under the existing signature frames, with one
sub-frame per tranche below. Each twin frame shows: the component in its key states, a one-line
`Cap` naming the material zone + tokens used, and (where relevant) the primitive it now composes.
Keep the `neu`-strength knob + theme toggle global.

---

## 2. Inventory + redesign spec, by tranche

`components/ui/*` are the base layer — redesigning them upgrades the whole app for free, so they go first.
Legend for **Do**: `gloss`=pressable, `glass`=floating, `neu`=pillow, `socket`=recessed field, `chip`=soft-tint,
`prim`=compose an existing `ds/` primitive.

### Tranche 1 — UI primitives (`components/ui/`) · cascade to everything
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `button` | shadcn + `elev-btn` | primary → `gloss-ink` + press; outline/secondary → `gloss`; ghost/link flat | P0 |
| `card` | `elev-card` + ring | `neu-card` (raised) / `neu-card-in` (recessed) pair | P0 |
| `input` / `textarea` | flat border | `neu-socket` recessed field + focus ring | P0 |
| `select` / `command` | shadcn | trigger = `gloss`; menu = `glass`/`elev-4` floating | P0 |
| `checkbox` / `switch` | shadcn | glossy knob (switch already prototyped on board) | P0 |
| `tabs` | `shadow-sm` active | raised `gloss` pill active (board `Tabs` pattern) | P0 |
| `badge` | shadcn variants | soft-tint status/kind chip (board `StatusChip`) | P0 |
| `dialog` / `sheet` / `popover` / `dropdown-menu` / `tooltip` | `shadow-md/lg` | `glass` or `elev-4` floating overlays | P0 |
| `progress` | thin bar | swap to `MeterBar` (recessed socket) | P1 |
| `skeleton` | pulse | pixel/shimmer loading in the pixel language | P1 |
| `sonner` (toast) | default | `glass` / `GamePill`-style floating toast | P1 |
| `table` | shadcn | editorial table (hairline rows, mono numerals) | P1 |
| `avatar` / `separator` / `label` | shadcn | avatar `neu-chip` ring; hairline separators; mono labels | P2 |
| `calendar` / `chart` | shadcn / recharts | calendar in tokens; chart palette = system + meter ramp | P2 |
| `sidebar` | shadcn | see Tranche 5 (shell) | P1 |

### Tranche 2 — Data & metrics
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `app/StatCard` | flat `card-lift` | **replace with `StatBlock`** (`PixelMeter` + `DeltaPill`) | P0 |
| `app/SparklineStat` | flat | `StatBlock bare` + sparkline in system palette | P1 |
| `app/DataTable` | tanstack + flat | editorial table + kind chips + mono numerals | P1 |
| `dashboard/NeedsYou` | flat rows | Lu-interaction rows: `neu-card-in` rows + status chips + `gloss` action | P0 |

### Tranche 3 — Cards, states & roadmap
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `app/ApprovalCard` / `ApprovalRows` | flat + `btn-glow` | categorical-kind chip + `TaskCard`-style row + `gloss` actions | P0 |
| `dept/RoadmapStepper` | flat StepCard | **replace/augment with `TaskCard` + `TaskStage`** (depth duality) | P0 |
| `dept/DepartmentPage` | bespoke | roadmap stepper + panels on `neu-card`; dept header editorial | P1 |
| `app/EmptyState` | dashed + mono | keep mono "All caught up"; add `PixelIcon` + `neu-card-in` well | P1 |
| `app/GatedState` | `btn-glow`/`green-wash` | upgrade/locked state as `glass-hero` over dither + `gloss-ink` CTA | P2 |
| `app/ModuleStub` | stub | "app coming soon" tile with `PixelTile`/`PixelIcon` | P2 |

### Tranche 4 — Lu chat surface (`components/sarah/`)
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `sarah/SarahWidget` | floating `shadow-[…]` | Lu dock: `elev-4` floating panel, tabbed | P0 |
| `sarah/SarahComposer` | `rounded-2xl border` + `btn-glow` send | `neu-socket` recessed input + `gloss-ink` send + `PixelVoice` state | P0 |
| `sarah/SarahThread` | bubbles | keep iMessage bubbles; Lu row uses `neu` avatar + `PixelVoice` | P1 |
| `app/SarahActionRow` | flat | action row = `neu-card-in` + kind chip + `gloss` button | P1 |

### Tranche 5 — App shell / chrome
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `AppSidebar` + `ui/sidebar` | shadcn sidebar, monogram `btn-glow` | rail flush; monogram `neu`; nav items with `#5b9bff` active | P1 |
| `app/PageHeader` | H1 only | editorial header (title + mono kicker + `gloss` header controls) | P1 |
| `theme-toggle` | icon button | `gloss` pill toggle (board pattern) | P2 |
| `SidebarInset` content frame | `border shadow-sm` | `elev-2` + bevel deep frame (shell = the outer console) | P1 |

### Tranche 6 — Canvas polish (partly on-system already)
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `canvas/AgentDockPanel` | flat `border` cards | file/roadmap cards → `elev-1` + hover-lift; input `neu-socket` | P1 |
| `canvas/CanvasToolbar` | on-system | confirm `gloss-ink` FAB + `gloss` tools | P2 |
| `canvas/BrowserChrome` | built | tune to `ref-76` proportions in the tokens | P2 |
| `canvas/CompanyCanvas` | neu nodes (done) | audit against `neu` spec; connector beads `gloss` | P2 |
| `canvas/SheetGrid` / `Workplace` | grid | recessed `neu-inset` canvas + `elev` frames | P2 |

### Tranche 7 — Team, onboarding, workspace
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `team/TeamRoster` | partly on-system | finish neu/gloss pass | P2 |
| `team/TeamGraph` | graph | nodes = `neu` pillows; edges in system ink | P2 |
| `team/PermissionsMatrix` | table | editorial matrix + chips | P2 |
| `team/TeamSetup` / `TeamSetupPersisted` / `TeamClient` | two-panel | Lu-convo panel + `neu` roster; reuse dock patterns | P2 |
| `onboarding/OnboardingSketch` | many `btn-glow`/`card-lift` | full pass to `gloss`/`neu` + `PixelLoader` "booting up" | P1 |
| `workspace/AppSetup` / `AppSetupPanel` | two-panel | same AppSetup convo shell as TeamSetup | P2 |

### Tranche 8 — Customer-facing / media
| Component | Today | Redesign → | Pri |
|---|---|---|---|
| `app/PublicDocLayout` | "Sent via …" | editorial public doc frame (also fix brand string) | P1 |
| `app/MarkdownView` | prose | tokenized prose (type scale, mono code) | P2 |
| `app/CalendarMonth` | bespoke | tokens + `#5b9bff` selection | P2 |
| `app/StarRating` | stars | amber review stars (categorical) | P3 |
| `app/PhoneFrame` / `PhotoStrip` | frames | `elev-3` device frame; media in `neu-inset` | P3 |

**Not redesigned (keep as-is):** `components/icons/*` (stroke line-icons — the deliberate opposite of pixel
icons; audit for consistency only), `DemoToggle`, `SidebarResizer`, `AuthHashHandler`, `setup-steps.ts`,
`sarah-context.tsx`, `theme-provider.tsx` (infra, no surface).

---

## 3. Per-component workflow

1. Build the twin in a board sub-frame, all key states, using tokens + zones (no ad-hoc shadows/sizes).
2. Screenshot **light + dark** (Playwright, `channel: chrome`) — the twin must read in both.
3. Tune `--neu-strength` / tokens if it fights the foundation.
4. Roll into product: replace the real component's classes; re-verify the live surface both themes.

## 4. Suggested sequence

**Foundation (§0) → Tranche 1 (primitives, biggest cascade) → 2 → 3 → 4 → 5 → 6 → 7 → 8.**
P0 items inside a tranche first. Primitives unlock the most surface for the least work, so they lead.

## 5. Out of scope here

Wordmark/logo direction (parked), the branding-debt string sweep (separate track,
[design-system.md §5](./design-system.md)), real backend wiring (Publish/Revert, artifacts), mobile depth polish.
