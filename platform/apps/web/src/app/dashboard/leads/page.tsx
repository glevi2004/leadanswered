import Link from "next/link";
import { requireOrganization, organizationTz } from "@/lib/dashboard-auth";
import { listLeads } from "@/lib/dashboard";
import { leadStatusBadge, formatWhen } from "@/lib/dashboard-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function LeadsPage() {
  const organization = await requireOrganization();
  const tz = organizationTz(organization);
  const leads = await listLeads(organization.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
        <p className="mt-1 text-sm text-muted-foreground">{leads.length} total</p>
      </div>

      {leads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No leads yet. When someone texts your number or a lead email comes in, they'll appear here.
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="hidden md:table-cell">Project</TableHead>
                <TableHead className="hidden lg:table-cell">Town</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">First seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => {
                const b = leadStatusBadge(l.status);
                return (
                  <TableRow key={l.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <Link href={`/dashboard/leads/${l.id}`} className="text-primary hover:underline">
                        {l.contactName || l.contactPhone || "New lead"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{l.contactPhone ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{l.projectHint ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{l.serviceTown ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={b.variant}>{b.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{formatWhen(l.createdAt, tz)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
