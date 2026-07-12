/**
 * CRM-owned types (05-crm §4). `Contact`/`TimelineEvent` live in ../shared per
 * the 00 §6 registry; this module owns the pipeline + import contracts.
 */

/** The pipeline — today's lead statuses united with the customer side. */
export type PipelineStage =
  // lead side — maps from: Lead.status, 1:1
  | "new"
  | "contacted"
  | "qualifying"
  | "booked"
  | "disqualified"
  | "no_response"
  // customer side — maps from: none (new; read-model overlay until the customer entity ships)
  | "job_scheduled"
  | "job_done"
  | "paid"
  | "past_customer";

export const LEAD_STAGES: PipelineStage[] = [
  "new",
  "contacted",
  "qualifying",
  "booked",
  "disqualified",
  "no_response",
];

/** "Your history" — one import batch. */
export interface ImportJob {
  id: string;
  source: "csv" | "quickbooks" | "jobber";
  fileName: string;
  status: "uploaded" | "mapping" | "previewing" | "running" | "done" | "failed";
  totals: { rows: number; imported: number; merged: number; skipped: number };
  progress?: number; // 0..1 while running
  createdAt: string;
}

export type CrmView = "all" | "leads" | "customers" | "needs_followup";

export interface ContactSidebar {
  nextAppointment?: { id: string; startAt: string; status: string };
  openQuote?: { id: string; label: string; totalCents: number; status: string };
  openInvoice?: { id: string; label: string; totalCents: number; status: string };
  openEscalations: number;
  facts: { label: string; value: string }[];
}
