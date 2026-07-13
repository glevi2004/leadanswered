# Travel-Time-Aware Scheduling + Customer Map — Research & Plan

> Status: **researched, not built.** Design spec for drive-time-aware slot offering and the customer-facing
> map/arrival experience. Sources cited inline in the research notes (three parallel research passes:
> competitor teardown, travel-time APIs + algorithm, customer map/ETA UX).

---

## 0. The wedge (the one thing to get right)

**Offer the customer only appointment slots that actually fit the organization's route.** A "12–4pm estimate
block" is not four bookable hours — each visit eats travel time to/from the adjacent jobs. Today our
`computeOpenWindows` treats the block as free minus booked minutes; it ignores driving entirely.

The competitor research found this is the **incumbents' biggest shared weakness**: drive-time logic almost
never reaches the *customer-facing self-booking* engine. Even Workiz and Housecall Pro admit online booking
offers pure duration + advance-notice slots — **a customer can self-book two jobs across town back-to-back
with zero travel allowance.** Jobber's online-booking "drive time" toggle is the rare exception, and even it
ignores travel to/from home base for the first/last job. So: **an SMS assistant that offers only
travel-feasible slots beats almost the entire field at their weakest point** — and we can make it the
default, not a $149/mo premium tier (where Jobber Grow, ServiceTitan Dispatch Pro, Workiz Pro, GorillaDesk
Growth all gate it).

---

## 1. How the incumbents do it (research summary)

- **Drive-time-aware slotting** (offer only feasible times): done well only by **Jobber "Find a Time"**,
  **ServiceTitan "Dispatch Pro"** (Titan Intelligence), **Workiz "Genius Scheduling"**; approximated by
  GorillaDesk (Drive Matrix). All **paywalled to mid/premium tiers**, and mostly **NOT wired into
  customer self-booking**.
- **Route optimization** (re-order a day): common as a manual button (Google Maps under the hood for
  Jobber/GorillaDesk). Not needed for a solo operator booking one lead at a time.
- **Travel buffer** (padding between jobs): clean setting in ServiceTitan, Jobber ("max drive time" +
  buffer), GorillaDesk ("Drive Buffer" 5–60 min).
- **Customer arrival WINDOW** (not exact time) is the industry standard — ServiceTitan even stores "job
  start time" and "arrival window" as separate fields. Windows preserve routing flexibility; the modern
  fix for the customer annoyance is pairing the window with live tracking.
- **"On my way" + live tracking:** ServiceTitan ("Track Now"), Workiz (live portal ETA), Housecall Pro
  (~$49/veh/mo hardware add-on) do real Uber-style moving-pin + ETA via a **hosted-page link** (never an
  image). **Jobber, GorillaDesk, Service Fusion "on my way" is manual** (tech taps, self-estimates "X min
  away") — no auto/geofenced trigger, no auto-updating ETA. Jobber's tracking link **auto-expires** at
  visit-complete (good privacy pattern).
- **Weak spots to beat:** (1) drive-time absent from customer booking; (2) "on my way" is manual/dumb for
  half the market; (3) live tracking gated behind hardware add-ons; (4) all of it gated to premium tiers;
  (5) no proactive "running late" to the *customer*; (6) crude arrival "windows".

---

## 2. What we already have vs. what's missing

Have: injectable **geocoding** (`packages/core/src/geo.ts`, currently offline ZIP-centroid), **`distanceMiles`**
(haversine), organization **base locations** (`serviceArea.baseLocations`), **`computeOpenWindows`** (the single
slot generator), the intake engine that offers 2–3 times, and Google Calendar sync.

Missing (the four build blocks):
1. **Appointment location** — the address is on the *lead*; the `Appointment` row has **no lat/lng**. To
   compute travel *between* estimates, each booked appointment needs its geocoded point stored.
2. **Street-level geocoding** — ZIP-centroid is too coarse (two houses 15 min apart share a ZIP). Need a
   real geocoder (behind the existing injectable `Geo` port).
3. **A real drive-time source** — haversine ≠ drive time. Need a Distance-Matrix API.
4. **Travel-aware slot generation** — the gap-insertion feasibility scan inside `computeOpenWindows`.

---

## 3. The algorithm (solo operator — NO route optimizer needed)

Frame it as **insertion feasibility** on a fixed sequence, not VRP. For a given day: the working window
`[W_start, W_end]`, existing appointments sorted by start (`A_1…A_n`, each with location `L_i`, `start`,
`end`), a base location `L_base`, and a new job `J` at `L_J` with duration `d`:

For each gap (before `A_1` from base; between `A_i` and `A_{i+1}`; after `A_n` back toward base):
```
t_min = max(W_start, prev_end + drive(prev_loc → L_J) + buffer)
t_max = min(W_end, next_start) − d − drive(L_J → next_loc) − buffer
feasible if t_min ≤ t_max   → every start in [t_min, t_max] is offerable
```
Where `prev_loc` = the previous job's location (or `L_base` for the first gap) and `next_loc` = the next
job's (or `L_base`/none for the last). `buffer` = a fixed operational pad (parking, find-the-door, wrap-up),
~10 min, on top of API drive time. **Unlike Jobber, we count base-location travel for the first/last job.**

This is an **O(n) scan** — trivial for a solo organization. It's the degenerate single-vehicle, fixed-sequence
case of Solomon's insertion heuristic; it's exact **as long as we never move a confirmed appointment** (the
normal booking assumption). Graduate to **Google OR-Tools / VROOM** only for multi-tech or whole-day
re-sequencing — out of scope for v1.

**Offering 2–3 times:** compute `[t_min,t_max]` per gap → round up to human starts (:00/:15/:30) → **rank by
added driving** (a slot that inserts next to an existing job beats one that strands them across town) → offer
2–3 spread out → **re-validate travel feasibility at the moment the lead confirms** (another lead may have
taken an overlapping slot; we already have the DB EXCLUDE constraint for double-booking).

---

## 4. APIs (cheap; fail-open)

- **Geocoding** (address → lat/lng, once per address, cache permanently): **Mapbox** (100k free/mo, but the
  "temporary" tier forbids long-term storage — use the storage-permitted SKU if we persist) or **Google
  Geocoding** ($5/1k, 10k free, storage allowed if tied to Maps usage). Geocode **once at booking**, persist
  on the appointment → volume is tiny.
- **Drive time** (`TravelTimeProvider` port, like `CalendarProvider`): **Mapbox Matrix API** as default
  (100k free elements/mo, live traffic → ~$0 at our scale); reach for **Google Routes `computeRouteMatrix`
  with `departureTime` + `TRAFFIC_AWARE`** when we need *predictive* traffic for a future slot (rush-hour
  booking days out — Google's future-time model is stronger). **Cache the matrix** (address-pair → drive
  time); most lookups are served from cache, only re-queried for fresh traffic. Expect **~$0–50/mo**.
- **FAIL-OPEN, always:** if geocoding or the matrix API errors/times out, fall back to a haversine-derived
  drive-time estimate (miles ÷ ~30mph + buffer) so a slot can still be offered and **booking never breaks**.
  Same principle as the Google-calendar free/busy merge.

---

## 5. Customer map + arrival experience (SMS-first)

- **Booking confirmation:** give the customer an **arrival WINDOW** (e.g. "8–10am"), not a false-precision
  exact time, derived from the feasible interval. SMS body = short line + **a short link** to a hosted
  "your appointment" page (NOT an MMS image — SMS-first best practice; an image can't update and can't be
  tapped to navigate). The page shows a **Google Maps Embed** (`place` mode — **free, unlimited**) pinned on
  their address + the **address as plain text** + a native **"Get directions"** deep link. Optionally one
  static-map MMS thumbnail on the confirmation.
- **Owner dashboard:** show the day's route + drive times on a map (Google Embed `directions` mode is
  free; or Mapbox Directions $2/1k) so the organization sees why slots were offered.
