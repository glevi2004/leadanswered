# ONBOARDING-CONNECT — one org, written by onboarding, read by every page

> Spec doc (Levi + Claude, 2026-07-14). The bridge that turns the throwaway onboarding sketch
> and the static Apex fixture into ONE coherent, per-org, async data layer — shaped so a real
> backend drops in later without losing features. Companions: `VISION-LU.md` (the product
> vision + Lu rename), `DOGFOOD.md`, `FEATURES.md`, `app-ui/*` (built module specs).
> Docs-then-code: this is the contract; code lands on explicit go, workstream by workstream.

## 1. The problem this closes

Two disconnected halves:

- **The onboarding sketch** (`/dev/onboarding`, `OnboardingSketch.tsx`) collects a local
  `Workspace`, fabricates everything ("Marcus", "Apex Roofing", the (844) line, fake events),
  and ends on a **dead "Open my workspace" button**. Nothing it gathers reaches the app.
- **The app pages** read one static, single-tenant fixture (`fixtures/apex.ts`) through a
  `demo ? *Mock() : await *Real(orgId)` branch **duplicated in ~20 pages**. Mocks are sync +
  org-less; reals are async + Supabase-backed (only home/crm/schedule have a real path).

They never share an org. The fix — and it's a single move — is a **per-org, async, in-memory
"workspace" that onboarding writes and every page reads, shaped exactly like the eventual DB.**
That one move delivers both goals: (a) you finish onboarding and land in the app as *your* org;
(b) the mock layer now mirrors real DB calls, so the backend is a drop-in.

## 2. The `DataRepo` interface (the seam)

One interface, **async and org-scoped**, with one method per existing accessor. Signatures
mirror today's `*Real(organizationId, …)` shape — so the real Supabase functions already fit,
and the mocks are wrapped to match.

```ts
// src/lib/data/repo.ts
export interface DataRepo {
  readonly orgId: string;

  // reads (one per current *Mock/*Real pair)
  getOrganization(): Promise<Organization>;
  getHomeData(): Promise<HomeData>;
  listEscalations(): Promise<OpenEscalation[]>;
  listContacts(): Promise<Contact[]>;
  getContact(id: string): Promise<ContactDetail | null>;
  listScheduleItems(): Promise<ScheduleItem[]>;
  getRoute(date: string): Promise<RoutePlan | null>;
  listQuotes(): Promise<Array<Quote & { contactName: string }>>;
  getQuote(id: string): Promise<Quote | null>;
  quoteSummary(): Promise<QuoteSummary>;
  listInvoices(): Promise<Array<Invoice & { contactName: string }>>;
  getInvoice(id: string): Promise<Invoice | null>;
  listCampaigns(): Promise<Campaign[]>;
  listChases(): Promise<ChaseItem[]>;
  listPosts(): Promise<Post[]>;
  listMembers(): Promise<Member[]>;
  getAnalytics(range: RangePreset): Promise<AnalyticsSnapshot>;
  // …one per module; the current index.ts accessors map 1:1

  // writes (in-memory today; point at Supabase later, same signatures)
  saveOrgConfig(config: OrganizationConfig): Promise<void>;   // = buildConfig(OnboardingState)
  setModuleStatus(key: ModuleKey, status: ModuleStatus): Promise<void>; // the unlock
  completeSetupStep(step: SetupStepKey): Promise<void>;
  seedRecord<T>(collection: string, record: T): Promise<void>; // e.g. team member, campaign
}
```

Two implementations, one factory:

```ts
export async function getRepo(ctx?: { orgId?: string }): Promise<DataRepo>
// resolves demo + active-org profile from cookies, returns mockRepo or realRepo
```

- **`mockRepo`** — wraps the current `*Mock` fixtures, made **async + org-aware**: serves the
  Apex fixtures for org `apex`, the onboarded `OrgProfile` for the user's org. Reuses
  `patchStore` for mutations; writes land in the in-memory/cookie store.
- **`realRepo`** — the existing `*Real` Supabase functions (`home`, `crm`, `schedule` today;
  the other modules stub until their tables ship). Already async + `.eq("organizationId", …)`.

**Migration:** every page drops its `demo ? mock() : await real()` fork for
`const repo = await getRepo(); const x = await repo.listX()`. Pages stop knowing about demo.
When a module gets a real backend, only `realRepo`'s method changes — no page edits.

## 3. `Organization` + the `OrgProfile` write contract

Today the org is untyped (`requireOrganization(): Promise<Record<string, any>>`). Introduce a
real type, and give fixture entities an `organizationId` (or serve them under an org key).

```ts
export interface Organization {
  id: string;
  companyName: string;
  ownerName: string;
  timezone: string;
  twilioNumber?: string;               // the assistant line
  modules?: Partial<Record<ModuleKey, ModuleStatus>>; // per-org gating override (already read)
  config: OrganizationConfig;          // = the buildConfig payload
}
```

