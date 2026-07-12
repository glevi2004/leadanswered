import type { Approval, SarahAction, SarahMessage } from "../shared";

/**
 * THE demo business — Apex Roofing (00-foundation §5). The only place mock
 * entities live; every module's mock provider serves from here so the whole
 * app demos as one living company. Never shown to real partners outside demo mode.
 */

const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60_000).toISOString();
const ahead = (mins: number) => new Date(now + mins * 60_000).toISOString();

export const APEX = {
  companyName: "Apex Roofing",
  ownerName: "Marcus",
  timezone: "America/New_York",
} as const;

/* ---------------------------------- approvals --------------------------------- */

export const APEX_APPROVALS: Approval[] = [
  {
    id: "apr_1",
    kind: "review_ask",
    createdAt: ago(42),
    summary: "Review ask → Mike O'Brien",
    preview:
      "Hi Mike, it's Marcus from Apex Roofing — glad the roof's held up great. If we did right by you, a quick Google review would mean a lot: g.page/apexroofing/review",
    contactId: "ct_obrien",
    status: "pending",
  },
  {
    id: "apr_2",
    kind: "site_edit",
    createdAt: ago(160),
    summary: "Website — add copper gutters to Services",
    preview:
      "New “Copper gutters” section on the Services page: photos from the Alvarez estimate + a line that we install and repair copper. Ready to publish.",
    entityId: "v14",
    status: "pending",
  },
  {
    id: "apr_3",
    kind: "customer_message",
    createdAt: ago(15),
    summary: "Reply → Jorge Alvarez",
    preview:
      "Hi Jorge — Marcus says yes, we install copper gutters. Want me to add that to Thursday's estimate so he can price both at once?",
    contactId: "ct_alvarez",
    status: "pending",
  },
];

/* --------------------------------- activity ----------------------------------- */

export const APEX_ACTIONS: SarahAction[] = [
  { id: "act_1", at: ago(15), module: "core", summary: "Drafted a reply to Jorge Alvarez about copper gutters — waiting on your OK", contactId: "ct_alvarez" },
  { id: "act_2", at: ago(42), module: "reviews", summary: "Drafted a review ask for Mike O'Brien — waiting on your OK", contactId: "ct_obrien" },
  { id: "act_3", at: ago(95), module: "crm", summary: "Booked Sam & Priya Patel — Thursday 9:00 AM, Newton", contactId: "ct_patel", href: "/schedule" },
  { id: "act_4", at: ago(130), module: "followups", summary: "Nudged Linda Tran — she went quiet after giving her address", contactId: "ct_tran" },
  { id: "act_5", at: ago(160), module: "website", summary: "Drafted the copper-gutters section on the Services page", href: "/website" },
  { id: "act_6", at: ago(60 * 26), module: "quotes", summary: "Sent quote Q-1043 to Jorge Alvarez — $1,850, leak repair", contactId: "ct_alvarez" },
  { id: "act_7", at: ago(60 * 30), module: "crm", summary: "Qualified a new website lead — Linda Tran, roof repair in Waltham", contactId: "ct_tran" },
  { id: "act_8", at: ago(60 * 49), module: "reviews", summary: "Dana Miller left a ⭐⭐⭐⭐⭐ review after her roof replacement", contactId: "ct_dana" },
  { id: "act_9", at: ago(60 * 52), module: "invoices", summary: "Invoice INV-2031 marked paid — Dana Miller, $14,200", contactId: "ct_dana" },
  { id: "act_10", at: ago(60 * 75), module: "crm", summary: "Answered a missed call by text — Sam & Priya Patel, new estimate request", contactId: "ct_patel" },
];

/* ---------------------------------- the thread -------------------------------- */

