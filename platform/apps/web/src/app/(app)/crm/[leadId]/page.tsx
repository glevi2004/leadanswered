import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { getLeadDetail } from "@/lib/dashboard";
import { leadStatusBadge, apptStatusBadge, formatWhen, formatTime } from "@/lib/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  const organization = await requireOrganization();
  const tz = organizationTz(organization);

  const lead = await getLeadDetail(organization.id, leadId);
  if (!lead) notFound(); // not found OR not this organization's lead — same 404

  const b = leadStatusBadge(lead.status);
  const messages = lead.conversation?.messages ?? [];
  const subtitle = [
    lead.contactPhone,
    lead.projectHint,
    lead.fullAddress || lead.serviceTown || lead.serviceZip,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/crm" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to leads
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lead.contactName || lead.contactPhone || "New lead"}
          </h1>
          <Badge variant={b.variant}>{b.label}</Badge>
        </div>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No messages yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((m) => {
                  const inbound = m.direction === "inbound";
                  return (
                    <div key={m.id} className={cn("flex", inbound ? "justify-start" : "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                          inbound ? "bg-muted" : "bg-primary text-primary-foreground",
                        )}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p
                          className={cn(
                            "mt-1 text-[10px]",
                            inbound ? "text-muted-foreground" : "text-primary-foreground/70",
                          )}
                        >
                          {inbound ? lead.contactName || "Lead" : organization.sarahName || "Sarah"} ·{" "}
                          {formatTime(m.createdAt, tz)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Appointments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {lead.appointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">None booked.</p>
              ) : (
                lead.appointments.map((a) => {
                  const ab = apptStatusBadge(a.status);
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm">{formatWhen(a.startAt, tz)}</span>
                      <Badge variant={ab.variant}>{ab.label}</Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {lead.escalations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Escalations</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {lead.escalations.map((e) => (
                  <div key={e.id} className="text-sm">
                    <p className="font-medium">{e.question}</p>
                    {e.answer && <p className="mt-0.5 text-muted-foreground">You: {e.answer}</p>}
                    <Badge variant={e.status === "resolved" ? "default" : "secondary"} className="mt-1">
                      {e.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
