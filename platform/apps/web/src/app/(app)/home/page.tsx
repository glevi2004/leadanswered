import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { isDemoMode } from "@/lib/data/gating";
import { getHomeDataMock, getHomeDataReal } from "@/lib/data/home";
import { APEX } from "@/lib/data/fixtures/apex";
import { formatTime } from "@/lib/dashboard-ui";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { Badge } from "@/components/ui/badge";
import { NeedsAttention, ActivityDigest } from "./HomeClient";

const verifyCopy: Record<string, { text: string; variant: "default" | "secondary" | "destructive" }> = {
  verified: { text: "Verified", variant: "default" },
  pending: { text: "Verifying — live & sending", variant: "secondary" },
  failed: { text: "Needs attention", variant: "destructive" },
};

function greeting(tz: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hour12: false }).format(new Date()),
  );
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

export default async function HomePage() {
  const organization = await requireOrganization();
  const demo = await isDemoMode();
  const tz = demo ? APEX.timezone : organizationTz(organization);
  const ownerFirst = demo ? APEX.ownerName : ((organization.name as string)?.split(" ")[0] ?? "");
  const data = demo ? getHomeDataMock() : await getHomeDataReal(organization.id, tz);
  const v = verifyCopy[organization.verificationStatus] ?? verifyCopy.pending;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={
          <>
            {greeting(tz)}, <span className="serif-accent text-gradient-green">{ownerFirst}</span>
          </>
        }
        description="Here's where things stand."
      />

      <NeedsAttention escalations={data.escalations} />

      {/* The pipeline, left to right: what came in → what became work → what's waiting on a yes → where money is stuck. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="New leads this week"
          value={data.stats.newLeadsThisWeek}
          hint={
            data.stats.medianResponseSecs != null
              ? `every one answered in ~${data.stats.medianResponseSecs}s`
              : "Sarah answers every one in under 60s"
          }
          href="/crm"
        />
        <StatCard label="Booked this week" value={data.stats.bookedThisWeek} href="/schedule" />
        <StatCard
          label="Quotes out"
          soon={data.stats.quotesAwaiting === null}
          value={data.stats.quotesAwaiting ?? undefined}
          hint={
            data.stats.quotesAwaitingCents != null
              ? `$${(data.stats.quotesAwaitingCents / 100).toLocaleString()} waiting on a yes`
              : undefined
          }
          href="/quotes"
        />
        <StatCard
          label="Owed to you"
          soon={data.stats.owedCents === null}
          value={data.stats.owedCents != null ? `$${(data.stats.owedCents / 100).toLocaleString()}` : undefined}
          hint={
            data.stats.overdueCents ? (
              <span className="font-medium text-destructive">
                ${(data.stats.overdueCents / 100).toLocaleString()} overdue
              </span>
            ) : undefined
          }
          href="/invoices"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-lift rounded-2xl border bg-card p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">What Sarah's been doing</h2>
            <Link
              href="/sarah"
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              See everything <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="mt-3">
            <ActivityDigest />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card-lift rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {data.scheduleGlance.items.length > 0 ? data.scheduleGlance.dayLabel : "Schedule"}
              </h2>
              <Link href="/schedule" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Schedule <ArrowRight className="size-3" />
              </Link>
            </div>
            {data.scheduleGlance.items.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing on the calendar yet — Sarah books estimates straight into it.
              </p>
            ) : (
              <ol className="mt-3 flex flex-col">
                {data.scheduleGlance.items.map((item, i) => (
                  <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {i < data.scheduleGlance.items.length - 1 && (
                      <span className="absolute left-[5px] top-4 h-full w-px bg-border" aria-hidden />
                    )}
                    <span className="mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-primary bg-background" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {formatTime(item.startAt, tz)} · {item.name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {item.town && (
                          <>
                            <MapPin className="size-3" /> {item.town}
                          </>
                        )}
                        {item.driveGapAfter && <span className="text-primary">· {item.driveGapAfter}</span>}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="card-lift rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Reputation</h2>
              <Link href="/reviews" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Reviews <ArrowRight className="size-3" />
              </Link>
            </div>
            {data.stats.reviewsCollected === null ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Sarah will text your past customers for reviews the moment the campaign goes live —
                most owners see a wave in week one.
              </p>
            ) : (
              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-3xl font-semibold tracking-tight">{data.stats.reviewsCollected}</p>
                <p className="text-sm text-muted-foreground">
                  new reviews · <span className="font-medium text-foreground">{data.stats.reviewsAvg}★</span> average
                </p>
              </div>
            )}
          </div>

          <div className="card-lift rounded-2xl border bg-card p-5 shadow-xs">
            <h2 className="text-sm font-semibold">Everything's running</h2>
            <div className="mt-3 flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  Sarah is answering
                </span>
                <span className="font-medium">{demo ? "(844) 415-7642" : (organization.twilioNumber ?? "—")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Your line</span>
                <Badge variant={v.variant}>{v.text}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