The **write contract is the config the real wizard/settings already produce** —
`buildConfig(OnboardingState)` in `src/lib/onboarding-state.ts` (`companyName`, `sarahName`,
`personaNotes`, `projectTypes`, `serviceArea`, `qualificationRules`, `standingAvailability`
{timezone, windows}, `escalationTopics`, `recipients`). Onboarding calls
`repo.saveOrgConfig(buildConfig(state))`. In mock mode this writes the in-memory store; the
real swap points `saveOrgConfig` at the existing `setOrganizationConfig`.

`OrgProfile` (the in-memory org record) = that config + a few **vision-only** fields not yet in
the schema: `siteHandle` (`{handle}.lu.computer`), `assistantEmail` (`{handle}@lu.computer`),
`gcalConnected`, and `setupSteps` (per-step progress driving §6). These are additive; they get
real columns when their modules do.

**Boundary:** `(app)` pages are server components → the active org + its compact profile live in
a **server-readable cookie** (`la_org`), written client-side by the onboarding (like
`DemoToggle` writes `la_demo`). Honest-empty means the profile is basically config + empty
collections, so it fits; a dev-only server `Map` keyed by a cookie id is the fallback if it ever
outgrows a cookie.

## 4. Two demo profiles, selectable

Demo mode exposes the org-aware seam as a **choice** between two seeded orgs:

| Profile | Org | What it shows |
|---|---|---|
| **Mature** | `apex` | Apex Roofing, fully populated across every module — today's design-partner demo. |
| **New** | onboarded | A freshly-onboarded org (set through the flow); honest-empty, with "Needs you" setup steps that progressively unlock. |

Extend `DemoToggle` (`src/components/app/DemoToggle.tsx`, `la_demo`) into a picker via an
`la_org` cookie: **Off · Demo: Mature (Apex) · Demo: New (onboarded)**. `getRepo` resolves the
active profile from the cookie. Selecting **New** with no onboarded org yet routes to
`/dev/onboarding` so there's always something to enter.

## 5. Onboarding → app handoff

1. The sketch's throwaway `Workspace` is replaced by the real `OnboardingState`: trade→
   `projectTypes`, business name→`company`, hours→`standingAvailability`, cell→`recipients`,
   gcal→`gcalConnected`, assistant name→`sarahName`. Conversational UX unchanged; only what it
   **writes** changes.
2. A **name-your-assistant** step: default **"Lu"** or custom (e.g. "Sarah") → sets `sarahName`;
   the assistant introduces itself with the chosen name for the rest of the flow.
3. Availability reuses the real helpers (`windowsToCells`/`cellsToWindows`), so painted hours
   flow straight into Schedule.
4. Vision surfaces (links-scrape, "{company} Lu Space" site, assistant email) write minimal
   records (`siteHandle`, `assistantEmail`) so Website/Settings reflect them — theater that
   leaves a trace.
5. **"Open my workspace"** calls `repo.saveOrgConfig(...)`, sets the `la_org` cookie to the
   onboarded org, and routes into the real `(app)` shell.

## 6. "Needs you" = the Lu-interaction queue (onboarding continues in-app)

Onboarding does not end at the handoff. The Home **"Needs you"** section becomes the one place
the owner learns *what needs them* — so the concept teaches itself:
**Needs you = interactions I have with Lu, each of which unlocks more of the product.**

`NeedsAttention` renders one queue, three kinds:

1. **Approvals** — approve a draft before Lu sends it *(exists)*.
2. **Escalations** — answer a customer question Lu couldn't *(exists)*.
3. **Setup next-steps (NEW)** — guided **conversations with Lu** (not forms) that unlock a
   capability: add your team · build your website · launch your first review campaign · import
   your history · connect your domain · connect Google. Rendered as a distinct labeled group
   ("Set up with Lu") beneath the live items, which stay primary.

**Each setup step opens Lu** (widget/dock/`/sarah`) with prefilled context and she walks the
owner through it. **Completing it unlocks + populates the module** via the gating override that
already exists (`organization.modules[key]`, read by `resolveModuleStatus`): the interaction
calls `repo.setModuleStatus(key, "live")` and `repo.seedRecord(...)`. Concrete unlocks:

| Step | Lu does | Result |
|---|---|---|
| Add your team | takes members conversationally | builds a viewable **org chart** (new Team view); Team goes live |
| Build your website | drafts "{company} Lu Space" | Website reflects it |
| Launch review campaign | runs your first wave | Reviews goes live with the campaign |
| Import history · domain · Google | same shape | module populated + live |

**One source, three surfaces:** the Ready-screen ROI ladder, the Home Get-started checklist, and
these "Needs you" steps all read `OrgProfile.setupSteps` — never hardcoded. Un-unlocked modules
stay honest-empty (real fresh-org behavior).

## 7. Naming model

- **Lu = the product/brand** (landing, system copy). Landing already uses Lu.
- **Per-org assistant name = `sarahName`**, default changed **"Sarah" → "Lu"** (the
  `initial.sarahName || "Sarah"` fallback in `onboarding-state.ts:133`), customizable in
  onboarding. Conversational surfaces render the org's chosen name: the welcome message in
  `(app)/layout.tsx`, the thread, `scriptedReply`.
- **App chrome → "AI Assistant"** (generic): the `sarah` nav label (`MODULES.sarah.label`,
  `registry.ts`) and the top-right `SarahTrigger` pill (`components/sarah/SarahWidget.tsx`).