export const APEX_THREAD: SarahMessage[] = [
  { id: "m_1", at: ago(60 * 26), role: "owner", body: "Quote the Alvarez leak repair — 1850, one day job", via: "sms" },
  { id: "m_2", at: ago(60 * 26 - 1), role: "sarah", body: "Done ✅ Q-1043 for $1,850 drafted and texted to Jorge to approve.", via: "sms" },
  { id: "m_3", at: ago(150), role: "owner", body: "what's thursday look like?", via: "sms" },
  {
    id: "m_4",
    at: ago(149),
    role: "sarah",
    body: "3 estimates — 9:00 Newton (the Patels), 11:30 Brookline, 2:00 Waltham. I routed them shortest-drive; you've got a 40-min gap at 1.",
    via: "sms",
  },
  { id: "m_5", at: ago(20), role: "owner", body: "did jorge ever answer on the quote?", via: "app" },
  {
    id: "m_6",
    at: ago(19),
    role: "sarah",
    body: "Not yet — 3 days quiet. He did ask if you install copper gutters; I drafted a reply for you above. If he stays quiet I'll give him a gentle nudge tomorrow morning.",
    via: "app",
  },
];

/* ------------------------------- home surfaces -------------------------------- */

export interface ScheduleGlanceItem {
  id: string;
  startAt: string;
  name: string;
  town: string;
  kind: "estimate" | "job";
  driveGapAfter?: string; // "40-min gap"
}

export const APEX_SCHEDULE_GLANCE: { dayLabel: string; items: ScheduleGlanceItem[] } = {
  dayLabel: "Thursday",
  items: [
    { id: "ap_1", startAt: ahead(60 * 20), name: "Sam & Priya Patel", town: "Newton", kind: "estimate" },
    { id: "ap_2", startAt: ahead(60 * 22.5), name: "R. Chen", town: "Brookline", kind: "estimate", driveGapAfter: "40-min gap at 1:00" },
    { id: "ap_3", startAt: ahead(60 * 25), name: "T. Nguyen", town: "Waltham", kind: "estimate" },
  ],
};

export const APEX_ESCALATIONS = [
  {
    id: "esc_301",
    question: "Do you install copper gutters?",
    contactName: "Jorge Alvarez",
    contactId: "ct_alvarez",
    createdAt: ago(180),
  },
];

export const APEX_HOME_STATS = {
  newLeadsThisWeek: 6,
  medianResponseSecs: 42,
  bookedThisWeek: 4,
  quotesAwaiting: 1,
  quotesAwaitingCents: 185_000, // q_1043 Alvarez
  owedCents: 338_000, // inv_2032 Sullivan $2,400 + inv_2033 Delgado $980
  overdueCents: 240_000, // Sullivan, 14 days
  reviewsCollected: 21,
  reviewsAvg: 4.9,
};

/* ------------------------- scripted replies (mock turns) ---------------------- */

const SCRIPTED: Array<{ match: RegExp; reply: string }> = [
  {
    match: /thursday|schedule|today|tomorrow|week/i,
    reply:
      "Thursday you've got 3 estimates — 9:00 Newton (the Patels), 11:30 Brookline, 2:00 Waltham. Routed shortest-drive, 40-min gap at 1. Want me to move anything?",
  },
  {
    match: /quiet|follow.?up|chas/i,
    reply:
      "Two things are quiet: Linda Tran went silent after giving her address (I nudged her this morning), and Jorge hasn't answered quote Q-1043 — I'll give him a gentle push tomorrow unless you'd rather I hold off.",
  },
  {
    match: /jorge|alvarez|gutter/i,
    reply:
      "Jorge's quote (Q-1043, $1,850) is 3 days unanswered. He asked about copper gutters — my draft reply is waiting on your OK. Want me to send it?",
  },
  {
    match: /quote/i,
    reply: "One quote is out: Q-1043 to Jorge Alvarez, $1,850 for the leak repair — sent 3 days ago, no answer yet.",
  },
  {
    match: /review/i,
    reply:
      "The campaign's at 21 new reviews, 4.9★ average, from 63 asks. Mike O'Brien is next — his ask is drafted and waiting on your OK.",
  },
  {
    match: /waiting|anything.*me|approv/i,
    reply:
      "Three things need you: a reply to Jorge about copper gutters, Mike O'Brien's review ask, and the copper-gutters section for the website. They're all one tap above.",
  },
  {
    match: /miller|dana/i,
    reply:
      "Dana Miller's job is wrapped up — $14,200 roof replacement, invoice paid, and she left a 5-star review. Textbook.",
  },
];

