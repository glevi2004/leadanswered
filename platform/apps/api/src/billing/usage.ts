import type { Store } from "../store/types.js";

export interface UsageThisPeriod {
  plan: string;
  usedMicros: number;
  bucketMicros: number;
  remainingMicros: number;
  overBucket: boolean;
  overageOptIn: boolean;
  periodStart: string;
}

/**
 * The org's metered agent-compute this billing period vs its bucket (plan Pillar 2). Drives the
 * Engineer dispatch gate + the dock usage display. No Stripe yet, so `overBucket && !overageOptIn`
 * is the only hard stop; with `overageOptIn` (the default) builds keep running past the bucket.
 */
export async function usageThisPeriod(store: Store, orgId: string): Promise<UsageThisPeriod> {
  const sub = await store.getOrCreateSubscription(orgId);
  const summary = await store.sumUsageSince(orgId, sub.periodStart);
  const usedMicros = summary.costMicros;
  return {
    plan: sub.plan,
    usedMicros,
    bucketMicros: sub.bucketMicros,
    remainingMicros: Math.max(0, sub.bucketMicros - usedMicros),
    overBucket: usedMicros >= sub.bucketMicros,
    overageOptIn: sub.overageOptIn,
    periodStart: sub.periodStart,
  };
}
