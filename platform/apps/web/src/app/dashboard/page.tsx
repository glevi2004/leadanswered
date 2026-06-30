import Link from "next/link";
import { requireContractor, contractorTz } from "@/lib/dashboard-auth";
import { getDashboardSummary } from "@/lib/dashboard";
import { leadStatusBadge, apptStatusBadge, formatWhen } from "@/lib/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const verifyCopy: Record<string, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  verified: { text: "Verified", variant: "default" },
  pending: { text: "Verifying — live & sending", variant: "secondary" },
  failed: { text: "Needs attention", variant: "destructive" },
};

export default async function OverviewPage() {
  const contractor = await requireContractor();
  const tz = contractorTz(contractor);
  const summary = await getDashboardSummary(contractor.id, new Date().toISOString());

  const kpis = [
    { label: "Total leads", value: summary.totalLeads },
    { label: "Qualifying", value: summary.counts.qualifying ?? 0 },
    { label: "Booked", value: summary.counts.booked ?? 0 },
    { label: "Upcoming visits", value: summary.upcomingAppointments.length },
  ];
  const v = verifyCopy[contractor.verificationStatus] ?? verifyCopy.pending;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">What Sarah's been up to.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="py-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent leads</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {summary.recentLeads.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">No leads yet — they'll show up here the moment Sarah hears from one.</p>
            )}
            {summary.recentLeads.map((l) => {
              const b = leadStatusBadge(l.status);
              return (
                <Link
                  key={l.id}
                  href={`/dashboard/leads/${l.id}`}
                  className="flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.contactName || l.contactPhone || "New lead"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[l.projectHint, l.serviceTown].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-muted-foreground sm:inline">{formatWhen(l.createdAt, tz)}</span>
                    <Badge variant={b.variant}>{b.label}</Badge>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your line</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-2">
            <p className="text-2xl font-semibold tracking-tight">{contractor.twilioNumber ?? "—"}</p>
            <Badge variant={v.variant}>{v.text}</Badge>
            <p className="mt-1 text-xs text-muted-foreground">
              Sarah answers and books from this number. The badge shows its carrier (toll-free)
              verification status with Twilio.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming appointments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {summary.upcomingAppointments.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">Nothing booked yet.</p>
          )}
          {summary.upcomingAppointments.map((a) => {
            const b = apptStatusBadge(a.status);
            return (
              <div key={a.id} className="flex items-center justify-between rounded-md px-2 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.lead?.contactName || a.lead?.contactPhone || "Lead"}</p>
                  <p className="text-xs text-muted-foreground">{formatWhen(a.startAt, tz)}</p>
                </div>
                <Badge variant={b.variant}>{b.label}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
