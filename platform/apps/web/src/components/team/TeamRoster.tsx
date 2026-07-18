"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  Code2,
  LifeBuoy,
  Megaphone,
  Palette,
  Plus,
  Scale,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { type DeptId } from "@/lib/canvas/graph";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * TEAM ROSTER — the human side of the company canvas. Each teammate works alongside a
 * department's AI agent (a CFO with Finance, an engineer with Engineering) and shows up
 * on the Workspace graph as a game-like node next to that department. This page is where
 * you manage them: grouped by department, each a tinted avatar + role + what they own.
 * "Add teammate" is a local mock — it drops a new person into the list (and, in the real
 * product, onto the Workspace graph). No persistence yet.
 */

const DEPT_META: Record<DeptId, { label: string; tint: string; Icon: React.ComponentType<{ className?: string }> }> = {
  sales: { label: "Sales", tint: "163,230,53", Icon: TrendingUp },
  operations: { label: "Operations", tint: "251,146,60", Icon: CalendarClock },
  finance: { label: "Finance", tint: "52,211,153", Icon: Wallet },
  legal: { label: "Legal", tint: "167,139,250", Icon: Scale },
  engineering: { label: "Engineering", tint: "96,165,250", Icon: Code2 },
  design: { label: "Design", tint: "232,121,249", Icon: Palette },
  marketing: { label: "Marketing", tint: "244,114,182", Icon: Megaphone },
  support: { label: "Support", tint: "56,189,248", Icon: LifeBuoy },
};

// Fixed canvas order so groups render consistently regardless of add order.
const DEPT_ORDER: DeptId[] = [
  "sales", "operations", "finance", "legal", "engineering", "design", "marketing", "support",
];

const DEPT_ITEMS = Object.fromEntries(
  DEPT_ORDER.map((id) => [id, DEPT_META[id].label]),
) as Record<DeptId, string>;

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "They";

/** A teammate on the roster — a person attached to the department whose agent they work with. */
type TeammateProfile = {
  id: string;
  dept: DeptId;
  name: string;
  role: string;
  initials: string;
  tint: string;
  handsOff: string;
};

export function TeamRoster() {
  // The roster is honest-empty; teammates are added locally until persistence lands.
  const [members, setMembers] = React.useState<TeammateProfile[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [addName, setAddName] = React.useState("");
  const [addRole, setAddRole] = React.useState("");
  const [addDept, setAddDept] = React.useState<DeptId>("operations");

  const resetForm = () => {
    setAddName("");
    setAddRole("");
    setAddDept("operations");
  };

  const addTeammate = () => {
    const name = addName.trim();
    if (!name) return;
    const meta = DEPT_META[addDept];
    const role = addRole.trim() || "Teammate";
    setMembers((prev) => [
      ...prev,
      {
        id: `tm-local-${prev.length}-${Date.now()}`,
        dept: addDept,
        name,
        role,
        initials: initialsOf(name),
        tint: meta.tint,
        handsOff: `Works with the ${meta.label} agent — hand off ${meta.label.toLowerCase()} work as it comes up.`,
      },
    ]);
    setAddOpen(false);
    resetForm();
    // UI honesty (docs/product.md §0): teammates are NOT persisted yet — say so plainly
    // instead of claiming they joined and appear on the graph.
    toast.info(`${firstName(name)} added — for this session only.`, {
      description: "Saving teammates to your org is coming soon; this list resets on reload.",
    });
  };

  // Group into department buckets, keeping the fixed canvas order; drop empty depts.
  const groups = DEPT_ORDER.map((id) => ({
    id,
    meta: DEPT_META[id],
    people: members.filter((m) => m.dept === id),
  })).filter((g) => g.people.length > 0);

  const deptCount = groups.length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team"
        description={
          <>
            Your teammates work alongside each department&rsquo;s agent. Each one appears on the{" "}
            <Link href="/home" className="font-medium text-foreground underline underline-offset-3 hover:text-muted-foreground">
              Workspace
            </Link>{" "}
            graph as a node next to the department they work with.
          </>
        }
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Add teammate
          </Button>
        }
      />

      <p className="-mt-2 font-mono text-xs text-muted-foreground">
        {members.length} {members.length === 1 ? "teammate" : "teammates"} · {deptCount}{" "}
        {deptCount === 1 ? "department" : "departments"}
      </p>

      {members.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card/50 px-6 py-12 text-center">
          <p className="text-sm font-medium">No teammates yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the people who work alongside your agents — they&rsquo;ll appear on the canvas next to
            their department.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(({ id, meta, people }) => (
            <section key={id} className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-foreground ring-1 ring-foreground/10">
                  <meta.Icon className="size-4" />
                </span>
                <h2 className="text-sm font-semibold tracking-tight">{meta.label}</h2>
                <span className="font-mono text-xs text-muted-foreground">
                  {String(people.length).padStart(2, "0")}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {people.map((m) => (
                  <TeammateCard key={m.id} member={m} deptLabel={meta.label} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Add teammate — local mock (no persistence yet). */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add teammate</DialogTitle>
            <DialogDescription>
              They join this roster for the current session.{" "}
              <span className="font-medium text-foreground">Saving teammates to your org is coming
              soon</span>{" "}
              — the list resets on reload for now.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Field label="Name" htmlFor="tm-name">
              <Input
                id="tm-name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Marina Alves"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTeammate(); }
                }}
              />
            </Field>
            <Field label="Role" htmlFor="tm-role">
              <Input
                id="tm-role"
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                placeholder="e.g. CFO"
              />
            </Field>
            <Field label="Department">
              <Select items={DEPT_ITEMS} value={addDept} onValueChange={(v) => v && setAddDept(v as DeptId)}>
                <SelectTrigger aria-label="Department" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPT_ORDER.map((id) => (
                    <SelectItem key={id} value={id}>
                      {DEPT_META[id].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Sets who they sit next to on the Workspace — the {DEPT_META[addDept].label} agent.
              </p>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!addName.trim()} onClick={addTeammate}>
              Add teammate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A game-like teammate node: tinted round avatar + name + role tag + what they own. */
function TeammateCard({ member, deptLabel }: { member: TeammateProfile; deptLabel: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 elev-card transition-colors hover:ring-foreground/20">
      <div className="flex items-center gap-3">
        <TeammateAvatar initials={member.initials} tint={member.tint} />
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{member.name}</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {member.role}
            <span className="text-muted-foreground/60"> · {deptLabel}</span>
          </p>
        </div>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{member.handsOff}</p>
    </div>
  );
}

/** Solid tinted token with a subtle top gloss + bottom shade so initials stay legible. */
function TeammateAvatar({ initials, tint, className }: { initials: string; tint: string; className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-full text-sm font-semibold text-white ring-1 ring-foreground/10 elev-btn select-none",
        className,
      )}
      style={{ backgroundColor: `rgb(${tint})` }}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/25 via-transparent to-black/20" />
      <span className="relative drop-shadow-sm">{initials}</span>
    </span>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
