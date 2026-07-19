"use client";

import * as React from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { Member, RoleKey } from "@/lib/data/team/types";
import { ROLES, addMemberMock, listMembersMock, membersStore } from "@/lib/data/team";
import { statusChip } from "@/lib/dashboard-ui";
import { DataTable } from "@/components/app/DataTable";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MemberMatrix, RolesMatrix } from "./PermissionsMatrix";
import { TeamGraph } from "./TeamGraph";
import { cn } from "@/lib/utils";

/** 12-team: who Lu knows, what each person can ask her, what they see in the app. */

const ROLE_ITEMS = { owner: "Owner", office: "Office", crew: "Crew" } as const;

function lastActive(iso?: string): string {
  if (!iso) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 5) return "now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / (60 * 24))}d ago`;
}

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export function TeamClient({ members }: { members?: Member[] } = {}) {
  const [, bump] = React.useReducer((n: number) => n + 1, 0);
  const [addOpen, setAddOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState<Member | null>(null);
  const [sheetId, setSheetId] = React.useState<string | null>(null);
  const [addName, setAddName] = React.useState("");
  const [addPhone, setAddPhone] = React.useState("");
  const [addEmail, setAddEmail] = React.useState("");
  const [addRole, setAddRole] = React.useState<RoleKey>("crew");
  const [removedIds] = React.useState(() => new Set<string>());

  const baseMembers = members ?? listMembersMock();
  const roster = baseMembers.filter((m) => !removedIds.has(m.id));
  const sheetMember = roster.find((m) => m.id === sheetId) ?? null;

  const canText = roster.filter((m) => m.smsStatus === "active").length;
  const haveApp = roster.filter((m) => m.appAccess === "active").length;

  const addMember = () => {
    if (!addName.trim() || !addPhone.trim()) return;
    const m = addMemberMock({ name: addName.trim(), phone: addPhone.trim(), roleKey: addRole, email: addEmail.trim() || undefined });
    setAddOpen(false);
    setAddName("");
    setAddPhone("");
    setAddEmail("");
    setAddRole("crew");
    bump();
    toast.success(`Lu's texting ${m.name} a hello.`, {
      description: m.email
        ? "They can text her the moment they reply — app invite is on its way too."
        : "They can text her the moment they reply. No app setup needed.",
    });
  };

  const columns: ColumnDef<Member, unknown>[] = [
    {
      header: "Member",
      accessorKey: "name",
      cell: ({ row }) => (
        <span className="flex items-center gap-2.5">
          <Avatar className="size-7">
            <AvatarFallback className="text-[10px]">{initials(row.original.name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{row.original.name}</span>
        </span>
      ),
    },
    {
      header: "Role",
      accessorKey: "roleKey",
      cell: ({ row }) => (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">{ROLES[row.original.roleKey].name}</span>
      ),
    },
    {
      header: "Phone",
      accessorKey: "phone",
      cell: ({ row }) => <span className="text-sm tabular-nums text-muted-foreground">{row.original.phone}</span>,
    },
    {
      header: "Access",
      accessorKey: "appAccess",
      cell: ({ row }) => {
        const m = row.original;
        const chip =
          m.smsStatus === "pending_hello"
            ? statusChip("pending_hello")
            : m.appAccess === "active"
              ? statusChip("on")
              : m.appAccess === "invited"
                ? statusChip("invited")
                : null;
        const label =
          m.smsStatus === "pending_hello" ? "Hello sent" : m.appAccess === "active" ? "App: active" : m.appAccess === "invited" ? "App: invited" : "Texts only";
        return (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip ? chip.chip : "bg-muted text-muted-foreground")}>
            {label}
          </span>
        );
      },
    },
    {
      header: "Last active",
      accessorKey: "lastActiveAt",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{lastActive(row.original.lastActiveAt)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const m = row.original;
        const isOwner = m.roleKey === "owner";
        return (
          <span onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="Member actions" className="px-1.5" />}>
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSheetId(m.id)}>Role &amp; permissions</DropdownMenuItem>
                {m.smsStatus === "pending_hello" && (
                  <DropdownMenuItem onClick={() => toast.success(`Hello resent to ${m.name}.`)}>Resend hello</DropdownMenuItem>
                )}
                {m.appAccess === "invited" && (
                  <DropdownMenuItem onClick={() => toast.success(`App invite resent to ${m.email}.`)}>Resend app invite</DropdownMenuItem>
                )}
                {!isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setRemoveTarget(m)}>
                      Remove
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        {roster.length} people · {canText} can text Lu · {haveApp} {haveApp === 1 ? "has" : "have"} app logins
      </p>

      <Tabs defaultValue="members" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="members" className="px-3">
            Members
          </TabsTrigger>
          <TabsTrigger value="roles" className="px-3">
            Roles &amp; permissions
          </TabsTrigger>
          <TabsTrigger value="org" className="px-3">
            Org chart
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <DataTable
            columns={columns}
            data={roster}
            searchPlaceholder="Search people…"
            searchFn={(m, q) => m.name.toLowerCase().includes(q) || m.phone.includes(q)}
            onRowClick={(m) => setSheetId(m.id)}
            toolbar={
              <Button size="sm" className="h-8 gap-1" onClick={() => setAddOpen(true)}>
                <Plus className="size-3.5" /> Add someone
              </Button>
            }
          />
          <p className="mt-1.5 text-xs text-muted-foreground">The phone number is how Lu knows them.</p>
        </TabsContent>

        <TabsContent value="roles">
          <div className="grid gap-3 md:grid-cols-3">
            {(["owner", "office", "crew"] as const).map((key) => (
              <div key={key} className="rounded-2xl border bg-card p-4">
                <p className="text-sm font-semibold">{ROLES[key].name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{ROLES[key].blurb}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">The full matrix</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This is Lu's briefing — she checks it on every text and every question in the app.
            </p>
            <div className="mt-3">
              <RolesMatrix />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="org">
          <div className="h-[460px] overflow-hidden rounded-2xl border bg-background">
            <TeamGraph members={roster} />
          </div>
        </TabsContent>
      </Tabs>

      {/* add someone (12 §2) */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add someone</DialogTitle>
            <DialogDescription>Lu texts them a hello — they can text her back the moment they reply.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Name" aria-label="Name" autoFocus />
            <Input value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="Phone — the number Lu will know them by" aria-label="Phone" inputMode="tel" />
            <Select items={ROLE_ITEMS} value={addRole} onValueChange={(v) => v && setAddRole(v as RoleKey)}>
              <SelectTrigger aria-label="Role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["crew", "office", "owner"] as const).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_ITEMS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div>
              <Input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="Email (optional)" aria-label="Email" inputMode="email" />
              <p className="mt-1 text-xs text-muted-foreground">Add an email to give them the app too — otherwise they just text Lu.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!addName.trim() || !addPhone.trim()} onClick={addMember}>
              Add &amp; say hello
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* remove confirm (12 §5) */}
      <Dialog open={removeTarget !== null} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.name}?</DialogTitle>
            <DialogDescription>
              Lu stops recognizing their number and any app login is revoked. Their history on jobs stays.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>
              Keep them
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (removeTarget) {
                  removedIds.add(removeTarget.id);
                  toast(`${removeTarget.name} removed — Lu won't answer that number anymore.`);
                }
                setRemoveTarget(null);
                bump();
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* member detail sheet (12 §2) */}
      <Sheet open={sheetMember !== null} onOpenChange={(o) => !o && setSheetId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {sheetMember && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials(sheetMember.name)}</AvatarFallback>
                  </Avatar>
                  {sheetMember.name}
                </SheetTitle>
                <SheetDescription>
                  {sheetMember.phone}
                  {sheetMember.email ? ` · ${sheetMember.email}` : " · texts only"}
                </SheetDescription>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Role</p>
                  <Select
                    items={ROLE_ITEMS}
                    value={sheetMember.roleKey}
                    onValueChange={(v) => {
                      if (!v || sheetMember.roleKey === "owner") return;
                      membersStore.patch(sheetMember.id, { roleKey: v as RoleKey, overrides: undefined });
                      bump();
                      toast.success(`${sheetMember.name} is now ${ROLE_ITEMS[v as RoleKey]}.`, {
                        description: "Lu answers their next text with the new role.",
                      });
                    }}
                  >
                    <SelectTrigger aria-label="Role" disabled={sheetMember.roleKey === "owner"}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(["crew", "office", "owner"] as const).map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_ITEMS[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {sheetMember.roleKey === "owner" && (
                    <p className="mt-1 text-xs text-muted-foreground">🔒 The owner role can't be changed here.</p>
                  )}
                </div>

                <details>
                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                    Advanced permissions
                  </summary>
                  <div className="mt-2">
                    <MemberMatrix member={sheetMember} onChanged={bump} />
                  </div>
                </details>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Notifications</p>
                  {sheetMember.notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No alerts — they only hear from Lu when they text her.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {sheetMember.notifications.map((n) => (
                        <p key={n.eventType} className="text-sm">
                          {n.eventType.replaceAll("_", " ")}
                          <span className="ml-1.5 text-xs text-muted-foreground">({n.channels})</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
