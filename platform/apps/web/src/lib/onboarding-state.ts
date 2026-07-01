/**
 * Shared client state for the contractor config — used by BOTH the onboarding
 * wizard (one section per step) and the settings page (all sections at once).
 * `buildConfig` turns this state into the `contractorConfigSchema` shape that
 * `saveOnboardingAction` persists, so the two surfaces save identically.
 */

export const DAYS = [
  { n: 1, label: "Mon" },
  { n: 2, label: "Tue" },
  { n: 3, label: "Wed" },
  { n: 4, label: "Thu" },
  { n: 5, label: "Fri" },
  { n: 6, label: "Sat" },
  { n: 0, label: "Sun" },
];
// Availability grid: 30-min rows from 06:00 to 20:30. Each cell is a 30-min block [t, t+30).
export const CELL_MIN = 30;
const GRID_START_MIN = 6 * 60; // 06:00
const GRID_END_MIN = 21 * 60; // 21:00 (last selectable cell starts at 20:30)
const minToHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const hhmmToMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};
export const TIMES = Array.from(
  { length: (GRID_END_MIN - GRID_START_MIN) / CELL_MIN },
  (_, i) => minToHHMM(GRID_START_MIN + i * CELL_MIN),
);

export type AvailabilityWindow = { dayOfWeek: number; start: string; end: string };

/** Expand availability windows into the 30-min cell keys ("dayOfWeek|HH:MM") the grid toggles. */
export function windowsToCells(windows: AvailabilityWindow[]): Set<string> {
  const cells = new Set<string>();
  for (const w of windows) {
    for (let m = hhmmToMin(w.start); m < hhmmToMin(w.end); m += CELL_MIN) {
      cells.add(`${w.dayOfWeek}|${minToHHMM(m)}`);
    }
  }
  return cells;
}

/** Merge contiguous selected 30-min cells per day back into windows for storage. */
export function cellsToWindows(cells: Set<string>): AvailabilityWindow[] {
  const byDay = new Map<number, number[]>();
  for (const key of cells) {
    const [d, t] = key.split("|");
    (byDay.get(Number(d)) ?? byDay.set(Number(d), []).get(Number(d))!).push(hhmmToMin(t));
  }
  const windows: AvailabilityWindow[] = [];
  for (const [day, minsRaw] of byDay) {
    const mins = [...minsRaw].sort((a, b) => a - b);
    let runStart = mins[0];
    let prev = mins[0];
    for (let i = 1; i <= mins.length; i++) {
      if (mins[i] === prev + CELL_MIN) {
        prev = mins[i];
        continue;
      }
      windows.push({ dayOfWeek: day, start: minToHHMM(runStart), end: minToHHMM(prev + CELL_MIN) });
      runStart = mins[i];
      prev = mins[i];
    }
  }
  return windows.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start));
}

export const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export type RecipientRow = { name: string; phone: string; email: string; events: Set<string> };

export type OnboardingInitial = {
  companyName: string;
  sarahName?: string;
  personaNotes?: string | null;
  projectTypes?: string[];
  baseLocations?: { zip: string; radiusMiles: number }[];
  includeOverrides?: string[];
  excludeOverrides?: string[];
  requireDecisionMaker?: boolean;
  windows?: AvailabilityWindow[];
  escalationTopics?: string[];
  recipients?: { name: string; phone?: string | null; email?: string | null; subscriptions?: { eventType: string }[] }[];
};

export type OnboardingState = {
  company: string;
  sarahName: string;
  persona: string;
  projectTypes: string[]; // verbatim labels (chip picker)
  baseZip: string;
  radius: number;
  include: string;
  exclude: string;
  requireDM: boolean;
  slots: Set<string>; // "dayOfWeek|HH:MM"
  escalation: string;
  recipients: RecipientRow[];
};

/** Map a contractor DB row (supabase-js result) into the wizard/settings seed shape. */
export function initialFromContractor(c: Record<string, any>): OnboardingInitial {
  return {
    companyName: c.companyName,
    sarahName: c.sarahName,
    personaNotes: c.sarahPersonaNotes,
    projectTypes: c.projectTypes ?? [],
    baseLocations: c.baseLocations ?? [],
    includeOverrides: c.includeOverrides ?? [],
    excludeOverrides: c.excludeOverrides ?? [],
    requireDecisionMaker: c.qualificationRules?.requireDecisionMaker ?? true,
    windows: c.standingAvailability?.windows ?? [],
    escalationTopics: c.escalationTopics ?? [],
    recipients: (c.recipients ?? []).map((r: any) => ({
      name: r.name,
      phone: r.phone,
      email: r.email,
      subscriptions: r.subscriptions ?? [],
    })),
  };
}

export function stateFromInitial(initial: OnboardingInitial): OnboardingState {
  return {
    company: initial.companyName,
    sarahName: initial.sarahName || "Sarah",
    persona: initial.personaNotes ?? "",
    projectTypes: initial.projectTypes?.length ? initial.projectTypes : ["Roof repair", "Roof replacement"],
    baseZip: initial.baseLocations?.[0]?.zip ?? "",
    radius: initial.baseLocations?.[0]?.radiusMiles ?? 25,
    include: (initial.includeOverrides ?? []).join(", "),
    exclude: (initial.excludeOverrides ?? []).join(", "),
    requireDM: initial.requireDecisionMaker ?? true,
    slots: windowsToCells(initial.windows ?? []),
    escalation: (initial.escalationTopics?.length
      ? initial.escalationTopics
      : ["financing or payment plans", "warranties", "licensing or insurance"]
    ).join(", "),
    recipients: initial.recipients?.length
      ? initial.recipients.map((r) => ({
          name: r.name,
          phone: r.phone ?? "",
          email: r.email ?? "",
          events: new Set((r.subscriptions ?? []).map((s) => s.eventType)),
        }))
      : [{ name: "", phone: "", email: "", events: new Set(["booking_confirmed", "new_qualified_lead"]) }],
  };
}

/** Assemble the contractorConfig payload from the working state. */
export function buildConfig(s: OnboardingState) {
  return {
    companyName: s.company,
    sarahName: s.sarahName,
    personaNotes: s.persona || null,
    projectTypes: s.projectTypes,
    serviceArea: {
      baseLocations: [{ zip: s.baseZip, radiusMiles: Number(s.radius) }],
      includeOverrides: splitList(s.include),
      excludeOverrides: splitList(s.exclude),
    },
    qualificationRules: { requireDecisionMaker: s.requireDM },
    standingAvailability: {
      timezone: "America/New_York",
      windows: cellsToWindows(s.slots),
    },
    escalationTopics: splitList(s.escalation),
    recipients: s.recipients
      .filter((r) => r.name.trim())
      .map((r) => ({
        name: r.name.trim(),
        phone: r.phone.trim() || null,
        email: r.email.trim() || null,
        subscriptions: [...r.events].map((eventType) => ({ eventType, channels: "both" as const })),
      })),
  };
}
