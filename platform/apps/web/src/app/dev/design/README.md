# Design-system harness — READ THIS BEFORE BUILDING ANY UI

The design system is not a folder to grep — it is **this page: `/dev/design`**. Every reusable
component lives in `components/ds/` and is **demoed in a Frame on this board**. If you build UI
without opening the board first, you are guessing, and guessing is why the app is a mess.

This file is the operating contract. Follow it exactly.

---

## 0. The loop (do this every single time you touch UI)

1. **Open the board source.** `src/app/dev/design/page.tsx` + `src/app/dev/design/sections/*`.
   Find the section that owns what you're building (map in §3). Read how the real component is
   sized and composed there.
2. **Reuse, don't reinvent.** If a `ds/` component or a board pattern already does it, use it —
   with its documented size. Never inline an on-the-spot version.
3. **If it doesn't exist, build it in `components/ds/`** (one component, typed, `cn()`-based) —
   and in the **same change add a `<Frame>` to the matching board section** demoing it in its key
   states, light + dark. A component that isn't on the board does not exist.
4. **Size from the tables below** (§2). Never hand-pick `text-[13px]`, `size-9`, `p-5` etc. — use
   the ramp/scale. If you need a size that isn't here, it's probably the wrong size.
5. **Verify** the surface in the real app (both themes) before committing.

**The board is the source of truth for look AND size.** `docs/design-system.md` is the written
spec (zones, tokens, rollout); this file is the operational how-to.

---

## 1. Where components live (navigate here first)

| Layer | Path | What's there |
|---|---|---|
| **Signature primitives** | `components/ds/` | the Lu components: `SegmentedTabs`, `Toolbar`/`ToolbarIconButton`, `StatBlock`, `MeterBar`, `DeltaPill`, `TaskCard`, `GlassNav`, `GamePill`, `Pixel*`, `FileThumb`, `LibraryFolderCard`, … |
| **Base primitives** | `components/ui/` | shadcn on the depth system: `button`, `card`, `input`, `badge`, `dialog`, `dropdown-menu`, `skeleton`, `tabs`, `switch`, … |
| **Board patterns** | `src/app/dev/design/page.tsx` (inline: `Segmented`, `Tabs`, `Toggle`, `NeuNode`, `StatusChip`) + `sections/*` | demoed patterns; extract to `ds/` when reused |
| **Tokens + recipes** | `src/app/globals.css` | the type ramp (`.t-*`), material classes (`.neu-card`, `.neu-card-in`, `.neu-socket`, `.gloss`, `.gloss-ink`, `.press`, `.hover-lift`), elevation ladder (`.elev-1..4`), radii, focus ring |

Search order for "what component do I use?": **ds/ → board section → ui/ → build it (ds/ + board Frame)**.

---

## 2. SIZING — the exact spec (stop hand-picking)

### 2.1 Type — use the ramp classes, NEVER `text-[Npx]`
| Class | Size | Use for |
|---|---|---|
| `t-display` | 40px / 700 | hero numerals only |
| `t-h1` | 28px / 600 | page hero ("Good morning, …") |
| `t-h2` | 20px / 600 | **panel titles** ("Library", "Tasks") |
| `t-title` | 15px / 600 | card titles |
| `t-body` | 14px / 400 | body text |
| `t-label` | 13px / 500 | labels, list-row text, tab labels |
| `t-caption` | 12px mono uppercase | section eyebrows ("DOCUMENTS") |
| `t-num` | mono tabular | any numeral |

### 2.2 Controls — canonical sizes (from the board)
| Control | Recipe | Size |
|---|---|---|
| **Icon button** | `gloss press grid size-7 place-items-center rounded-full` | **`size-7` (28px)** — this is the default. `size-9` is only for the canvas FAB. |
| **Text button (secondary)** | `gloss press rounded-lg px-3 py-1.5 text-[12px] font-medium` | h≈30px |
| **Text button (primary)** | `gloss-ink press rounded-lg px-3 py-1.5 text-[12px] font-medium text-white` | h≈30px |
| **Segmented / mode switcher** | `SegmentedTabs` — `neu-socket` track `rounded-xl p-1`, items `px-3 py-1.5 text-[13px]`, active `gloss` | h≈34px |
| **On/off Toggle** | the board `Toggle`: `neu-socket h-6 w-10 rounded-full` + `size-5` knob | 24×40 |
| **Input / search field** | `neu-socket rounded-xl px-3 py-2` (+ `field-bare` on the raw input) | h≈38px |
| **Chip / badge** | `rounded-full px-2 py-0.5 text-[11px] font-medium` (`StatusChip`/`KindChip`) | h≈20px |

