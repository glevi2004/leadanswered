/** Follow-ups-owned types (10-followups §4). */

export type ChaseKind = "lead" | "quote" | "invoice" | "estimate";

export interface ChaseItem {
  id: string;
  kind: ChaseKind;
  contactId: string; // → Contact
  contactName: string; // denormalized for the card
  targetId?: string; // quoteId | invoiceId | appointmentId; absent for 'lead'
  stalledSummary: string; // "Quote Q-1043 — $1,850, unanswered 3 days"
  status: "armed" | "held" | "paused" | "resolved" | "exhausted";
  holdReason?: string; // required when 'held' — rendered in Sarah's words
  lastTouchAt: string; // ISO, rendered in org tz
  nextNudgeAt?: string; // ISO; present when 'armed'
  deferredForHours: boolean; // true → "— she waits for business hours"
  attempts: number;
  maxAttempts: number; // mirrors the rule at arm time
  plannedAngle?: string; // Sarah's drafted angle, her voice
}
// maps from: 'lead' ≈ the live BullMQ delayed job (nudge-<leadId>) + Conversation.nudgedAt +
// open-Escalation check — a DERIVED read model; 'quote'|'invoice'|'estimate': none (06/08).

export interface FollowUpRule {
  kind: ChaseKind;
  enabled: boolean;
  delaysMinutes: number[]; // one entry per attempt, from the stall moment
  maxAttempts: number; // === delaysMinutes.length
  businessHoursOnly: true; // a fact, never a setting
  onePerInteraction: true; // SCOPE §5.3, surfaced as copy
  requiresApproval: boolean; // lead: false (autonomous today); others: 10 §8.1
  toneNote?: string; // fed to the proactive prompt
}
// maps from: none (lead delay is a code constant today — NUDGE_DELAY_MS in apps/api/src/queue.ts).

export interface ChaseLogEntry {
  id: string;
  at: string; // ISO
  chaseId: string;
  contactId: string;
  contactName: string;
  kind: ChaseKind;
  decision: "sent" | "skipped" | "deferred";
  reason?: string; // skipped/deferred — already in Sarah's words
  body?: string; // the message text, when sent
  outcome?: "replied" | "still_quiet" | "booked" | "accepted" | "paid";
}
// maps from: the structured [proactive] log lines — real as logs only, not queryable yet.
