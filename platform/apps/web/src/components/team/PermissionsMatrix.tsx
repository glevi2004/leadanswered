"use client";

import * as React from "react";
import { toast } from "sonner";
import type { Member, ModuleAccess, LuCapabilities } from "@/lib/data/team/types";
import { ROLES, SARAH_CAP_LABELS, effectiveAccess, membersStore } from "@/lib/data/team";
import type { ModuleKey } from "@/lib/data/shared";
import { MODULES } from "@/lib/data/registry";
import { cn } from "@/lib/utils";

/**
 * The permissions matrix (12 §6) — Lu's briefing, drawn. Two modes:
 * roles view (columns = the three presets, read-only) and member view
 * (one column, click a cell to cycle its value — mock-saves instantly).
 * approveHardGates is code-locked to Owner and never editable.
 */

const MODULE_ROWS: ModuleKey[] = ["crm", "schedule", "quotes", "invoices", "followups", "website", "content", "reviews", "analytics", "team"];
const ACCESS_CYCLE: ModuleAccess[] = ["none", "view", "act"];
const SCOPE_CYCLE: Array<"none" | "own" | "all"> = ["none", "own", "all"];

function AccessChip({ value, muted }: { value: string; muted?: boolean }) {
  const label = value === "none" ? "—" : value;
  return (
    <span
      className={cn(
        "inline-block min-w-11 rounded-full px-1.5 py-0.5 text-center text-[10px] font-medium capitalize",
        value === "none" ? "text-muted-foreground/50" : muted ? "bg-muted text-muted-foreground" : "bg-muted text-foreground",
      )}
    >
      {label}
    </span>
  );
}

function BoolChip({ value }: { value: boolean }) {
  return <span className={cn("text-xs", value ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50")}>{value ? "✓" : "—"}</span>;
}

/** Roles view: three read-only columns. */
export function RolesMatrix() {
  const roles = [ROLES.owner, ROLES.office, ROLES.crew];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-1.5 font-medium">In the app</th>
            {roles.map((r) => (
              <th key={r.key} className="py-1.5 text-center font-medium">
                {r.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MODULE_ROWS.map((key) => (
            <tr key={key} className="border-b border-border/60">
              <td className="py-1.5">{MODULES[key].label}</td>
              {roles.map((r) => (
                <td key={r.key} className="py-1.5 text-center">
                  <AccessChip value={r.modules[key]} muted />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="pb-1.5 pt-4 text-xs font-medium text-muted-foreground">
              Texting Lu
            </td>
          </tr>
          {(Object.keys(SARAH_CAP_LABELS) as Array<keyof LuCapabilities>).map((cap) => (
            <tr key={cap} className="border-b border-border/60">
              <td className="py-1.5">{SARAH_CAP_LABELS[cap]}</td>
              {roles.map((r) => {
                const v = r.assistant[cap];
                return (
                  <td key={r.key} className="py-1.5 text-center">
                    {typeof v === "boolean" ? <BoolChip value={v} /> : <AccessChip value={v} muted />}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Member view: one editable column — click a cell to cycle; saves instantly (mock). */
export function MemberMatrix({ member, onChanged }: { member: Member; onChanged: () => void }) {
  const eff = effectiveAccess(member);

  const cycleModule = (key: ModuleKey) => {
    const next = ACCESS_CYCLE[(ACCESS_CYCLE.indexOf(eff.modules[key]) + 1) % ACCESS_CYCLE.length];
    membersStore.patch(member.id, { overrides: { ...member.overrides, modules: { ...member.overrides?.modules, [key]: next } } });
    onChanged();
    toast.success(`Saved — ${member.name}: ${MODULES[key].label} → ${next === "none" ? "no access" : next}.`, {
      description: "Lu follows this immediately.",
    });
  };

  const cycleCap = (cap: keyof LuCapabilities) => {
    if (cap === "approveHardGates") return; // code-locked to Owner (12 §8 Q1)
    const current = eff.assistant[cap];
    const next = typeof current === "boolean" ? !current : SCOPE_CYCLE[(SCOPE_CYCLE.indexOf(current) + 1) % SCOPE_CYCLE.length];
    membersStore.patch(member.id, { overrides: { ...member.overrides, assistant: { ...member.overrides?.assistant, [cap]: next } } });
    onChanged();
    toast.success(`Saved — ${SARAH_CAP_LABELS[cap]}: ${String(next)}.`, { description: "Lu follows this immediately." });
  };

  const isOverridden = (kind: "modules" | "assistant", key: string) =>
    member.overrides?.[kind] !== undefined && key in (member.overrides[kind] as object);

  return (
    <div className="text-sm">
      <p className="mb-2 text-xs text-muted-foreground">
        Starts from the {ROLES[member.roleKey].name} preset — click a value to change just this person.
      </p>
      {MODULE_ROWS.map((key) => (
        <div key={key} className="flex items-center justify-between border-b border-border/60 py-1.5">
          <span>
            {MODULES[key].label}
            {isOverridden("modules", key) && <span className="ml-1.5 text-[10px] text-muted-foreground">(custom)</span>}
          </span>
          <button type="button" onClick={() => cycleModule(key)} aria-label={`Change ${MODULES[key].label} access`}>
            <AccessChip value={eff.modules[key]} />
          </button>
        </div>
      ))}
      <p className="pb-1.5 pt-4 text-xs font-medium text-muted-foreground">Texting Lu</p>
      {(Object.keys(SARAH_CAP_LABELS) as Array<keyof LuCapabilities>).map((cap) => {
        const v = eff.assistant[cap];
        const locked = cap === "approveHardGates";
        return (
          <div key={cap} className="flex items-center justify-between border-b border-border/60 py-1.5">
            <span>
              {SARAH_CAP_LABELS[cap]}
              {locked && <span className="ml-1.5 text-[10px] text-muted-foreground">🔒 owner only</span>}
              {!locked && isOverridden("assistant", cap) && <span className="ml-1.5 text-[10px] text-muted-foreground">(custom)</span>}
            </span>
            <button
              type="button"
              disabled={locked}
              onClick={() => cycleCap(cap)}
              aria-label={`Change: ${SARAH_CAP_LABELS[cap]}`}
              className={cn(locked && "cursor-not-allowed")}
            >
              {typeof v === "boolean" ? <BoolChip value={v} /> : <AccessChip value={v} />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
