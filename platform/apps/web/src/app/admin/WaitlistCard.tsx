import { listWaitlist } from "@/lib/waitlist";
import { acceptWaitlistAction, declineWaitlistAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Pending-waitlist queue on the admin dashboard. Accept → shell org + owner invite (then the owner
 * lands in onboarding); Decline → just marks the row. Both are admin-gated server actions.
 */
export async function WaitlistCard() {
  const rows = await listWaitlist("pending");

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Waitlist ({rows.length} pending)</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{r.company || r.name || r.email}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {r.email}
                  {r.name && r.company ? ` · ${r.name}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <form action={declineWaitlistAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Decline
                  </Button>
                </form>
                <form action={acceptWaitlistAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="email" value={r.email} />
                  <input type="hidden" name="name" value={r.name ?? ""} />
                  <input type="hidden" name="company" value={r.company ?? ""} />
                  <Button type="submit" size="sm">
                    Accept &amp; invite
                  </Button>
                </form>
              </div>
            </div>
            {r.note && <p className="mt-2 text-sm text-muted-foreground">{r.note}</p>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
