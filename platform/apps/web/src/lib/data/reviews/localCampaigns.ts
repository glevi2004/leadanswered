"use client";

import type { Campaign } from "./types";

/**
 * Demo-only client persistence for campaigns launched from the wizard (09-reviews §5).
 * The UI-first seam: launching must visibly CREATE the thing — localStorage stands in
 * for the backend until the Campaign model ships. Never read server-side.
 */

const KEY = "la_demo_campaigns";

export interface StoredCampaign {
  campaign: Campaign;
  /** eligible names still queued — the detail page renders these as queued targets */
  queuedNames: string[];
}

export function loadLocalCampaigns(): StoredCampaign[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredCampaign[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalCampaign(entry: StoredCampaign): void {
  try {
    const all = loadLocalCampaigns().filter((e) => e.campaign.id !== entry.campaign.id);
    window.localStorage.setItem(KEY, JSON.stringify([entry, ...all]));
  } catch {
    /* storage full/blocked — the toast still fired; demo continues */
  }
}

export function getLocalCampaign(id: string): StoredCampaign | null {
  return loadLocalCampaigns().find((e) => e.campaign.id === id) ?? null;
}