### 2.3 Surfaces
| Surface | Recipe |
|---|---|
| **Card** | `neu-card rounded-2xl bg-card p-3` (compact) / `p-4` (roomy). **Cards are compact — no giant heights.** |
| **Recessed field/well** | `neu-card-in rounded-xl` / `neu-socket rounded-xl` |
| **Row (in a list)** | plain `rounded-lg px-2 py-2 hover:bg-muted/50` (14px text, `size-4` icon) — not a card per row unless the design calls for it |
| **Floating panel/dock** | `elev-4 rounded-[26px] border bg-background` |

### 2.4 Icons
`size-4` (16px) default in rows/buttons · `size-3.5` (14px) small/inline · `size-5` (20px) emphasis ·
`size-1.5`/`size-2.5` for dots. **Never `size-6+` for an inline/action icon.**

### 2.5 Radii
`rounded-lg` controls · `rounded-xl` fields/small cards · `rounded-2xl` cards · `rounded-[26px]` the dock frame · `rounded-full` pills/chips/icon-buttons.

---

## 3. Board section → what it owns (where your Frame goes)

| Section file | Owns |
|---|---|
| `SecFoundation` | palette, **type ramp**, elevation/material recipes |
| `SecShell` | app shell, sidebar, header, page chrome |
| `SecCards` | cards, empty/gated states, roadmap/task cards |
| `SecData` | stat blocks, meters, tables, **file/library tiles** |
| `SecChat` | the Lu chat surface (thread, composer, action row, voice) |
| `SecCanvas` | canvas nodes, the **canvas Toolbar**, browser frame |
| `SecPublic` | public doc frame, media, markdown |
| `SecTeam` | roster, permission matrix, team setup |
| `page.tsx` (Controls frame) | Segmented · Tabs · **Toggle** · page-nav |

---

## 4. Switchers — pick the RIGHT one (this is where I keep failing)

- **2–3 mutually-exclusive modes** (grid/list, tab-like): **`SegmentedTabs`** (the `Segmented`
  pattern). Small: `px-3 py-1.5 text-[13px]`. This is the "toggle" for view modes.
- **On/off boolean**: the board **`Toggle`** switch (`h-6 w-10`).
- **Navigation between surfaces**: **`SegmentedTabs`** (the dock's tab bar already uses it).
- **The `Toolbar` is ONLY the canvas toolbar** (`gloss-ink`/`gloss` pill of icon buttons, `h-11`,
  hover-expand). Do NOT use it as a generic small toggle — it is oversized for that.

> `SegmentedTabs` currently renders text labels. For an **icon** switcher (grid/list), extend
> `SegmentedTabs` to accept a per-item `icon`/render — do it IN the component (and update its board
> Frame), never fork a one-off.

---

## 5. Materials (which zone)
neu / gloss = **tactile, pressable** (buttons, cards, nodes, switchers). glass = **floating over
the canvas** (nav pills, overlays). Recessed `neu-card-in`/`neu-socket` = wells/fields the raised
things sit in. One material per element; never mix.

---

## 6. Pre-flight checklist (paste into your head before writing JSX)
- [ ] Opened `/dev/design` source for this component type?
- [ ] Using a `ds/` component or a board pattern (not an inline one-off)?
- [ ] Text uses `t-*`, not `text-[Npx]`?
- [ ] Buttons `size-7` / `px-3 py-1.5`; icons `size-4`/`size-3.5`; cards `p-3/p-4`?
- [ ] Right switcher (`SegmentedTabs` for modes, `Toggle` for boolean — never `Toolbar`)?
- [ ] New/changed component added to `ds/` **and** given a board `<Frame>`?
- [ ] Verified in the real app, light + dark?

---

## 7. Outstanding debt to repay (the mess I made)
- **Library**: replace the `Toolbar` view switch with `SegmentedTabs` (icon variant); shrink the
  import button `size-9 → size-7`; shrink `LibraryFolderCard` (thumbs are too tall — use a compact
  grid, not `aspect-square` full-width); retitle with `t-h2`; **add `FileThumb` +
  `LibraryFolderCard` Frames to `SecData`**.
- Audit other recently-touched surfaces (dock header, Home, account menu) against §2 sizes.
