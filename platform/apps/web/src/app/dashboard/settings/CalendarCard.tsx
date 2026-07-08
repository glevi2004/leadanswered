import { requireContractor } from "@/lib/dashboard-auth";
import { calendarConfigured, getCalendarConnection, googleConnectUrl } from "@/lib/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { disconnectCalendarAction } from "./calendar-actions";

/** Settings card: connect / disconnect Google Calendar + status (GOOGLE_CALENDAR.md §11). */
export async function CalendarCard() {
  if (!calendarConfigured()) return null; // hidden until the api's Google integration is provisioned
  const contractor = await requireContractor();
  const conn = await getCalendarConnection(contractor.id);
  const connected = conn?.status === "connected";
  const needsReconnect = conn?.status === "needs_reconnect";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Google Calendar</CardTitle>
        <CardDescription>
          When connected, Sarah offers times that respect your calendar, every booking lands on it, and changes you
          make in Google flow back to us. She always asks you before texting a customer about a change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connected ? (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">Connected{conn?.email ? ` as ${conn.email}` : ""}.</p>
            <form action={disconnectCalendarAction}>
              <Button type="submit" variant="outline" size="sm">
                Disconnect
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {needsReconnect ? "Your calendar needs to be reconnected." : "Not connected."}
            </p>
            <a href={googleConnectUrl(contractor.id)}>
              <Button size="sm">{needsReconnect ? "Reconnect" : "Connect Google Calendar"}</Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