export function scriptedReply(text: string): string {
  for (const s of SCRIPTED) if (s.match.test(text)) return s.reply;
  return "On it — I'll take care of that and let you know the moment it's done.";
}

/* --------------------------------- CRM cast ----------------------------------- */

import type { Contact, TimelineEvent } from "../shared";
import type { ContactSidebar } from "../crm/types";

const d = (daysAgo: number, h = 10, m = 0) => {
  const t = new Date(now - daysAgo * 86_400_000);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
};

const IMPORT_NAMES = [
  "Frank Sullivan", "Rosa Delgado", "Tom Whalen", "Angela Brooks", "Pete Kowalski",
  "Maria Santos", "Jim McCarthy", "Denise Park", "Carl Jensen", "Beth Nguyen",
  "Ray Thompson", "Lucia Ferreira", "Ed Walsh", "Karen Doyle", "Sam Rizzo",
  "Tina Alves", "Bob Gallagher", "Nadia Hassan", "Vic Moreau", "Ellen Chu",
];
const TOWNS = ["Newton", "Brookline", "Waltham", "Needham", "Watertown", "Wellesley", "Dedham"];

function importedContact(i: number): Contact {
  const name = `${IMPORT_NAMES[i % IMPORT_NAMES.length]}${i >= IMPORT_NAMES.length ? ` ${Math.floor(i / IMPORT_NAMES.length) + 1}` : ""}`;
  return {
    id: `ct_imp_${i}`,
    kind: "customer",
    name,
    phone: `(617) 555-${String(1000 + i).slice(-4)}`,
    town: TOWNS[i % TOWNS.length],
    stage: "past_customer",
    source: "import",
    tags: ["quickbooks"],
    lastActivityAt: d(5),
    createdAt: d(5),
  };
}

export const APEX_CONTACTS: Contact[] = [
  {
    id: "ct_alvarez", kind: "lead", name: "Jorge Alvarez", phone: "(617) 555-0186",
    address: "18 Maple Ave, Brookline", town: "Brookline", stage: "qualifying",
    source: "website", tags: ["leak-repair"], lastActivityAt: ago(15), createdAt: d(4, 9),
  },
  {
    id: "ct_patel", kind: "lead", name: "Sam & Priya Patel", phone: "(617) 555-0122",
    address: "7 Crestview Rd, Newton", town: "Newton", stage: "qualifying",
    source: "missed_call", tags: [], lastActivityAt: ago(95), createdAt: d(1, 14),
  },
  {
    id: "ct_tran", kind: "lead", name: "Linda Tran", phone: "(781) 555-0170",
    address: "92 Summer St, Waltham", town: "Waltham", stage: "qualifying",
    source: "website", tags: [], lastActivityAt: d(2, 16), createdAt: d(2, 15),
  },
  {
    id: "ct_dana", kind: "customer", name: "Dana Miller", phone: "(617) 555-0142",
    address: "41 Birch St, Newton", town: "Newton", stage: "paid",
    source: "website", tags: ["roof-replacement"], lastActivityAt: d(2, 11), createdAt: d(60, 9),
  },
  {
    id: "ct_obrien", kind: "customer", name: "Mike O'Brien", phone: "(617) 555-0117",
    address: "3 Harding Ln, Needham", town: "Needham", stage: "past_customer",
    source: "import", tags: ["quickbooks"], lastActivityAt: d(5), createdAt: d(5),
  },
  ...Array.from({ length: 209 }, (_, i) => importedContact(i)),
];

