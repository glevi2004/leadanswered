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
export const TIMES = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

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
  slots?: { dayOfWeek: number; time: string }[];
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
    slots: c.standingAvailability?.slots ?? [],
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
    slots: new Set((initial.slots ?? []).map((s) => `${s.dayOfWeek}|${s.time}`)),
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
      slots: [...s.slots]
        .map((k) => {
          const [day, time] = k.split("|");
          return { dayOfWeek: Number(day), time };
        })
        .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.time.localeCompare(b.time)),
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
