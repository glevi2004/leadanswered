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