export const APEX_TIMELINES: Record<string, TimelineEvent[]> = {
  ct_dana: [
    { id: "tl_d1", contactId: "ct_dana", at: d(60, 9, 14), type: "message", direction: "inbound", via: "sms", body: "Hi — we have a leak after the storm, ceiling stain is growing. Do you do full replacements?" },
    { id: "tl_d2", contactId: "ct_dana", at: d(60, 9, 15), type: "message", direction: "outbound", via: "sms", body: "So sorry to hear that, Dana — I can get you a free estimate this week. Is the house in Newton?" },
    { id: "tl_d3", contactId: "ct_dana", at: d(60, 9, 18), type: "message", direction: "inbound", via: "sms", body: "Yes, 41 Birch St. Tuesday morning works if you have it." },
    { id: "tl_d4", contactId: "ct_dana", at: d(60, 9, 19), type: "message", direction: "outbound", via: "sms", body: "Tuesday 10:00 it is — Marcus will see you then. You'll get a reminder the day before." },
    { id: "tl_d5", contactId: "ct_dana", at: d(58, 10), type: "appointment", appointmentId: "ap_d1", startAt: d(58, 10), status: "confirmed" },
    { id: "tl_d6", contactId: "ct_dana", at: d(55, 12), type: "quote", quoteId: "q_1042", label: "Q-1042 · roof replacement", totalCents: 1_420_000, status: "accepted" },
    { id: "tl_d7", contactId: "ct_dana", at: d(20, 9), type: "invoice", invoiceId: "inv_2031", label: "INV-2031", totalCents: 1_420_000, status: "paid" },
    { id: "tl_d8", contactId: "ct_dana", at: d(2, 11), type: "review", rating: 5, excerpt: "Apex was fantastic — fast, clean, and the roof looks amazing." },
    { id: "tl_d9", contactId: "ct_dana", at: d(1, 17), type: "note", author: "Marcus", body: "Referred her sister on Pine St — expect a call." },
  ],
  ct_alvarez: [
    { id: "tl_a1", contactId: "ct_alvarez", at: d(4, 9, 2), type: "message", direction: "inbound", via: "sms", body: "Got a leak over the porch. How much roughly to fix?" },
    { id: "tl_a2", contactId: "ct_alvarez", at: d(4, 9, 3), type: "message", direction: "outbound", via: "sms", body: "Good morning Jorge! Pricing really depends on what we find up there — the estimate is free. Want me to set one up?" },
    { id: "tl_a3", contactId: "ct_alvarez", at: d(3, 12), type: "quote", quoteId: "q_1043", label: "Q-1043 · leak repair", totalCents: 185_000, status: "sent" },
    { id: "tl_a4", contactId: "ct_alvarez", at: ago(180), type: "escalation", question: "Do you install copper gutters?", status: "open" },
  ],
  ct_patel: [
    { id: "tl_p1", contactId: "ct_patel", at: d(1, 14, 6), type: "message", direction: "outbound", via: "sms", body: "Hi, this is Sarah with Apex Roofing — sorry we missed your call! How can we help?" },
    { id: "tl_p2", contactId: "ct_patel", at: d(1, 14, 21), type: "message", direction: "inbound", via: "sms", body: "We're looking at replacing the roof before winter. Can someone come by?" },
    { id: "tl_p3", contactId: "ct_patel", at: d(1, 14, 22), type: "message", direction: "outbound", via: "sms", body: "Absolutely — Thursday 9:00 AM is open. Does that work?" },
    { id: "tl_p4", contactId: "ct_patel", at: ago(95), type: "appointment", appointmentId: "ap_1", startAt: ahead(60 * 20), status: "confirmed" },
  ],
  ct_tran: [
    { id: "tl_t1", contactId: "ct_tran", at: d(2, 15, 40), type: "message", direction: "inbound", via: "sms", body: "Hi, I filled the form about a roof repair — 92 Summer St, Waltham." },
    { id: "tl_t2", contactId: "ct_tran", at: d(2, 15, 41), type: "message", direction: "outbound", via: "sms", body: "Thanks Linda! Are you the homeowner there?" },
    { id: "tl_t3", contactId: "ct_tran", at: d(1, 9, 15), type: "message", direction: "outbound", via: "sms", body: "Morning Linda — just checking in. Still want us to take a look at that roof?" },
  ],
  ct_obrien: [
    { id: "tl_o1", contactId: "ct_obrien", at: d(5), type: "import", source: "QuickBooks" },
    { id: "tl_o2", contactId: "ct_obrien", at: d(4, 15), type: "note", author: "Marcus", body: "2024 full replacement, great customer — never asked him for a review." },
  ],
};

