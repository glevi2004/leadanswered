"use client";

import * as React from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { Member } from "@/lib/data/team/types";
import { ROLES } from "@/lib/data/team";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/**
 * A live org graph on an Excalidraw-style canvas: pan by dragging, zoom with the
 * wheel (to the cursor), auto-fit so the whole tree is always in view. Owner is
 * the root; everyone hangs off their manager (or the owner). Click a node for
 * "What Lu knows". As the owner tells Lu about people, nodes appear + it re-fits.
 */

const initials = (name: string) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const titleOf = (m: Member): string => m.learned?.title ?? ROLES[m.roleKey].name;

function NodeCard({ member, root, onSelect }: { member: Member; root?: boolean; onSelect: (m: Member) => void }) {
  const skills = member.learned?.skills ?? [];
  return (
    <button
      type="button"
      onClick={() => onSelect(member)}
      aria-label={`What Lu knows about ${member.name}`}
      className={cn(
        "flex w-32 items-center gap-2 rounded-xl border bg-card px-2.5 py-2 text-left shadow-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        root && "border-foreground/25",
      )}
    >
      <Avatar className="size-6 shrink-0">
        <AvatarFallback className="text-[10px]">{initials(member.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-tight">{member.name}</p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">{titleOf(member)}</p>
        {skills.length > 0 && (
          <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground/80">{skills.slice(0, 2).join(" · ")}</p>
        )}
      </div>
    </button>
  );
}

function TreeNode({
  member,
  childrenMap,
  onSelect,
  root,
}: {
  member: Member;
  childrenMap: Map<string, Member[]>;
  onSelect: (m: Member) => void;
  root?: boolean;
}) {
  const kids = childrenMap.get(member.id) ?? [];
  const multiple = kids.length > 1;
  return (
    <div className="flex flex-col items-center">
      <NodeCard member={member} root={root} onSelect={onSelect} />
      {kids.length > 0 && (
        <>
          <span className="h-4 w-px bg-border" aria-hidden />
          <div className="flex items-start justify-center">
            {kids.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center px-2 pt-4">
                <span className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-border" aria-hidden />
                {multiple && (
                  <span
                    className={cn(
                      "absolute top-0 h-px bg-border",
                      i === 0 ? "left-1/2 right-0" : i === kids.length - 1 ? "left-0 right-1/2" : "inset-x-0",
                    )}
                    aria-hidden
                  />
                )}
                <TreeNode member={child} childrenMap={childrenMap} onSelect={onSelect} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

type View = { x: number; y: number; k: number };
const clampK = (k: number) => Math.max(0.25, Math.min(2.5, k));

export function TeamGraph({ members }: { members: Member[] }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>({ x: 0, y: 0, k: 1 });

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ sx: number; sy: number; vx: number; vy: number } | null>(null);
  const moved = React.useRef(false);

  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const owner = React.useMemo(() => members.find((m) => m.roleKey === "owner"), [members]);

  const managerOf = React.useCallback(
    (m: Member): Member | null => {
      if (!owner || m.id === owner.id) return null;
      if (m.reportsTo && m.reportsTo !== m.id && byId.has(m.reportsTo)) return byId.get(m.reportsTo) ?? owner;
      return owner;
    },
    [owner, byId],
  );

  const childrenMap = React.useMemo(() => {
    const map = new Map<string, Member[]>();
    if (!owner) return map;
    for (const m of members) {
      const manager = managerOf(m);
      if (!manager) continue;
      const arr = map.get(manager.id) ?? [];
      arr.push(m);
      map.set(manager.id, arr);
    }
    return map;
  }, [members, owner, managerOf]);

  const fit = React.useCallback(() => {
    const vp = viewportRef.current;
    const inner = innerRef.current;
    if (!vp || !inner) return;
    const cw = inner.offsetWidth;
    const ch = inner.offsetHeight;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    if (!cw || !ch || !vw || !vh) return;
    const pad = 56;
    const k = clampK(Math.min(1.1, (vw - pad) / cw, (vh - pad) / ch));
    setView({ k, x: (vw - cw * k) / 2, y: (vh - ch * k) / 2 });
  }, []);

  // fit whenever the team changes (nodes added) and on first paint
  React.useLayoutEffect(() => {
    fit();
  }, [members, fit]);

  // native wheel (non-passive so we can preventDefault) + refit on resize
  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(vp);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      setView((v) => {
        const k = clampK(v.k * Math.exp(-e.deltaY * 0.0016));
        const wx = (px - v.x) / v.k;
        const wy = (py - v.y) / v.k;
        return { k, x: px - wx * k, y: py - wy * k };
      });
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      vp.removeEventListener("wheel", onWheel);
    };
  }, [fit]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    moved.current = false;
    drag.current = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    setView((v) => ({ ...v, x: drag.current!.vx + dx, y: drag.current!.vy + dy }));
  };
  const endPan = () => {
    drag.current = null;
  };
  const selectNode = (m: Member) => {
    if (!moved.current) setSelectedId(m.id);
  };

  const zoomBy = (factor: number) =>
    setView((v) => {
      const vp = viewportRef.current;
      const px = (vp?.clientWidth ?? 0) / 2;
      const py = (vp?.clientHeight ?? 0) / 2;
      const k = clampK(v.k * factor);
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      return { k, x: px - wx * k, y: py - wy * k };
    });

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const learned = selected?.learned;
  const skills = learned?.skills ?? [];
  const canHandle = learned?.canHandle ?? [];
  const reportsToName = selected ? managerOf(selected)?.name ?? "—" : "—";
  const hasTeammates = !!owner && members.some((m) => m.id !== owner.id);

  return (
    <div className="relative h-full w-full">
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerLeave={endPan}
        className="h-full w-full touch-none select-none overflow-hidden [cursor:grab] active:[cursor:grabbing]"
        style={{
          backgroundImage:
            "radial-gradient(color-mix(in oklab, var(--foreground) 13%, transparent) 1px, transparent 0)",
          backgroundSize: `${22 * view.k}px ${22 * view.k}px`,
          backgroundPosition: `${view.x}px ${view.y}px`,
        }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
        >
          <div ref={innerRef} className="inline-flex flex-col items-center p-4">
            {owner ? (
              <TreeNode member={owner} childrenMap={childrenMap} onSelect={selectNode} root />
            ) : (
              <div className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
                Add your team — Lu will build the org graph.
              </div>
            )}
            {owner && !hasTeammates && (
              <p className="mt-3 max-w-[10rem] text-center text-[11px] text-muted-foreground">
                Add your first teammate — Lu will place them here.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* zoom / fit controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-full border bg-card/90 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.2)}
          title="Zoom out"
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={fit}
          title="Fit to view"
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Maximize2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => zoomBy(1.2)}
          title="Zoom in"
          className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      {/* What Lu knows */}
      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">{initials(selected.name)}</AvatarFallback>
                  </Avatar>
                  {selected.name}
                </SheetTitle>
                <SheetDescription>What Lu knows about {selected.name.split(" ")[0]}</SheetDescription>
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                <Field label="Title">{titleOf(selected)}</Field>
                <Field label="Cell">
                  <span className="tabular-nums text-muted-foreground">{selected.phone || "—"}</span>
                </Field>
                {selected.email && (
                  <Field label="Email">
                    <span className="text-muted-foreground">{selected.email}</span>
                  </Field>
                )}
                <Field label="Reports to">
                  <span className={reportsToName === "—" ? "text-muted-foreground" : undefined}>{reportsToName}</span>
                </Field>
                {selected.roleKey !== "owner" && (selected.phone || selected.email) && (
                  <p className="rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-700 dark:text-emerald-300">
                    Lu will text{selected.email ? " and email" : ""} {selected.name.split(" ")[0]} an invite to join.
                  </p>
                )}

                {skills.length > 0 && (
                  <Field label="Skills">
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map((s) => (
                        <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  </Field>
                )}

                {learned?.coverage && <Field label="Coverage">{learned.coverage}</Field>}

                {canHandle.length > 0 && (
                  <Field label="Lu can handle">
                    <span className="text-muted-foreground">{canHandle.join(" · ")}</span>
                  </Field>
                )}

                {learned?.summary && (
                  <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Lu&rsquo;s take: </span>
                    {learned.summary}
                  </div>
                )}

                {learned?.source && (
                  <p className="text-xs text-muted-foreground">
                    {learned.source === "told" ? "You told Lu this." : "Lu inferred this from your jobs."}
                  </p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
