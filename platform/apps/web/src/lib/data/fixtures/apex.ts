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
    summary: "Hello → Nina Miller (Dana's referral)",
    preview:
      "Hi Nina — Dana passed along your number about the Pine St roof. Marcus can take a look this week; does Thursday afternoon work?",
    status: "pending",
  },
  {
    id: "apr_4",
    kind: "post",
    createdAt: ago(105),
    summary: "Blog post — A full roof replacement in Newton",
    preview:
      "When the Millers called about their 20-year-old roof, we knew the storm had only finished what time had started…",
    contactId: "ct_dana",
    entityId: "post_301",
    status: "pending",
  },
  {
    id: "apr_5",
    kind: "social_post",
    createdAt: ago(104),
    summary: "Facebook post — the Miller roof",
    preview:
      "Another Newton roof done right ✅ 20 years old, replaced in two days — swipe for the before and after.",
    contactId: "ct_dana",
    entityId: "sp_301",
    status: "pending",
  },
];

/* --------------------------------- activity ----------------------------------- */

export const APEX_ACTIONS: SarahAction[] = [
  { id: "act_1", at: ago(15), module: "core", summary: "Drafted a hello to Nina Miller — Dana's referral about the Pine St roof", contactId: "ct_dana" },
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
    body: "Not yet — 3 days quiet. He did ask if you install copper gutters — that question's waiting on you in Needs you. If he stays quiet I'll give him a gentle nudge tomorrow morning.",
    via: "app",
  },
];

/** Past widget conversations — the "New chat ▾" history (one thread per topic, Apollo-style). */
export const APEX_PAST_CHATS: { id: string; title: string; messages: SarahMessage[] }[] = [
  {
    id: "chat_dana",
    title: "Dana's roof wrap-up",
    messages: [
      { id: "pc_d1", at: ago(60 * 24 * 2 + 300), role: "owner", body: "did dana's invoice go out?", via: "app" },
      {
        id: "pc_d2",
        at: ago(60 * 24 * 2 + 299),
        role: "sarah",
        body: "Went out the day the crew wrapped — INV-2031, $14,200. She paid it this morning ✅ I'll ask her for a review tomorrow once the dust settles.",
        via: "app",
      },
      { id: "pc_d3", at: ago(60 * 24 * 2 + 295), role: "owner", body: "perfect. she mentioned her sister might call", via: "app" },
      {
        id: "pc_d4",
        at: ago(60 * 24 * 2 + 294),
        role: "sarah",
        body: "Noted on her file — if a Pine St number comes in I'll connect the dots and mention Dana sent them.",
        via: "app",
      },
    ],
  },
  {
    id: "chat_sat",
    title: "Stop Saturday bookings",
    messages: [
      { id: "pc_s1", at: ago(60 * 24 * 6), role: "owner", body: "no more saturday estimates, the kids have games", via: "sms" },
      {
        id: "pc_s2",
        at: ago(60 * 24 * 6 - 1),
        role: "sarah",
        body: "Done — Saturdays are off the table. I updated your hours; anyone asking for a weekend gets offered Monday morning instead.",
        via: "sms",
      },
    ],
  },
];

/* ------------------------------- home surfaces -------------------------------- */

export interface ScheduleGlanceItem {
  id: string;
  contactId?: string;
  startAt: string;
  name: string;
  town: string;
  kind: "estimate" | "job";
  driveGapAfter?: string; // "40-min gap"
}

// APEX_SCHEDULE_GLANCE is defined below the Thursday-trio consts it derives from —
// Home's glance and the Schedule page MUST show the same people at the same times.

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
  reviewsCollected: 33, // full arc: 11 test wave + 21 big wave + 1 ongoing (Dana)
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
      "Jorge's quote (Q-1043, $1,850) is 3 days unanswered. He asked about copper gutters — that question's in your Needs-you list; answer it and I'll pass it along in my words.",
  },
  {
    match: /quote/i,
    reply: "One quote is out: Q-1043 to Jorge Alvarez, $1,850 for the leak repair — sent 3 days ago, no answer yet.",
  },
  {
    match: /review/i,
    reply:
      "33 new reviews so far — 11 from the Newton test wave, 21 from the big wave, plus Dana after her roof job. 4.9★ average. Mike O'Brien is next — his ask is drafted and waiting on your OK.",
  },
  {
    match: /waiting|anything.*me|approv/i,
    reply:
      "A handful of things need you: Jorge's copper-gutters question, Mike O'Brien's review ask, a hello to Dana's referral Nina, the website's copper-gutters section, and the Miller job's blog + Facebook posts. All one tap above.",
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

const iso = (d: Date) => d.toISOString();
const plusMin = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);

const thu9 = nextWeekday(4, 9);
const thu1130 = nextWeekday(4, 11, 30);
const thu2 = nextWeekday(4, 14);

/** Derived from the same trio the Schedule page renders (si_thu1-3) — one story. */
export const APEX_SCHEDULE_GLANCE: { dayLabel: string; routeNote: string; items: ScheduleGlanceItem[] } = {
  dayLabel: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(thu9),
  routeNote: "Routed shortest-drive — 40-min gap at 1:00",
  items: [
    { id: "si_thu1", contactId: "ct_patel", startAt: iso(thu9), name: "Sam & Priya Patel", town: "Newton", kind: "estimate" },
    { id: "si_thu2", contactId: "ct_brennan", startAt: iso(thu1130), name: "Tom Brennan", town: "Brookline", kind: "estimate", driveGapAfter: "40-min gap at 1:00" },
    { id: "si_thu3", contactId: "ct_rivera", startAt: iso(thu2), name: "Ana Rivera", town: "Waltham", kind: "estimate" },
  ],
};