export const APEX_SIDEBARS: Record<string, ContactSidebar> = {
  ct_dana: {
    openEscalations: 0,
    facts: [
      { label: "First seen", value: "May 12" },
      { label: "Messages", value: "6" },
      { label: "Jobs", value: "1 · $14,200" },
    ],
  },
  ct_alvarez: {
    openQuote: { id: "q_1043", label: "Q-1043", totalCents: 185_000, status: "sent" },
    openEscalations: 1,
    facts: [
      { label: "First seen", value: "4 days ago" },
      { label: "Messages", value: "2" },
    ],
  },
  ct_patel: {
    nextAppointment: { id: "ap_1", startAt: ahead(60 * 20), status: "confirmed" },
    openEscalations: 0,
    facts: [
      { label: "First seen", value: "Yesterday" },
      { label: "Messages", value: "3" },
    ],
  },
  ct_tran: {
    openEscalations: 0,
    facts: [
      { label: "First seen", value: "2 days ago" },
      { label: "Messages", value: "3" },
    ],
  },
  ct_obrien: {
    openEscalations: 0,
    facts: [
      { label: "Imported", value: "5 days ago" },
      { label: "Last job", value: "2024" },
    ],
  },
};

/* ------------------------------- schedule cast -------------------------------- */

import type { RoutePlan, ScheduleItem } from "../schedule/types";

/** Next occurrence of a weekday (0=Sun..6=Sat) at local h:mm, as ISO. */
function nextWeekday(dow: number, h: number, min = 0): Date {
  const t = new Date(now);
  const delta = (dow - t.getDay() + 7) % 7 || 7;
  t.setDate(t.getDate() + delta);
  t.setHours(h, min, 0, 0);
  return t;
}
const iso = (d: Date) => d.toISOString();
const plusMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

const thu9 = nextWeekday(4, 9);
const thu1130 = nextWeekday(4, 11, 30);
const thu2 = nextWeekday(4, 14);
const jobStart = nextWeekday(1, 8); // Mon–Wed job banner

export const APEX_SCHEDULE_ITEMS: ScheduleItem[] = [
  {
    id: "si_thu1", kind: "estimate", contactId: "ct_patel", contactName: "Sam & Priya Patel",
    startAt: iso(thu9), endAt: iso(plusMin(thu9, 60)), status: "confirmed",
    address: "7 Crestview Rd, Newton", town: "Newton", lat: 42.337, lng: -71.209, bookedBy: "sarah",
  },
  {
    id: "si_thu2", kind: "estimate", contactId: "ct_brennan", contactName: "Tom Brennan",
    startAt: iso(thu1130), endAt: iso(plusMin(thu1130, 60)), status: "confirmed",
    address: "220 Beacon St, Brookline", town: "Brookline", lat: 42.331, lng: -71.121, bookedBy: "sarah",
  },
  {
    id: "si_thu3", kind: "estimate", contactId: "ct_rivera", contactName: "Ana Rivera",
    startAt: iso(thu2), endAt: iso(plusMin(thu2, 60)), status: "confirmed",
    address: "15 Pond Ln, Waltham", town: "Waltham", lat: 42.376, lng: -71.235, bookedBy: "sarah",
  },
  {
    id: "si_job_dana", kind: "job", contactId: "ct_dana", contactName: "Dana Miller — roof replacement",
    startAt: iso(jobStart), endAt: iso(plusMin(nextWeekday(3, 17), 0)), allDay: true,
    status: "confirmed", address: "41 Birch St, Newton", town: "Newton", bookedBy: "owner",
    notes: "Crew of 3 · dumpster arrives Monday 7am",
  },
];

