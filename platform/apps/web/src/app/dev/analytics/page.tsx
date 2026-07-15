/** DEV-ONLY visual check for Analytics (public in development). */
import { SarahProvider } from "@/components/sarah/sarah-context";
import { APEX, APEX_ACTIONS, APEX_APPROVALS, APEX_THREAD } from "@/lib/data/fixtures/apex";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import type { RangePreset } from "@/lib/data/analytics/types";

export default async function DevAnalytics({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const preset: RangePreset = range === "7d" || range === "90d" ? range : "30d";
  return (
    <SarahProvider demo ownerName={APEX.ownerName} initialMessages={APEX_THREAD} initialApprovals={APEX_APPROVALS} initialActions={APEX_ACTIONS}>
      <div className="mx-auto max-w-6xl p-8">
        <AnalyticsView range={preset} />
      </div>
    </SarahProvider>
  );
}