export const APEX_TIMELINES: Record<string, TimelineEvent[]> = {
  ct_dana: [
    { id: "tl_d1", contactId: "ct_dana", at: d(60, 9, 14), type: "message", direction: "inbound", via: "sms", body: "Hi — we have a leak after the storm, ceiling stain is growing. Do you do full replacements?" },
    { id: "tl_d2", contactId: "ct_dana", at: d(60, 9, 15), type: "message", direction: "outbound", via: "sms", body: "So sorry to hear that, Dana — I can get you a free estimate this week. Is the house in Newton?" },
    { id: "tl_d3", contactId: "ct_dana", at: d(60, 9, 18), type: "message", direction: "inbound", via: "sms", body: "Yes, 41 Birch St. Tuesday morning works if you have it." },
    { id: "tl_d4", contactId: "ct_dana", at: d(60, 9, 19), type: "message", direction: "outbound", via: "sms", body: "Tuesday 10:00 it is — Marcus will see you then. You'll get a reminder the day before." },
    { id: "tl_d5", contactId: "ct_dana", at: d(58, 10), type: "appointment", appointmentId: "ap_d1", startAt: d(58, 10), status: "confirmed" },
    { id: "tl_d6", contactId: "ct_dana", at: d(55, 12), type: "quote", quoteId: "q_1042", label: "Q-1042 · roof replacement", totalCents: 1_420_000, status: "accepted" },
    { id: "tl_d6b", contactId: "ct_dana", at: d(7, 8), type: "note", author: "Sarah", body: "Roof replacement started — crew of 3, Mon–Thu." },
    { id: "tl_d7", contactId: "ct_dana", at: d(2, 12), type: "invoice", invoiceId: "inv_2031", label: "INV-2031", totalCents: 1_420_000, status: "paid" },
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
    { id: "tl_p4", contactId: "ct_patel", at: ago(95), type: "appointment", appointmentId: "si_thu1", startAt: iso(thu9), status: "confirmed" },
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
  // the two open invoices Home's "Awaiting payment" cites — real records, clickable through
  ct_imp_0: [
    { id: "tl_s1", contactId: "ct_imp_0", at: d(5), type: "import", source: "QuickBooks" },
    { id: "tl_s2", contactId: "ct_imp_0", at: d(14, 9), type: "invoice", invoiceId: "inv_2032", label: "INV-2032 · gutter repair", totalCents: 240_000, status: "overdue" },
  ],
  ct_imp_1: [
    { id: "tl_g1", contactId: "ct_imp_1", at: d(5), type: "import", source: "QuickBooks" },
    { id: "tl_g2", contactId: "ct_imp_1", at: d(6, 10), type: "invoice", invoiceId: "inv_2033", label: "INV-2033 · flashing fix", totalCents: 98_000, status: "sent" },
  ],
};

export const APEX_SIDEBARS: Record<string, ContactSidebar> = {
  ct_dana: {
    openQuote: { id: "q_1042", label: "Q-1042", totalCents: 1_420_000, status: "accepted" },
    openInvoice: { id: "inv_2031", label: "INV-2031", totalCents: 1_420_000, status: "paid" },
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
    nextAppointment: { id: "si_thu1", startAt: iso(thu9), status: "confirmed" },
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
  ct_imp_0: {
    openInvoice: { id: "inv_2032", label: "INV-2032", totalCents: 240_000, status: "overdue" },
    openEscalations: 0,
    facts: [
      { label: "First seen", value: "QuickBooks import" },
      { label: "Open balance", value: "$2,400 · 14 days" },
    ],
  },
  ct_imp_1: {
    openInvoice: { id: "inv_2033", label: "INV-2033", totalCents: 98_000, status: "sent" },
    openEscalations: 0,
    facts: [
      { label: "First seen", value: "QuickBooks import" },
      { label: "Open balance", value: "$980" },
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
const TOWN_COORDS: Record<string, [number, number]> = {
  Newton: [42.337, -71.209], Brookline: [42.331, -71.121], Waltham: [42.376, -71.235],
  Needham: [42.28, -71.234], Watertown: [42.371, -71.183], Wellesley: [42.296, -71.294], Dedham: [42.243, -71.166],
};

/** Monday 00:00 of the current week (local). */
function thisMonday(): Date {
  const t = new Date(now);
  t.setHours(0, 0, 0, 0);
  const day = (t.getDay() + 6) % 7; // Mon=0
  t.setDate(t.getDate() - day);
  return t;
}

function scheduleItem(
  i: number, dayOffset: number, h: number, m: number, name: string, town: string,
  opts: { kind?: "estimate" | "job" | "block"; durMin?: number; contactId?: string; notes?: string; label?: string } = {},
): ScheduleItem {
  const start = new Date(thisMonday());
  start.setDate(start.getDate() + dayOffset);
  start.setHours(h, m, 0, 0);
  const end = new Date(start.getTime() + (opts.durMin ?? 60) * 60_000);
  const past = end.getTime() < now;
  const [lat, lng] = TOWN_COORDS[town] ?? [42.34, -71.2];
  return {
    id: `si_g${i}`,
    kind: opts.kind ?? "estimate",
    contactId: opts.contactId,
    contactName: name,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    status: opts.kind === "block" ? "confirmed" : past ? (i % 5 === 0 ? "no_show" : "shown") : i % 4 === 0 ? "proposed" : "confirmed",
    address: opts.kind === "block" ? undefined : `${10 + i} ${town} St, ${town}`,
    town: opts.kind === "block" ? undefined : town,
    lat: opts.kind === "block" ? undefined : lat + (i % 7) * 0.004,
    lng: opts.kind === "block" ? undefined : lng + (i % 5) * 0.004,
    bookedBy: opts.kind === "estimate" || !opts.kind ? "sarah" : "owner",
    notes: opts.notes,
    label: opts.label,
  };
}

/** A realistically busy fortnight (Tier-1 demo volume, 2026-07-12). */
export const APEX_SCHEDULE_ITEMS: ScheduleItem[] = [
  // ---- last week (history for List view + status colors)
  scheduleItem(30, -6, 9, 0, "Nadia Hassan", "Needham"),
  scheduleItem(31, -5, 11, 0, "Vic Moreau", "Wellesley"),
  scheduleItem(35, -4, 14, 0, "Ellen Chu", "Newton"),
  // ---- this week
  scheduleItem(1, 0, 9, 0, "Lucia Ferreira", "Dedham"),
  scheduleItem(2, 0, 13, 0, "Ed Walsh", "Newton"),
  scheduleItem(3, 1, 8, 30, "Karen Doyle", "Watertown"),
  scheduleItem(4, 1, 11, 0, "Sam Rizzo", "Brookline"),
  scheduleItem(5, 1, 14, 0, "Personal — dentist", "", { kind: "block", durMin: 120 }),
  scheduleItem(6, 2, 9, 0, "Tina Alves", "Waltham"),
  scheduleItem(7, 2, 10, 30, "Bob Gallagher", "Newton"),
  scheduleItem(8, 2, 10, 30, "Nadia Hassan", "Needham"), // deliberate overlap pair
  scheduleItem(9, 2, 15, 0, "Vic Moreau", "Wellesley"),
  scheduleItem(11, 3, 16, 0, "Ellen Chu", "Newton"),
  scheduleItem(12, 4, 8, 0, "Carl Jensen", "Dedham"),
  scheduleItem(13, 4, 10, 0, "Denise Park", "Brookline"),
  scheduleItem(14, 4, 13, 30, "Jim McCarthy", "Waltham"),
  scheduleItem(15, 5, 9, 0, "Maria Santos", "Newton"),
  scheduleItem(16, 5, 11, 0, "Angela Brooks", "Watertown"),
  // Thursday's routed trio (route fixture + home glance reference these)
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
  // multi-day jobs
  {
    id: "si_job_dana", kind: "job", contactId: "ct_dana", contactName: "Dana Miller", label: "roof replacement",
    startAt: d(7, 8), endAt: d(4, 17), allDay: true,
    status: "shown", address: "41 Birch St, Newton", town: "Newton", bookedBy: "owner",
    notes: "Wrapped Thursday — invoice INV-2031 paid, 5★ review in",
  },
  scheduleItem(20, 9, 8, 0, "Frank Sullivan", "Needham", { kind: "job", durMin: 3 * 24 * 60, notes: "Two-man crew", contactId: "ct_imp_0", label: "gutter replacement" }),
  // ---- next week (dense too, so the calendar looks busy whichever week is "current")
  scheduleItem(21, 7, 9, 30, "Pete Kowalski", "Waltham"),
  scheduleItem(22, 7, 13, 30, "Beth Nguyen", "Brookline"),
  scheduleItem(23, 8, 8, 30, "Rosa Silva", "Dedham"),
  scheduleItem(24, 8, 15, 0, "Will Grant", "Newton"),
  scheduleItem(26, 9, 9, 0, "Elena Romero", "Watertown"),
  scheduleItem(27, 9, 11, 0, "Alex Petrov", "Wellesley"),
  scheduleItem(28, 10, 16, 0, "Chidi Okafor", "Needham"),
  scheduleItem(29, 11, 8, 0, "Astrid Lindqvist", "Newton"),
  scheduleItem(32, 11, 10, 30, "Marcus Barnes", "Brookline"),
  scheduleItem(33, 11, 12, 0, "Personal — lunch with supplier", "", { kind: "block", durMin: 60 }),
  scheduleItem(34, 12, 9, 0, "Ines Costa", "Waltham"),
];
APEX_SCHEDULE_ITEMS.find((i) => i.id === "si_g20")!.allDay = true; // Sullivan job banner


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

/* -------------------------------- reviews cast -------------------------------- */

import type { Campaign, ReviewFeedItem, ReviewRequest } from "../reviews/types";

export const APEX_CAMPAIGN: Campaign = {
  id: "camp_react_1",
  kind: "reactivation",
  name: "Past-customer reactivation",
  status: "running",
  importJobId: "imp_qb1",
  ask: {
    reviewLinkUrl: "https://g.page/apexroofing/review",
    template:
      "Hi {firstName}, it's Marcus from Apex Roofing — we did work for you a while back and you were great to work with. If you've got 30 seconds, a Google review would mean a lot: {link}",
    reminderTemplate: "Hi {firstName}, Marcus again — no pressure at all, just bumping this in case it got buried: {link}",
    reminderAfterDays: 3,
  },
  pacing: { perDay: 15, window: { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] } },
  audience: {
    imported: 214,
    eligible: 187,
    excluded: { alreadyReviewed: 19, optedOut: 2, openLead: 4, badPhone: 2 },
  },
  counts: { queued: 124, sent: 21, replied: 17, reviewed: 21, opted_out: 3, failed: 1 },
  results: { newReviews: 21, averageRating: 4.9, googleBefore: 31, googleAfter: 52 }, // wave-only; Dana's ongoing review is counted separately by the wall
  startedAt: d(10, 9),
  createdAt: d(11, 15),
};

export const APEX_REVIEW_REQUESTS: ReviewRequest[] = [
  { id: "rr_1", campaignId: "camp_react_1", contactId: "ct_obrien", contactName: "Mike O'Brien", status: "queued", paused: false, approvalId: "apr_1", detail: "draft awaiting your OK" },
  { id: "rr_2", campaignId: "camp_react_1", contactName: "Priya Okafor", status: "sent", paused: false, detail: "sent 4 days ago · reminder Friday", sentAt: d(4, 10) },
  { id: "rr_3", campaignId: "camp_react_1", contactName: "Rich Calloway", status: "reviewed", paused: false, detail: "reviewed 4 days ago", rating: 5, sentAt: d(6, 9) },
  { id: "rr_4", campaignId: "camp_react_1", contactName: "Tam Nguyen", status: "reviewed", paused: false, detail: "reviewed 6 days ago", rating: 4, sentAt: d(8, 9) },
  { id: "rr_5", campaignId: "camp_react_1", contactName: "Joan Whitfield", status: "opted_out", paused: false, detail: "opted out — won't be contacted again" },
  { id: "rr_6", campaignId: "camp_react_1", contactName: "Ed Sousa", status: "failed", paused: false, detail: "number no longer in service" },
  { id: "rr_7", campaignId: "camp_react_1", contactName: "Carl Jensen", status: "replied", paused: false, detail: "replied — “will do this weekend!”", sentAt: d(3, 11) },
  { id: "rr_8", campaignId: "camp_react_1", contactName: "Beth Nguyen", status: "queued", paused: false, detail: "scheduled tomorrow 9:15" },
  { id: "rr_9", campaignId: "camp_react_1", contactName: "Ray Thompson", status: "queued", paused: true, detail: "paused by you" },
  { id: "rr_10", campaignId: "camp_react_1", contactName: "Lucia Ferreira", status: "sent", paused: false, detail: "sent yesterday", sentAt: d(1, 10) },
];

/** The small test wave Marcus ran first — the proof that led to the big one. */
export const APEX_CAMPAIGN_TEST: Campaign = {
  id: "camp_test_0",
  kind: "reactivation",
  name: "Newton neighbors test",
  status: "completed",
  ask: {
    reviewLinkUrl: "https://g.page/apexroofing/review",
    template:
      "Hi {firstName}, it's Marcus from Apex Roofing — we did work for you a while back. If you've got 30 seconds, a Google review would mean a lot: {link}",
    reminderTemplate: "Hi {firstName}, Marcus again — no pressure, just bumping this: {link}",
    reminderAfterDays: 3,
  },
  pacing: { perDay: 8, window: { start: "09:00", end: "19:00", days: [1, 2, 3, 4, 5, 6] } },
  audience: { imported: 30, eligible: 24, excluded: { alreadyReviewed: 4, optedOut: 0, openLead: 1, badPhone: 1 } },
  counts: { queued: 0, sent: 7, replied: 4, reviewed: 11, opted_out: 1, failed: 1 },
  results: { newReviews: 11, averageRating: 4.8, googleBefore: 20, googleAfter: 31 },
  startedAt: d(45, 9),
  endedAt: d(31, 17),
  createdAt: d(46, 15),
};

export const APEX_CAMPAIGNS: Campaign[] = [APEX_CAMPAIGN, APEX_CAMPAIGN_TEST];

/** After-every-job asks (the ongoing machine) — recent activity for the home card. */
export const APEX_ONGOING_ASKS: ReviewRequest[] = [
  { id: "oa_1", campaignId: "ongoing", contactName: "Sofia Marino", status: "queued", paused: false, detail: "kitchen-leak repair finished yesterday — draft ready tomorrow 9:00" },
  { id: "oa_2", campaignId: "ongoing", contactName: "Hank Peterson", status: "sent", paused: false, detail: "sent after his gutter repair · reminder Thursday", sentAt: d(2, 10) },
  { id: "oa_3", campaignId: "ongoing", contactId: "ct_dana", contactName: "Dana Miller", status: "reviewed", paused: false, detail: "reviewed 2 days after her roof replacement", rating: 5, sentAt: d(3, 9) },
];

/** Deterministic audience names for the wizard's "see the list" (187 eligible). */
const AUD_FIRST = ["Frank", "Rosa", "Tom", "Angela", "Pete", "Maria", "Jim", "Denise", "Carl", "Beth", "Ray", "Lucia", "Ed", "Karen"];
const AUD_LAST = ["Sullivan", "Delgado", "Whalen", "Brooks", "Kowalski", "Santos", "McCarthy", "Park", "Jensen", "Nguyen", "Thompson", "Ferreira", "Walsh", "Doyle"];
export const APEX_AUDIENCE_NAMES: string[] = Array.from(
  { length: 187 },
  (_, i) => `${AUD_FIRST[i % 14]} ${AUD_LAST[(Math.floor(i / 14) + i) % 14]}`,
);

/* ------------------------------- follow-ups cast ------------------------------ */

import type { ChaseItem, ChaseLogEntry, FollowUpRule } from "../followups/types";

/**
 * The chase board (10-followups §4). Every card ties to a story other pages
 * already tell: Linda's nudge (act_4, tl_t3), Jorge's held quote (esc_301),
 * Sullivan's overdue INV-2032 (Home's "Awaiting payment"), Maria Santos's
 * Saturday no-show (schedule fixture si_g15).
 */
export const APEX_CHASES: ChaseItem[] = [
  {
    id: "ch_tran",
    kind: "lead",
    contactId: "ct_tran",
    contactName: "Linda Tran",
    stalledSummary: "Went quiet after giving her address (92 Summer St) — no reply to this morning's nudge yet",
    status: "armed",
    lastTouchAt: ago(130), // the act_4 nudge
    nextNudgeAt: d(-1, 9, 15), // tomorrow morning, attempt 2 of 2
    deferredForHours: false,
    attempts: 1,
    maxAttempts: 2,
    plannedAngle: "No rush, Linda — want me to pencil in Thursday morning for that roof look? If not, just say the word and I'll leave you be.",
  },
  {
    id: "ch_alvarez",
    kind: "quote",
    contactId: "ct_alvarez",
    contactName: "Jorge Alvarez",
    targetId: "q_1043",
    stalledSummary: "Quote Q-1043 — $1,850 leak repair, unanswered 3 days",
    status: "held",
    holdReason: "He's waiting on YOU — open question: “Do you install copper gutters?” Answer it and she picks the chase back up.",
    lastTouchAt: d(3, 12),
    deferredForHours: false,
    attempts: 0,
    maxAttempts: 2,
  },
  {
    id: "ch_sullivan",
    kind: "invoice",
    contactId: "ct_imp_0",
    contactName: "Frank Sullivan",
    targetId: "inv_2032",
    stalledSummary: "Invoice INV-2032 — $2,400 gutter repair, due 14 days ago",
    status: "armed",
    lastTouchAt: d(7, 10),
    nextNudgeAt: d(-1, 9, 15),
    deferredForHours: true,
    attempts: 1,
    maxAttempts: 2,
    plannedAngle: "Hi Frank, Marcus here — just keeping INV-2032 on your radar ($2,400). Want me to text you the payment link again?",
  },
  {
    id: "ch_santos",
    kind: "estimate",
    contactId: "ct_imp_5",
    contactName: "Maria Santos",
    targetId: "si_g15",
    stalledSummary: "No-show for Saturday 9:00's estimate — needs a rebook",
    status: "armed",
    lastTouchAt: d(1, 9),
    nextNudgeAt: d(-1, 8, 30),
    deferredForHours: true,
    attempts: 0,
    maxAttempts: 1,
    plannedAngle: "Hi Maria — we missed each other Saturday, no worries at all. Want me to grab you a new time this week?",
  },
];

export const APEX_FOLLOWUP_RULES: FollowUpRule[] = [
  { kind: "lead", enabled: true, delaysMinutes: [30, 1440], maxAttempts: 2, businessHoursOnly: true, onePerInteraction: true, requiresApproval: false, toneNote: "friendly, zero pressure" },
  { kind: "quote", enabled: true, delaysMinutes: [4320, 10080], maxAttempts: 2, businessHoursOnly: true, onePerInteraction: true, requiresApproval: false, toneNote: "helpful — answer questions, never push" },
  { kind: "invoice", enabled: true, delaysMinutes: [0, 10080], maxAttempts: 2, businessHoursOnly: true, onePerInteraction: true, requiresApproval: false, toneNote: "polite and matter-of-fact" },
  { kind: "estimate", enabled: true, delaysMinutes: [60], maxAttempts: 1, businessHoursOnly: true, onePerInteraction: true, requiresApproval: false, toneNote: "no guilt — rebook and move on" },
];

export const APEX_CHASE_LOG: ChaseLogEntry[] = [
  {
    id: "cl_1", at: ago(130), chaseId: "ch_tran", contactId: "ct_tran", contactName: "Linda Tran", kind: "lead",
    decision: "sent", body: "Morning Linda — just checking in. Still want us to take a look at that roof?", outcome: "still_quiet",
  },
  {
    id: "cl_2", at: ago(170), chaseId: "ch_alvarez", contactId: "ct_alvarez", contactName: "Jorge Alvarez", kind: "quote",
    decision: "skipped", reason: "Open question — he's waiting on you, so she stayed quiet.",
  },
  {
    id: "cl_3", at: d(1, 20, 10), chaseId: "ch_sullivan", contactId: "ct_imp_0", contactName: "Frank Sullivan", kind: "invoice",
    decision: "deferred", reason: "It was 8:10pm — she waits for your business hours. Rescheduled for 9:15am.",
  },
  {
    id: "cl_4", at: d(2, 16), chaseId: "ch_park", contactId: "ct_imp_7", contactName: "Denise Park", kind: "lead",
    decision: "sent", body: "Hi Denise — still happy to take a look whenever suits. Friday 10:00 is open if that works?", outcome: "booked",
  },
  {
    id: "cl_5", at: d(4, 11), chaseId: "ch_jensen", contactId: "ct_imp_8", contactName: "Carl Jensen", kind: "lead",
    decision: "sent", body: "Hey Carl, Marcus can swing by Friday morning — want me to hold 8:00?", outcome: "replied",
  },
];

export const APEX_CHASE_STATS = { nudges30d: 12, replies30d: 5 };

/* -------------------------------- website cast -------------------------------- */

import type { SeoSnapshot, Site, SiteEdit, SitePage, SiteVersion } from "../website/types";

/** Mock preview tokens (03 §5): /p/demo_vN renders version N's fixture snapshot. */
export const siteToken = (versionNumber: number) => `demo_v${versionNumber}`;

export const APEX_SITE_PAGES: SitePage[] = [
  { id: "pg_home", siteId: "site_apex", title: "Home", path: "/", status: "live", updatedAt: d(6, 9), updatedBy: "sarah" },
  { id: "pg_services", siteId: "site_apex", title: "Services", path: "/services", status: "live", updatedAt: ago(160), updatedBy: "sarah" },
  { id: "pg_replacement", siteId: "site_apex", title: "Roof Replacement", path: "/roof-replacement", status: "live", updatedAt: d(24, 12), updatedBy: "system" },
  { id: "pg_repair", siteId: "site_apex", title: "Roof Repair", path: "/roof-repair", status: "live", updatedAt: d(24, 12), updatedBy: "system" },
  { id: "pg_gallery", siteId: "site_apex", title: "Gallery", path: "/gallery", status: "live", updatedAt: d(2, 10), updatedBy: "sarah" },
  { id: "pg_reviews", siteId: "site_apex", title: "Reviews", path: "/reviews", status: "live", updatedAt: d(2, 11), updatedBy: "system" },
  { id: "pg_contact", siteId: "site_apex", title: "Contact", path: "/contact", status: "live", updatedAt: d(6, 9), updatedBy: "sarah" },
];

/** Newest first. v14 = the open draft (copper gutters, apr_2's story); v13 is live. */
export const APEX_SITE_VERSIONS: SiteVersion[] = [
  { id: "v14", siteId: "site_apex", number: 14, summary: "Added a “Copper gutters” section to Services", createdAt: ago(160), editIds: ["se_1"] },
  { id: "v13", siteId: "site_apex", number: 13, summary: "Added Miller job photos to the Gallery", createdAt: d(2, 10), publishedAt: d(2, 10), editIds: ["se_2"] },
  { id: "v12", siteId: "site_apex", number: 12, summary: "Updated business hours — open Saturdays now", createdAt: d(6, 9), publishedAt: d(6, 9), editIds: ["se_3"] },
  { id: "v11", siteId: "site_apex", number: 11, summary: "Site launch", createdAt: d(24, 12), publishedAt: d(24, 12), editIds: [] },
];

export const APEX_SITE_EDITS: SiteEdit[] = [
  {
    id: "se_1", versionId: "v14",
    instruction: "Jorge asked if we do copper gutters — add that to the services page",
    summary: "Added a “Copper gutters” section to Services with photos from recent jobs",
    pageIds: ["pg_services"], status: "draft", approvalId: "apr_2", at: ago(160),
  },
  {
    id: "se_2", versionId: "v13",
    instruction: "Put the photos from the Miller job in the gallery",
    summary: "Added 4 photos from the Miller roof replacement to the Gallery",
    pageIds: ["pg_gallery"], status: "published", at: d(2, 10),
  },
  {
    id: "se_3", versionId: "v12",
    instruction: "We're open Saturdays now — update the hours",
    summary: "Hours updated to Mon–Sat 7–6 on Home and Contact",
    pageIds: ["pg_home", "pg_contact"], status: "published", at: d(6, 9),
  },
];

export const APEX_SITE: Site = {
  id: "site_apex",
  organizationId: "org_apex",
  domain: "apexroofingma.com",
  status: "live",
  publishedVersionId: "v13",
  draftVersionId: "v14",
  previewUrl: `/p/${siteToken(14)}`,
  visits30d: 1284,
  visitsSeries: [31, 38, 35, 44, 40, 37, 45, 48, 41, 39, 45, 50, 50, 43, 40, 47, 44, 39, 42, 47, 49, 46, 41, 38, 44, 45, 47, 43, 40, 46],
  leadsFromSite30d: 12,
  leadsSeries: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1], // 12 total
};

export const APEX_SEO: SeoSnapshot = {
  siteId: "site_apex",
  checkedAt: d(1, 8),
  keywords: [
    { term: "roofer newton ma", position: 3, delta: 2 },
    { term: "roof replacement newton", position: 5, delta: 1 },
    { term: "roof repair brookline", position: 8, delta: 0 },
    { term: "gutter installation newton", position: 12, delta: 3 },
    { term: "emergency roof leak waltham", position: null, delta: 0 },
  ],
  gbp: { connected: true, rating: 4.9, reviewCount: 53 }, // = the reviews wall: 20 before Sarah + 33 collected (test 11 + wave 21 + Dana)
  aiAnswers: { visible: true, sentence: "Ask ChatGPT for a roofer in Newton and Apex comes up." },
  plumbing: [
    { label: "Structured data (LocalBusiness)", ok: true },
    { label: "llms.txt", ok: true },
    { label: "Sitemap", ok: true },
    { label: "Meta descriptions", ok: true },
    { label: "Google Search Console", ok: true },
  ],
};

/** The site-context slice of the owner thread (03 §3 — the chat doubles as the edit log). */
export const APEX_SITE_CHAT: SarahMessage[] = [
  { id: "sc_1", at: ago(162), role: "owner", body: "Jorge asked if we do copper gutters — add that to the services page", via: "sms" },
  {
    id: "sc_2", at: ago(160), role: "sarah",
    body: "Done — added a “Copper gutters” section to Services with photos from recent jobs. Take a look in the preview and hit Publish when it looks right.",
    via: "sms",
  },
];

/** Scripted site-chat turns (mock). An `edit` means the draft was extended. */
export function scriptedSiteReply(text: string): { reply: string; edit?: { summary: string } } {
  if (/google|rank|found|seo|chatgpt/i.test(text)) {
    return {
      reply:
        "You're #3 for “roofer newton ma” — up 2 this month. Your Business Profile is connected at 4.9★, and ChatGPT mentions Apex when someone asks for a roofer near Newton. I put the full picture in the Performance tab.",
    };
  }
  if (/add a page|new page/i.test(text)) {
    return {
      reply: "Done — I drafted a “Gutter Work” page covering copper and seamless gutters. It's in the preview under the page switcher; publish when it looks right.",
      edit: { summary: "Drafted a new “Gutter Work” page" },
    };
  }
  if (/hour/i.test(text)) {
    return {
      reply: "Updated — the new hours are on the Home footer and the Contact page in the draft. Publish when you're ready.",
      edit: { summary: "Updated business hours on Home and Contact" },
    };
  }
  if (/photo|hero|picture|image/i.test(text)) {
    return {
      reply: "Swapped it in — the hero now shows the Miller roof. It's in the preview; publish when it looks right.",
      edit: { summary: "Swapped the hero photo for the Miller roof" },
    };
  }
  return {
    reply: "Done — it's in the draft preview. Look it over and hit Publish when it's right.",
    edit: { summary: "Applied your change to the draft" },
  };
}

/* -------------------------------- reviews feed -------------------------------- */

export const APEX_REVIEW_FEED: ReviewFeedItem[] = [
  { id: "rf_1", reviewer: "Dana Miller", contactId: "ct_dana", rating: 5, excerpt: "Marcus and his crew replaced our roof in two days — spotless cleanup. Wish we'd called years ago.", at: d(2, 11), source: "ongoing", url: "https://g.page/apexroofing/review" },
  { id: "rf_2", reviewer: "Rich Calloway", rating: 5, excerpt: "Fast, fair, no surprises. The estimate matched the invoice to the dollar.", at: d(4, 15), source: "campaign", url: "https://g.page/apexroofing/review" },
  { id: "rf_3", reviewer: "Walt Freeman", rating: 3, excerpt: "Good work on the roof, but the crew ran late twice and the side gate was left open.", at: d(5, 16), source: "campaign", privateFeedback: true },
  { id: "rf_4", reviewer: "Tam Nguyen", rating: 4, excerpt: "Solid work on the flashing — showed up when they said they would.", at: d(6, 12), source: "campaign", url: "https://g.page/apexroofing/review" },
];

/* -------------------------------- content cast -------------------------------- */

import type { Post, SocialPost } from "../content/types";

/** The pending Miller pair (post_301 + sp_301) is the REBRAND §3.3 demo beat. */
export const APEX_POSTS: Post[] = [
  {
    id: "post_301",
    title: "A full roof replacement in Newton",
    slug: "full-roof-replacement-newton",
    excerpt: "When the Millers called about their 20-year-old roof, we knew the storm had only finished what time had started.",
    bodyMd: [
      "When the Millers called about their 20-year-old roof, we knew the storm had only finished what time had started. A ceiling stain that grows after every rain isn't a leak problem — it's a roof telling you it's done.",
      "## What we found",
      "Up top, the story was clear: shingles past their service life, flashing pulling away at the chimney, and two soft spots in the decking over the kitchen. A patch would have bought months, not years — and the Millers were done buying months.",
      "## Two days, start to finish",
      "- Day 1: full tear-off, deck repair, ice-and-water shield on the eaves",
      "- Day 2: architectural shingles, new flashing, ridge vent, and a magnetic nail sweep of the whole yard",
      "The new roof carries a 30-year warranty, and the attic is finally venting the way it should — which the Millers will feel in their summer cooling bill.",
      "## The part we're proudest of",
      "Dana told us the cleanup mattered as much as the roof: **you can't tell a crew was ever there.** That's the standard on every job we do.",
    ].join("\n\n"),
    photos: [
      { id: "ph_1", url: "placeholder:miller-before", alt: "The Millers' 20-year-old roof before tear-off" },
      { id: "ph_2", url: "placeholder:miller-tearoff", alt: "Day one — tear-off and deck repair" },
      { id: "ph_3", url: "placeholder:miller-ridge", alt: "New architectural shingles at the ridge" },
      { id: "ph_4", url: "placeholder:miller-after", alt: "The finished roof from the street" },
    ],
    seo: {
      metaTitle: "Full Roof Replacement in Newton, MA — Apex Roofing",
      metaDescription: "A 20-year-old Newton roof, replaced in two days: tear-off, deck repair, architectural shingles, and a spotless cleanup.",
    },
    status: "draft",
    approvalId: "apr_4",
    contactId: "ct_dana",
    sourceSummary: "From 4 photos Marcus texted after the Miller job",
    socialPostId: "sp_301",
    createdAt: ago(105),
  },
  {
    id: "post_299",
    title: "Hail damage in Waltham: what we found and how we fixed it",
    slug: "hail-damage-waltham",
    excerpt: "After June's hailstorm we inspected fourteen roofs in one week. Here's what hail actually does — and what's worth fixing.",
    bodyMd: [
      "After June's hailstorm we inspected fourteen roofs in one week. Most owners couldn't see anything wrong from the driveway — which is exactly how hail damage works.",
      "## What hail really does",
      "Hail rarely punches holes. It bruises: knocks the granules off the shingle so the asphalt underneath ages in months instead of years. From the ground it's invisible; from the roof it looks like someone went at it with a ball-peen hammer.",
      "## The fix",
      "On this Waltham colonial we replaced two slopes, re-flashed the chimney, and documented everything for the owner's insurance claim — photos, measurements, and a written scope their adjuster could work from.",
    ].join("\n\n"),
    photos: [
      { id: "ph_5", url: "placeholder:hail-bruise", alt: "Granule loss from hail impact, close up" },
      { id: "ph_6", url: "placeholder:hail-slope", alt: "The damaged south slope before replacement" },
      { id: "ph_7", url: "placeholder:hail-done", alt: "The finished slopes after replacement" },
    ],
    seo: {
      metaTitle: "Hail Damage Roof Repair in Waltham, MA — Apex Roofing",
      metaDescription: "What hail actually does to asphalt shingles, and how we documented and fixed a Waltham colonial after June's storm.",
    },
    status: "published",
    contactId: undefined,
    socialPostId: "sp_299",
    publishedAt: d(21, 10),
    publishedUrl: "https://apexroofingma.com/blog/hail-damage-waltham",
    stats: { views: 214, clicks: 12 },
    createdAt: d(21, 9),
  },
  {
    id: "post_300",
    title: "Why we photograph your roof before we quote",
    slug: "why-we-photograph-before-quoting",
    excerpt: "A quote you can't see the reasoning behind is just a number. Here's why every Apex estimate comes with pictures.",
    bodyMd: [
      "A quote you can't see the reasoning behind is just a number. That's why every Apex estimate comes with photos of your actual roof — the good, the bad, and the parts you'd never climb up to see.",
      "## You should see what we see",
      "When we say the flashing is failing, you get a picture of your flashing failing. No mystery, no scare tactics — just the roof, documented.",
      "## It keeps everyone honest",
      "The photos become the scope. What's in the pictures is what's in the price, and the final invoice matches the estimate because nothing was invented along the way.",
    ].join("\n\n"),
    photos: [
      { id: "ph_8", url: "placeholder:inspect-flashing", alt: "Documenting failing chimney flashing during an estimate" },
      { id: "ph_9", url: "placeholder:inspect-report", alt: "The photo report every estimate includes" },
    ],
    seo: {
      metaTitle: "Why Apex Roofing Photographs Every Roof Before Quoting",
      metaDescription: "Every Apex estimate comes with photos of your actual roof — the reasoning behind the number, documented.",
    },
    // Scheduled two days out — puts a post on the CURRENT week for the Schedule
    // "Posts" layer + Content calendar demos (07 §2 / 04 §2).
    status: "scheduled",
    scheduledFor: ahead(60 * 48),
    createdAt: d(10, 9),
  },
];

export const APEX_SOCIAL_POSTS: SocialPost[] = [
  {
    id: "sp_301",
    postId: "post_301",
    network: "facebook",
    body: "Another Newton roof done right ✅ 20 years old, replaced in two days — new deck, new shingles, 30-year warranty. Swipe for the before and after, and thanks to the Millers for trusting us with it. Need yours looked at? Free estimates, text or call.",
    photoIds: ["ph_1", "ph_4"],
    status: "draft",
    approvalId: "apr_5",
    createdAt: ago(104),
  },
  {
    id: "sp_299",
    postId: "post_299",
    network: "facebook",
    body: "June's hail did more damage than most Waltham roofs are showing from the driveway. We inspected 14 this week — if yours hasn't been looked at since the storm, it should be. Free inspections, photos included.",
    photoIds: ["ph_5"],
    status: "posted",
    postedAt: d(21, 12),
    permalink: "https://facebook.com/apexroofingma/posts/hail-waltham",
    stats: { likes: 12, comments: 3, shares: 2 },
    createdAt: d(21, 10),
  },
];

/* --------------------------- quotes + invoices cast --------------------------- */

import type { Quote, QuoteLineItem } from "../quotes/types";
import type { Invoice } from "../invoices/types";

const li = (id: string, description: string, quantity: number, unitPriceCents: number): QuoteLineItem => ({
  id,
  description,
  quantity,
  unitPriceCents,
  totalCents: Math.round(quantity * unitPriceCents),
});

/** Canon: q_1042 (Dana, $14,200, accepted → inv_2031) · q_1043 (Alvarez, $1,850,
 *  sent 3d, Follow-ups chasing) — ids referenced by CRM timelines, Home, chases. */
export const APEX_QUOTES: Quote[] = [
  {
    id: "q_1044",
    number: "Q-1044",
    contactId: "ct_brennan",
    title: "Storm damage — ridge & flashing repair",
    lineItems: [
      li("qli_44a", "Ridge cap replacement (32 lf)", 32, 4_500),
      li("qli_44b", "Chimney flashing reseal", 1, 71_000),
    ],
    subtotalCents: 32 * 4_500 + 71_000,
    totalCents: 32 * 4_500 + 71_000, // $2,150
    notes: "Price valid 30 days. Includes debris haul-away.",
    status: "draft",
    source: "manual",
    token: "demo_q_1044",
    history: [{ at: ago(60 * 5), event: "drafted", actor: "owner" }],
    createdAt: ago(60 * 5),
    updatedAt: ago(60 * 5),
  },
  {
    id: "q_1043",
    number: "Q-1043",
    contactId: "ct_alvarez",
    title: "Leak repair — porch section",
    lineItems: [
      li("qli_43a", "Locate & repair porch roof leak", 1, 125_000),
      li("qli_43b", "Replace damaged decking & shingles (porch)", 1, 60_000),
      { ...li("qli_43c", "Seamless gutter run over the porch", 1, 45_000), optional: true },
    ],
    subtotalCents: 185_000,
    totalCents: 185_000, // $1,850 — the optional add-on joins only if Jorge picks it
    photos: [{ id: "qph_43a", url: "placeholder:alvarez-leak", alt: "The porch leak, from the estimate visit" }],
    notes: "Price valid 30 days.",
    status: "sent",
    source: "sarah",
    token: "demo_q_1043",
    history: [
      { at: d(3, 11, 50), event: "drafted", actor: "sarah" },
      { at: d(3, 12, 0), event: "approved", actor: "owner" },
      { at: d(3, 12, 0), event: "sent", actor: "system" },
    ],
    sentAt: d(3, 12),
    expiresAt: d(-27, 12), // sent + 30 days
    createdAt: d(3, 11, 50),
    updatedAt: d(3, 12),
  },
  {
    id: "q_1042",
    number: "Q-1042",
    contactId: "ct_dana",
    title: "Roof replacement — 41 Birch St",
    lineItems: [
      li("qli_42a", "Tear-off & disposal (28 sq)", 28, 8_500),
      li("qli_42b", "Architectural shingles — CertainTeed Landmark (28 sq)", 28, 33_500),
      li("qli_42c", "Ice & water shield + synthetic underlayment", 1, 94_000),
      li("qli_42d", "Flashing, drip edge, ridge vent", 1, 150_000),
    ],
    subtotalCents: 1_420_000,
    totalCents: 1_420_000, // $14,200
    depositCents: 426_000, // 30% on acceptance → inv_2031's first payment
    photos: [
      { id: "qph_42a", url: "placeholder:miller-before", alt: "The Millers' 20-year-old roof before tear-off" },
      { id: "qph_42b", url: "placeholder:miller-decking", alt: "Soft decking over the kitchen" },
      { id: "qph_42c", url: "placeholder:miller-chimney", alt: "Failing chimney flashing" },
    ],
    acceptedBy: "Dana Miller",
    notes: "Price valid 30 days. Includes permit + cleanup.",
    status: "accepted",
    source: "sarah",
    token: "demo_q_1042",
    history: [
      { at: d(55, 11), event: "drafted", actor: "sarah" },
      { at: d(55, 12), event: "approved", actor: "owner" },
      { at: d(55, 12), event: "sent", actor: "system" },
      { at: d(55, 18), event: "viewed", actor: "customer" },
      { at: d(54, 9), event: "accepted", actor: "customer" },
    ],
    sentAt: d(55, 12),
    viewedAt: d(55, 18),
    respondedAt: d(54, 9),
    invoiceId: "inv_2031",
    createdAt: d(55, 11),
    updatedAt: d(54, 9),
  },
  {
    id: "q_1039",
    number: "Q-1039",
    contactId: "ct_imp_2",
    title: "Seamless gutters — full wrap",
    lineItems: [li("qli_39a", "Seamless aluminum gutters + downspouts (170 lf)", 170, 2_000)],
    subtotalCents: 340_000,
    totalCents: 340_000, // $3,400
    status: "declined",
    source: "manual",
    token: "demo_q_1039",
    history: [
      { at: d(22, 10), event: "drafted", actor: "owner" },
      { at: d(22, 10), event: "sent", actor: "system" },
      { at: d(21, 8), event: "viewed", actor: "customer" },
      { at: d(19, 17), event: "declined", actor: "customer" },
    ],
    sentAt: d(22, 10),
    viewedAt: d(21, 8),
    respondedAt: d(19, 17),
    createdAt: d(22, 10),
    updatedAt: d(19, 17),
  },
  {
    id: "q_1035",
    number: "Q-1035",
    contactId: "ct_imp_10",
    title: "Cedar shake repair — north slope",
    lineItems: [li("qli_35a", "Cedar shake repair & match (north slope)", 1, 690_000)],
    subtotalCents: 690_000,
    totalCents: 690_000, // $6,900
    status: "expired",
    source: "manual",
    token: "demo_q_1035",
    history: [
      { at: d(48, 9), event: "drafted", actor: "owner" },
      { at: d(48, 9), event: "sent", actor: "system" },
      { at: d(18, 9), event: "expired", actor: "system" },
    ],
    sentAt: d(48, 9),
    expiresAt: d(18, 9),
    createdAt: d(48, 9),
    updatedAt: d(18, 9),
  },
];

/** Canon: inv_2031 paid (Dana) · inv_2032 overdue 14d (Sullivan/ct_imp_0, chased)
 *  · inv_2033 viewed, due in ~9 days (Delgado/ct_imp_1). Sums match Home stats. */
export const APEX_INVOICES: Invoice[] = [
  {
    id: "inv_2032",
    contactId: "ct_imp_0",
    number: "INV-2032",
    status: "viewed", // provider derives 'overdue' at read time (dueAt < now)
    lineItems: [
      li("ili_32a", "Gutter repair — rear elevation (48 lf)", 48, 3_500),
      li("ili_32b", "Downspout replacement ×3", 3, 24_000),
    ],
    subtotalCents: 240_000,
    totalCents: 240_000, // $2,400
    payments: [],
    token: "demo_inv_2032",
    payInstructions: "Check payable to Apex Roofing, or Zelle to (844) 415-7642.",
    issuedAt: d(28, 9),
    dueAt: d(14, 9), // 14 days overdue
    history: [
      { at: d(28, 9), type: "created" },
      { at: d(28, 9), type: "sent", via: "sms" },
      { at: d(27, 19), type: "viewed" },
      { at: d(1, 20, 10), type: "reminder", via: "sms", note: "Sarah's nudge — approved by you" },
    ],
    createdAt: d(28, 9),
  },
  {
    id: "inv_2033",
    contactId: "ct_imp_1",
    number: "INV-2033",
    status: "viewed",
    lineItems: [li("ili_33a", "Chimney flashing repair", 1, 98_000)],
    subtotalCents: 98_000,
    totalCents: 98_000, // $980
    payments: [],
    token: "demo_inv_2033",
    payInstructions: "Check payable to Apex Roofing, or Zelle to (844) 415-7642.",
    issuedAt: d(5, 10),
    dueAt: d(-9, 10), // due in ~9 days
    history: [
      { at: d(5, 10), type: "created" },
      { at: d(5, 10), type: "sent", via: "sms" },
      { at: d(4, 15), type: "viewed" },
    ],
    createdAt: d(5, 10),
  },
  {
    id: "inv_2031",
    contactId: "ct_dana",
    number: "INV-2031",
    status: "paid",
    lineItems: [
      li("ili_31a", "Tear-off & disposal (28 sq)", 28, 8_500),
      li("ili_31b", "Architectural shingles — CertainTeed Landmark (28 sq)", 28, 33_500),
      li("ili_31c", "Ice & water shield + synthetic underlayment", 1, 94_000),
      li("ili_31d", "Flashing, drip edge, ridge vent", 1, 150_000),
    ],
    subtotalCents: 1_420_000,
    totalCents: 1_420_000, // $14,200
    payments: [
      { at: d(54, 9), amountCents: 426_000, method: "deposit", note: "30% on acceptance — Q-1042" },
      { at: d(2, 12), amountCents: 994_000, method: "check", note: "recorded by Sarah" },
    ],
    quoteId: "q_1042",
    token: "demo_inv_2031",
    payInstructions: "Check payable to Apex Roofing, or Zelle to (844) 415-7642.",
    issuedAt: d(3, 9),
    dueAt: d(-11, 9),
    paidAt: d(2, 12),
    paidMethod: "check",
    history: [
      { at: d(3, 9), type: "converted", note: "from quote Q-1042" },
      { at: d(3, 9), type: "sent", via: "sms" },
      { at: d(3, 11), type: "viewed" },
      { at: d(2, 12), type: "paid", note: "check — recorded by Sarah" },
    ],
    createdAt: d(3, 9),
  },
];
