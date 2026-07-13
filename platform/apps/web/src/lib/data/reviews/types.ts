/** Reviews-owned types (09-reviews §4). */

export type CampaignKind = "reactivation" | "ongoing";
export type CampaignStatus = "draft" | "running" | "paused" | "completed";

export type ReviewRequestStatus = "queued" | "sent" | "replied" | "reviewed" | "opted_out" | "failed";

export interface Campaign {
  id: string;
  kind: CampaignKind;
  name: string;
  status: CampaignStatus;
  importJobId?: string;
  ask: {
    reviewLinkUrl: string;
    template: string;
    reminderTemplate: string;
    reminderAfterDays: number;
  };
  pacing: { perDay: number; window: { start: string; end: string; days: number[] } };
  audience: {
    imported: number;
    eligible: number;
    excluded: { alreadyReviewed: number; optedOut: number; openLead: number; badPhone: number };
  };
  counts: Record<ReviewRequestStatus, number>;
  results: { newReviews: number; averageRating: number; googleBefore: number; googleAfter: number };
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface ReviewRequest {
  id: string;
  campaignId: string;
  contactId?: string;
  contactName: string;
  status: ReviewRequestStatus;
  paused: boolean;
  approvalId?: string; // pending review_ask Approval
  detail: string; // one-line status detail for the table
  sentAt?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export interface ReviewFeedItem {
  id: string;
  reviewer: string;
  contactId?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  excerpt: string;
  at: string;
  source: "campaign" | "ongoing" | "organic";
  url?: string; // the live Google review
  privateFeedback?: boolean; // low rating → routed to private feedback, never sent the Google link
}