- **Day-of live tracking (later phase):** upgrade the same hosted page to a **live pin + ETA** (Google JS or
  Mapbox GL) fed by the organization's phone GPS + a matrix ETA, refreshing ~10s, behind an **unguessable,
  expiring token** (dies at visit-complete). **Software-only, no hardware** — undercuts Housecall Pro/Service
  Fusion's paid GPS add-ons.
- **Proactive "running late":** Sarah auto-texts the customer when the live ETA slips past ~15 min — a
  differentiator none of the incumbents nail for the *customer*, and a natural fit for our proactive layer +
  the hard-gate confirm.

---

## 6. Rollout phases

1. **Travel-feasible slotting (the wedge).** Street geocoder behind the `Geo` port; store `lat/lng` on the
   appointment; a `TravelTimeProvider` (Mapbox Matrix + cache + haversine fail-open); the gap-insertion scan
   in `computeOpenWindows`; the intake engine offers only feasible slots, ranked by added drive. Highest
   value, self-contained, no customer-facing UI.
2. **Customer map + arrival window** on the confirmation (hosted page + Google Embed + "Get directions").
3. **Live tracking + dynamic ETA** ("on my way" moving pin + auto "running late" text). Needs organization GPS.
4. **Later:** multi-tech assignment + whole-day route optimization (OR-Tools/VROOM); dynamic windows that
   tighten as the day firms up.

---

## 7. How we beat Jobber/ServiceTitan/Housecall

1. **Travel-feasibility at the SMS booking moment** — their weakest point; most don't do it in self-booking.
2. **It's the default, not a premium tier** — nobody offers travel-aware scheduling at an entry price.
3. **We count base-location travel** for the first/last job (Jobber skips this).
4. **Software-only live ETA + auto "running late"** — undercuts hardware add-ons; the AI assistant makes the
   proactive customer text natural.
5. **The AI already books over SMS** — bolting travel-feasibility onto that is a smaller lift for us than for
   a calendar-grid product, and the customer never sees the complexity.

---

## 8. Risks (this is the "cannot fuck up" list)

- **Bad geocode → wrong travel time → wrong slots.** Mitigate: confirm the address (we already collect the
  full street address), fail-open to haversine, and never offer a slot we can't validate at confirmation.
- **API latency/cost on the booking path.** Mitigate: cache aggressively, cap matrix size (new lead vs. that
  day's few stops), fail-open — never block a booking on an external call.
- **Future-time traffic** — a slot 3 days out at 5pm needs predictive traffic (Google Routes `departureTime`),
  not "now" traffic.
- **Never move a confirmed appointment** to fit a new lead — the insertion scan assumes a fixed sequence;
  breaking that assumption is what forces a full VRP solver (and would surprise already-booked customers).
- **Privacy** — customer address + any live location behind expiring, unguessable links; live location shared
  only during the active visit; address always available as accessible text alongside the map.
