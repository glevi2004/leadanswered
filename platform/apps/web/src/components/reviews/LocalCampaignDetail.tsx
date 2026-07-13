"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReviewRequest } from "@/lib/data/reviews/types";
import { getLocalCampaign, type StoredCampaign } from "@/lib/data/reviews/localCampaigns";
import { CampaignDetail } from "./CampaignDetail";

/** Detail for a campaign launched from the wizard this session (localStorage seam). */
export function LocalCampaignDetail({ campaignId }: { campaignId: string }) {
  const [entry, setEntry] = React.useState<StoredCampaign | null | undefined>(undefined);

  React.useEffect(() => {
    setEntry(getLocalCampaign(campaignId));
  }, [campaignId]);

  if (entry === undefined) return null; // first client paint

  if (entry === null) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Link href="/reviews" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" /> Reviews
        </Link>
        <p className="text-sm text-muted-foreground">That campaign isn't here anymore.</p>
      </div>
    );
  }

  const requests: ReviewRequest[] = entry.queuedNames.map((n, i) => ({
    id: `lrr_${i}`,
    campaignId: entry.campaign.id,
    contactName: n,
    status: "queued",
    paused: false,
    detail: i < entry.campaign.pacing.perDay ? "first wave — tomorrow from 9:00" : "queued",
  }));

  return <CampaignDetail campaign={entry.campaign} requests={requests} />;
}
