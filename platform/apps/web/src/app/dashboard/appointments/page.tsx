import Link from "next/link";
import { requireContractor, contractorTz } from "@/lib/dashboard-auth";
import { listAppointments, type AppointmentRow } from "@/lib/dashboard";
import { apptStatusBadge, formatWhen } from "@/lib/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ApptList({ items, tz, empty }: { items: AppointmentRow[]; tz: string; empty: string }) {
  if (items.length === 0) return <p className="py-4 text-sm text-muted-foreground">{empty}</p>;
  return (
    <div className="flex flex-col gap-1">
      {items.map((a) => {
        const b = apptStatusBadge(a.status);
        return (
          <div key={a.id} className="flex items-center justify-between rounded-md px-2 py-2">
            <div className="min-w-0">
              {a.lead ? (
                <Link href={`/dashboard/leads/${a.lead.id}`} className="text-sm font-medium text-primary hover:underline">
                  {a.lead.contactName || a.lead.contactPhone || "Lead"}
                </Link>
              ) : (
                <span className="text-sm font-medium">Lead</span>
              )}
              <p className="text-xs text-muted-foreground">{formatWhen(a.startAt, tz)}</p>
            </div>
            <Badge variant={b.variant}>{b.label}</Badge>
          </div>
        );
      })}
    </div>
  );
}

export default async function AppointmentsPage() {
  const contractor = await requireContractor();
  const tz = contractorTz(contractor);
  const appts = await listAppointments(contractor.id); // ascending by slot
  const now = new Date().toISOString();

  const isActiveUpcoming = (a: AppointmentRow) =>
    a.startAt >= now && (a.status === "proposed" || a.status === "confirmed");
  const upcoming = appts.filter(isActiveUpcoming);
  const past = appts.filter((a) => !isActiveUpcoming(a)).reverse(); // most recent first

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="mt-1 text-sm text-muted-foreground">On-site estimates Sarah has scheduled.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming</CardTitle>
        </CardHeader>
        <CardContent>
          <ApptList items={upcoming} tz={tz} empty="Nothing booked yet." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Past &amp; cancelled</CardTitle>
        </CardHeader>
        <CardContent>
          <ApptList items={past} tz={tz} empty="Nothing here yet." />
        </CardContent>
      </Card>
    </div>
  );
}