export const APEX_BASE = { label: "Base — Watertown", lat: 42.371, lng: -71.183 };

export const APEX_ROUTE_THURSDAY: RoutePlan = {
  date: thu9.toISOString().slice(0, 10),
  baseLabel: "Base — Watertown",
  stopIds: ["si_thu1", "si_thu2", "si_thu3"],
  legs: [
    { from: "base", to: "si_thu1", driveMinutes: 15, miles: 6.2, approx: false },
    { from: "si_thu1", to: "si_thu2", driveMinutes: 25, miles: 8.1, approx: false },
    { from: "si_thu2", to: "si_thu3", driveMinutes: 25, miles: 9.4, approx: false },
    { from: "si_thu3", to: "base", driveMinutes: 15, miles: 7.0, approx: false },
  ],
  gaps: [
    { label: "25-min gap at 10:25", minutes: 25, usable: false },
    { label: "40-min gap at 1:00", minutes: 40, usable: false },
  ],
  bufferMinutes: 10,
  totalDriveMinutes: 80,
  totalMiles: 30.7,
};

// Minor schedule-only cast (07 §4): leads Sarah booked this week.
APEX_CONTACTS.push(
  {
    id: "ct_brennan", kind: "lead", name: "Tom Brennan", phone: "(617) 555-0199",
    address: "220 Beacon St, Brookline", town: "Brookline", stage: "booked",
    source: "website", tags: [], lastActivityAt: d(1, 12), createdAt: d(3, 10),
  },
  {
    id: "ct_rivera", kind: "lead", name: "Ana Rivera", phone: "(781) 555-0163",
    address: "15 Pond Ln, Waltham", town: "Waltham", stage: "booked",
    source: "missed_call", tags: [], lastActivityAt: d(1, 9), createdAt: d(2, 13),
  },
);
APEX_TIMELINES.ct_brennan = [
  { id: "tl_b1", contactId: "ct_brennan", at: d(3, 10, 5), type: "message", direction: "inbound", via: "sms", body: "Need someone to look at storm damage on the ridge." },
  { id: "tl_b2", contactId: "ct_brennan", at: d(3, 10, 6), type: "message", direction: "outbound", via: "sms", body: "We can do that, Tom — Thursday 11:30 is open. Work for you?" },
  { id: "tl_b3", contactId: "ct_brennan", at: d(3, 10, 30), type: "appointment", appointmentId: "si_thu2", startAt: iso(thu1130), status: "confirmed" },
];
APEX_TIMELINES.ct_rivera = [
  { id: "tl_r1", contactId: "ct_rivera", at: d(2, 13, 2), type: "message", direction: "outbound", via: "sms", body: "Hi Ana, this is Sarah with Apex Roofing — sorry we missed your call! How can we help?" },
  { id: "tl_r2", contactId: "ct_rivera", at: d(2, 13, 20), type: "message", direction: "inbound", via: "sms", body: "Gutter's pulling away from the fascia. Can someone come Thursday?" },
  { id: "tl_r3", contactId: "ct_rivera", at: d(2, 13, 21), type: "appointment", appointmentId: "si_thu3", startAt: iso(thu2), status: "confirmed" },
];