- Component/file names (`SarahProvider`, `/sarah` route) stay. The full Sarah→Lu **symbol**
  rename (`VISION-LU §7`) is a separate mechanical pass.

## 8. Deliberately deferred

- Real Supabase writes / auth / the self-serve cutover — handoff stays in-memory.
- Real backends for the 7 mock-only modules — unlock reveals their *already-built* UI on the
  org's in-memory data via the gating override; the only net-new view is the Team **org chart**.
- Pre-populated sample data — the New profile is honest-empty by design.
- The full Sarah→Lu code-symbol rename.
- The prior spec-drift / fixture-coherence pass (separate; note where adding `organizationId`
  touches those fixtures).

## 9. Build order & verification

Workstreams (each on explicit go): **A** repository seam → **B** onboarded-org store +
profile selector → **C** wire onboarding → **D** Needs-you queue + unlocks → **E** naming.

Done when: `tsc` clean; run `/dev/onboarding` → name the assistant → "Open my workspace" →
`/home` shows *your* company + assistant name + line + hours, "Needs you" shows the setup group,
CRM/Schedule honest-empty, Schedule availability shows your painted hours; clicking a setup step
(e.g. add your team) opens Lu → completing it flips the module live and renders the org chart,
then the step leaves "Needs you"; the profile selector switches Mature↔New with every page
re-rendering through the same repo (Apex demo unbroken); no residual per-page mock/real branches.

## 10. Implementation status (as built — 2026-07-14)

Built and verified end-to-end (`tsc` clean; Playwright: onboarding → Open my workspace → `/home`
as *your* org → unlock Team → org chart; Mature/Apex regression intact):

- **Active-org seam** — `src/lib/data/org-profile.ts` (`OrgProfile`, `buildOnboardedOrg`,
  `buildApexOrg`, `resolveInjectedOrg`) + `src/lib/org-cookie.ts` (client writes/patches). Cookies:
  `la_org` = off·mature·new, `la_org_profile` = the JSON profile.
- **The realization of the repo goal** — instead of a parallel `mockRepo`, the **New org uses the
  *existing real* Supabase accessors** (`getHomeDataReal`, `listContactsReal`, `listItemsReal`,
  `listOpenEscalations`) against an org id with no rows → honest-empty *for free*, with the
  `OrgProfile` injected as the `organization` object (`requireOrganization()` returns it when the
  cookie is set; `isDemoMode()` → false for New). This **mirrors real DB calls by literally using
  them.** Mature keeps the Apex fixtures (`isDemoMode()` → true). The `getRepo`/`DataRepo` factory
  of §2 remains the target for *consolidating the ~20 per-page `demo ? mock : real` branches* into
  one call — a cleanup, not needed for the experience; the branches are now correctly exercised
  (Mature→fixtures, New→empty-real, Off→db).
- **Every module works, just empty (New org).** A freshly-onboarded org is a *real user with the
  whole built app and no data yet* — NOT the coming-soon product. `resolveModuleStatus` returns
  `"live"` for all modules when `demoProfile === "new"`, and each module page feeds **empty**
  collections (not Apex fixtures) so it renders its honest-empty state. Setup steps therefore
  *populate/seed* (Team → seeds the org chart) rather than gate. Fixed empty-data breaks:
  `ReviewsHome` `Math.min/max` over `[]`, the Home Reputation 0-state, and a server→client
  lucide-icon crash on the Analytics empty state.
- **Handoff (C)** — `OnboardingSketch` gained a name-your-assistant step (`handle → assistant →
  site`, default "Lu"); "Open my workspace" writes the `OrgProfile` and lands on `/home`; ROI rungs
  now deep-link.
- **Continue in-app (D)** — the remaining setup steps render as **rows inside the "Needs you"
  card itself** (same chip · label · hover-expand UI as approvals/escalations; `ApprovalRows` +
  `setup-steps.ts`), each expanding to a "Set up with {assistant}" action → `patchOnboardedProfile`
  unlocks the module (`modules[key]="live"`) + navigates; the **Team** step seeds members and the
  new **Org chart** view (`components/team/OrgChart.tsx`). "Needs you" = one queue of Lu-interactions.
- **Naming (E)** — default assistant name "Sarah"→"Lu"; chrome → "AI Assistant" (sidebar item +
  trigger pill); welcome message renders the org's `sarahName`.

**Deferred / follow-up:**
- Collapse the remaining per-page `demo ? mock : real` branches behind the §2 `getRepo` factory
  (cleanup; the two other gated-module pages already behave correctly per-org).
- The **full copy rebrand** — ~141 user-visible "Sarah" literals across ~63 files (e.g. "What
  Sarah's been doing", "Who Sarah knows") still read "Sarah"; these are the deferred Sarah→Lu pass
  (decision #4). They render fine but sit oddly next to "Set up with Lu" until that pass runs.
- "Answer/Set up via Lu" currently unlocks + navigates rather than opening a scripted Lu
  conversation per step — the deeper "she walks you through it in chat" flow of §6 can come next.
