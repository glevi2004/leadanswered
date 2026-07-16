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
