// Per-trade landing pages (SEO plan P2). Each entry is genuinely trade-specific
// — real services, a real missed-call scenario, a tailored SMS example, and
// trade-specific FAQs. Do NOT template these into generic spun copy.

export interface TradeMsg {
  from: "them" | "me";
  text: string;
}

export interface TradeFaq {
  q: string;
  a: string;
}

export interface Trade {
  slug: string;
  /** The audience, plural, lowercase — e.g. "roofers". */
  noun: string;
  /** Title-case audience for headings — e.g. "Roofers". */
  Noun: string;
  /** The work — e.g. "roofing". */
  trade: string;
  /** The assistant's fake company name in the demo. */
  company: string;
  /** Two-letter avatar initials for the demo. */
  initials: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  subhead: string;
  /** Real services this trade sells — shown as "handles questions about…". */
  services: string[];
  /** A specific, believable missed-call story for this trade. */
  pain: string;
  /** Why fast response matters *for this trade* specifically. */
  urgency: string;
  /** A short, trade-specific SMS exchange for the demo bubble. */
  example: TradeMsg[];
  faqs: TradeFaq[];
}

export const trades: Trade[] = [
  {
    slug: "roofers",
    noun: "roofers",
    Noun: "Roofers",
    trade: "roofing",
    company: "Apex Roofing",
    initials: "AR",
    metaTitle: "The AI Operating System for Roofers | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for roofers — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for roofers.",
    subhead:
      "After a storm the calls don't stop — and neither does the rest of the job: the quote, the schedule, the invoice, the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "Leak repairs and emergency tarping",
      "Full roof replacements",
      "Storm and hail damage",
      "Insurance claim questions",
      "Free roof inspections",
      "Gutters and flashing",
    ],
    pain: "A hailstorm rolls through and by morning every homeowner in the neighborhood is calling three roofers at once. You're on a roof, on a ladder, or driving between jobs — you physically can't pick up. The ones you miss don't leave a voicemail. They just book the roofer who answered.",
    urgency:
      "Storm-damage leads are won in hours, not days. Homeowners with water coming through the ceiling want it handled now, and insurance-driven jobs go to whoever gets the inspection on the calendar first.",
    example: [
      { from: "them", text: "Hi, this is Sarah with Apex Roofing 👋 Thanks for reaching out — is this a leak, or storm damage from last night?" },
      { from: "me", text: "Shingles came off in the storm and there's a leak in the bedroom" },
      { from: "them", text: "Sorry to hear that — we can get someone out. What's the address so I can confirm you're in our area?" },
      { from: "me", text: "18 Oak Street, Newton" },
      { from: "them", text: "You're covered. I can get a free inspection out Thu 10 AM or Fri 2 PM — which works? We'll also document everything for your insurance." },
    ],
    faqs: [
      { q: "Does it handle storm and insurance questions?", a: "Yes. It's trained on your process, so it can answer common storm-damage and insurance-claim questions, reassure the homeowner, and note anything the estimator needs — then book the inspection." },
      { q: "What happens when calls spike after a big storm?", a: "That's exactly when it earns its keep. It answers every lead at once, day or night, so a surge of storm calls doesn't overflow into your competitors' phones." },
      { q: "Can it book roof inspections on my calendar?", a: "Yes — it offers your real open slots and drops a confirmed on-site inspection straight onto your calendar, then texts you the details." },
    ],
  },
  {
    slug: "hvac",
    noun: "HVAC companies",
    Noun: "HVAC Companies",
    trade: "HVAC",
    company: "Peak Heating & Air",
    initials: "PH",
    metaTitle: "The AI Operating System for HVAC Companies | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for HVAC companies — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for HVAC companies.",
    subhead:
      "A heat wave means the phone never stops — and there's still the quote, the schedule, the invoice, the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "AC repair and no-cool emergencies",
      "Heating repair and no-heat calls",
      "New system installs and quotes",
      "Seasonal tune-ups",
      "Maintenance plan questions",
      "Same-day and after-hours service",
    ],
    pain: "It's 96° and the whole town's AC is failing at once. No-cool calls flood in faster than you can answer, and the homeowner who can't reach you just calls the next company on Google. Your techs are elbow-deep in a condenser — nobody's at the phone.",
    urgency:
      "\"AC out in July\" is an emergency. Homeowners keep dialing until someone answers, so the first company to respond and book the same-day call wins — the rest lose the job before they ever call back.",
    example: [
      { from: "them", text: "Hi, this is Dispatch at Peak Heating & Air 👋 Is your system not cooling, not heating, or something else?" },
      { from: "me", text: "AC completely stopped, house is 84 inside" },
      { from: "them", text: "That's miserable in this heat — let's get a tech out. What's the address?" },
      { from: "me", text: "40 Maple Ave" },
      { from: "them", text: "We can be there today between 2–4 PM. Want me to lock that in? I'll text you when the tech is on the way." },
    ],
    faqs: [
      { q: "Can it triage emergencies vs routine calls?", a: "Yes. It asks the right questions to tell a no-cool emergency from a routine tune-up, flags the urgent ones, and books accordingly so the emergencies get seen first." },
      { q: "Does it work after hours and on weekends?", a: "It never sleeps. Nights, weekends, and holidays — every after-hours call gets an instant text back and can be booked or flagged for your on-call tech." },
      { q: "Can it answer maintenance-plan questions?", a: "It's trained on your plans and pricing, so it can explain membership options and capture interested homeowners instead of letting them go cold." },
    ],
  },
  {
    slug: "plumbers",
    noun: "plumbers",
    Noun: "Plumbers",
    trade: "plumbing",
    company: "Rapid Plumbing Co.",
    initials: "RP",
    metaTitle: "The AI Operating System for Plumbers | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for plumbers — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for plumbers.",
    subhead:
      "A burst pipe doesn't wait for business hours — and neither does the rest of the job: the quote, the schedule, the invoice, the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "Burst pipes and leaks",
      "Clogged drains and sewer backups",
      "Water heater repair and replacement",
      "Emergency shut-offs",
      "Fixture installs",
      "24/7 emergency dispatch",
    ],
    pain: "It's 11 PM and a pipe just burst — water's spreading across the kitchen floor. The homeowner is panicking and calling every plumber that says \"24/7.\" If your phone rings out, they're on to the next one before you've even rolled over.",
    urgency:
      "Plumbing is the highest-urgency trade there is: water damage compounds by the minute. The homeowner will hire the first plumber who actually responds — speed literally decides the job.",
    example: [
      { from: "them", text: "This is Rapid Plumbing Co. 👋 Sorry we missed you — is this an active leak or emergency right now?" },
      { from: "me", text: "Pipe burst under the kitchen sink, water everywhere" },
      { from: "them", text: "Okay — first, shut off the valve under the sink or your main if you can. What's the address? I'll get a plumber moving." },
      { from: "me", text: "12 Birch Lane" },
      { from: "them", text: "Got it. A plumber can be there within the hour — booking it now and texting you their ETA." },
    ],
    faqs: [
      { q: "Does it handle after-hours emergencies?", a: "Yes — 24/7. Every late-night and weekend call gets an instant text back, gets triaged, and can be booked or escalated to your on-call plumber right away." },
      { q: "Can it tell an emergency from a routine job?", a: "It asks whether there's active water or damage, prioritizes true emergencies, and schedules routine work (a slow drain, a fixture swap) into your normal slots." },
      { q: "Will it give basic guidance like shutting off the water?", a: "It can share the safe first steps you'd want a homeowner to take — like closing the shut-off valve — while it books the visit, which protects the home and the relationship." },
    ],
  },
  {
    slug: "electricians",
    noun: "electricians",
    Noun: "Electricians",
    trade: "electrical",
    company: "Bright Spark Electric",
    initials: "BS",
    metaTitle: "The AI Operating System for Electricians | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for electricians — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for electricians.",
    subhead:
      "Between a panel upgrade and an EV-charger quote, the job doesn't stop at the estimate — there's the schedule, the invoice, the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "No-power and safety emergencies",
      "Panel upgrades",
      "EV charger installs",
      "Outlets, switches, and wiring",
      "Lighting and fixtures",
      "Troubleshooting and inspections",
    ],
    pain: "A homeowner's outlet just sparked and the breaker won't stop tripping — they're worried about a fire and want an electrician now. You're on a ladder or under a house with your hands full, and the call goes to voicemail they'll never leave.",
    urgency:
      "Electrical problems feel like safety problems, so homeowners won't sit on hold — they call down the list until someone answers. And high-ticket EV-charger and panel leads go cold fast if nobody responds.",
    example: [
      { from: "them", text: "This is Bright Spark Electric 👋 Thanks for reaching out — is this a safety issue like sparking or no power, or a project like a panel or EV charger?" },
      { from: "me", text: "Outlet sparked and now that whole side of the house has no power" },
      { from: "them", text: "Let's treat that as urgent. Don't use that outlet — what's the address so I can get an electrician out?" },
      { from: "me", text: "7 Cedar Court" },
      { from: "them", text: "We can be out this afternoon. Booking it and I'll text you the electrician's ETA." },
    ],
    faqs: [
      { q: "Can it handle EV charger and panel-upgrade quotes?", a: "Yes. It captures the details you need to quote — panel size, vehicle, location — qualifies the lead, and books the site visit instead of letting a high-ticket job slip away." },
      { q: "Does it prioritize safety-urgent calls?", a: "It recognizes sparking, burning smells, and no-power situations as urgent, flags them, and gets them booked or escalated fast." },
      { q: "What about after-hours calls?", a: "Every call gets an instant text back around the clock, so evening and weekend leads are answered and booked instead of lost." },
    ],
  },
  {
    slug: "solar",
    noun: "solar installers",
    Noun: "Solar Installers",
    trade: "solar",
    company: "SunPath Solar",
    initials: "SP",
    metaTitle: "The AI Operating System for Solar Installers | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for solar installers — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for solar installers.",
    subhead:
      "Solar shoppers compare installers — and the job runs from the first quote through the install, the invoice, and the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "Free solar consultations",
      "System sizing and quotes",
      "Battery and storage add-ons",
      "Financing and lease questions",
      "Tax-credit and incentive questions",
      "Roof and shading qualification",
    ],
    pain: "A homeowner fills out four \"get a solar quote\" forms in one evening and waits. The installer who replies that night gets to shape the conversation and book the consult. The ones who call two days later are pitching someone who already has a proposal in hand.",
    urgency:
      "Solar is high-ticket and high-consideration — the sale is won in the consult, and the consult goes to the installer who responds first and answers the money questions without making the homeowner wait.",
    example: [
      { from: "them", text: "Hi, this is SunPath Solar 👋 Thanks for your interest! Are you mostly looking to cut your electric bill, add battery backup, or both?" },
      { from: "me", text: "Cut the bill mainly. What does a system usually cost?" },
      { from: "them", text: "Great question — it depends on your roof and usage, but most homeowners qualify for financing with no money down and the 30% federal tax credit. What's your average monthly electric bill?" },
      { from: "me", text: "Around $240" },
      { from: "them", text: "That's a strong fit. I can set up a free design consult — Wed 5 PM or Sat 11 AM. Which works?" },
    ],
    faqs: [
      { q: "Can it answer financing and tax-credit questions?", a: "Yes. It's trained on your financing options and the current incentives, so it can give homeowners the confidence-building answers that keep them engaged — then book the consult." },
      { q: "Will it qualify leads before booking a consult?", a: "It captures the essentials — electric bill, roof type, homeownership — so the consultations that land on your calendar are real, qualified prospects, not tire-kickers." },
      { q: "Does it work with leads from Google, Facebook, and lead-gen sites?", a: "Point any lead source at it — your site forms, Google, Meta, or a lead marketplace — and every new lead gets a text back in about a minute." },
    ],
  },
  {
    slug: "remodelers",
    noun: "remodelers",
    Noun: "Remodelers",
    trade: "remodeling",
    company: "Craftline Remodeling",
    initials: "CR",
    metaTitle: "The AI Operating System for Remodelers | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for remodelers — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for remodelers.",
    subhead:
      "A remodel is a long job with a lot of moving parts — the quote, the schedule, the invoice, the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "Kitchen and bathroom remodels",
      "Home additions",
      "Whole-home renovations",
      "Design-build consultations",
      "Budget and scope qualification",
      "In-home estimate booking",
    ],
    pain: "A homeowner planning a $60k kitchen sends inquiries to three remodelers off Houzz and Angi. You're on a job site all day and get to your messages at 7 PM — but the contractor who replied at lunch already has the in-home consult booked. High-ticket lead, gone.",
    urgency:
      "Remodels are big, considered purchases with long sales cycles — but the shortlist forms in the first few hours. The remodeler who responds fast and sets the consult controls the bid; everyone else is an also-ran.",
    example: [
      { from: "them", text: "Hi, this is Craftline Remodeling 👋 Thanks for reaching out — are you thinking kitchen, bath, an addition, or a whole-home project?" },
      { from: "me", text: "Kitchen remodel. Roughly what does that run?" },
      { from: "them", text: "Depends on the layout and finishes, but our kitchens typically start in the $40–60k range. Are you looking to keep the current footprint or move walls?" },
      { from: "me", text: "Probably keep the layout, just update everything" },
      { from: "them", text: "Perfect fit for us. I can set up a free in-home consult — Tue 4 PM or Sat morning. Which is better?" },
    ],
    faqs: [
      { q: "Can it qualify budget before booking a consult?", a: "Yes. It tactfully surfaces scope and budget range so your in-home consults are with serious homeowners, not people who wanted a number and vanished." },
      { q: "Does it connect to Houzz, Angi, and my website forms?", a: "Point any lead source at it. Whether the lead comes from Angi, Houzz, Google, or your own form, it gets a text back within about a minute." },
      { q: "Will it sound like my company, not a robot?", a: "It's trained on your services, style, and how you talk — most homeowners never realize they weren't texting your office." },
    ],
  },
  {
    slug: "landscapers",
    noun: "landscapers",
    Noun: "Landscapers",
    trade: "landscaping",
    company: "Evergreen Lawn & Landscape",
    initials: "EL",
    metaTitle: "The AI Operating System for Landscapers | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for landscapers — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for landscapers.",
    subhead:
      "When the season hits, the phone explodes — and there's still the quote, the schedule, the invoice, the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "Weekly lawn maintenance",
      "Landscape design and installs",
      "Hardscaping — patios and walls",
      "Irrigation and sprinklers",
      "Spring and fall cleanups",
      "Snow removal",
    ],
    pain: "The first warm week of spring, everyone decides they want their yard handled — the same week your crews are slammed and nobody's near a phone. Recurring lawn-care leads, worth thousands over a season, roll to voicemail and then to your competitor.",
    urgency:
      "Landscaping runs on seasonal surges — the spring cleanup rush and the first snowfall bring a flood of calls at once. A recurring-service customer signed up now is worth a whole season; miss the call and you miss the year.",
    example: [
      { from: "them", text: "Hi, this is Evergreen Lawn & Landscape 👋 Thanks for reaching out — is this for regular lawn care, a cleanup, or a bigger project like a patio or new design?" },
      { from: "me", text: "Weekly mowing plus a spring cleanup to start" },
      { from: "them", text: "We can absolutely do both. What's the property address so I can check we service your area?" },
      { from: "me", text: "88 Willow Road" },
      { from: "them", text: "You're in our route! I can get an estimate out Thu or Fri — which works? We'll price the cleanup and set up your weekly service." },
    ],
    faqs: [
      { q: "Can it handle recurring service *and* one-time projects?", a: "Yes. It sorts weekly lawn-care sign-ups from one-off cleanups and bigger design or hardscape projects, and books each appropriately." },
      { q: "What about the spring and first-snow rushes?", a: "That's when it pays off most — it answers every lead at once during the surge, so a flood of seasonal calls doesn't overflow into a competitor's inbox." },
      { q: "Does it book estimates on my calendar?", a: "It offers your real availability and drops confirmed estimates onto your calendar, then texts you the details so you just show up." },
    ],
  },
  {
    slug: "restoration",
    noun: "restoration companies",
    Noun: "Restoration Companies",
    trade: "restoration",
    company: "FirstResponse Restoration",
    initials: "FR",
    metaTitle: "The AI Operating System for Restoration Companies | Lead Answered",
    metaDescription:
      "Website, leads, quotes, scheduling, reviews, and invoicing for restoration companies — run by texting one assistant, Sarah. We build it with you, free, as a design partner.",
    h1: "The AI operating system for restoration companies.",
    subhead:
      "A flooded basement is an emergency — and the job runs from that first call through the estimate, the invoice, and the review. Sarah handles all of it by text, and we build it with you, free, as a design partner.",
    services: [
      "Water damage and flooding",
      "Fire and smoke damage",
      "Mold remediation",
      "Storm and wind damage",
      "Insurance claim intake",
      "24/7 emergency dispatch",
    ],
    pain: "It's 2 AM and a homeowner's basement is filling with water. They're not leaving a voicemail — they're calling every restoration company that claims 24/7 until a human responds. Whoever answers first gets the job and the insurance work; everyone else gets nothing.",
    urgency:
      "Restoration is the ultimate speed-to-lead trade: every minute of standing water means more damage and a bigger claim. Homeowners in crisis hire the first company that responds, period.",
    example: [
      { from: "them", text: "This is FirstResponse Restoration 👋 We're here — is this water, fire, or mold, and is it happening right now?" },
      { from: "me", text: "Basement is flooding right now, water still rising" },
      { from: "them", text: "We'll get a crew moving. If it's safe, shut off the water source and stay clear of electrical. What's the address?" },
      { from: "me", text: "23 Elm Street" },
      { from: "them", text: "Dispatching now — a crew is on the way and I'll text you their ETA. We'll document everything for your insurance." },
    ],
    faqs: [
      { q: "Is it really available 24/7?", a: "Yes — restoration emergencies happen at every hour, so every call gets an instant text back and can be triaged and dispatched or escalated to your on-call crew at any time, day or night." },
      { q: "Can it triage the type and severity of damage?", a: "It asks whether it's water, fire, or mold and whether it's active, prioritizes true emergencies, and captures the details your crew needs before they roll." },
      { q: "Does it help with insurance intake?", a: "It can capture the information your team needs for the claim and reassure the homeowner that everything will be documented, while it gets the crew dispatched." },
    ],
  },
];
