import { makePatchStore } from "../patchStore";
import type { Member, ModuleAccess, Role, RoleKey, LuCapabilities } from "./types";
import type { ModuleKey } from "../shared";

/**
 * Team mock provider (12 §4/§5). Roles are the three trades-simple presets;
 * the matrix is Lu's briefing — the engine consults it per inbound text.
 */

const MODULE_KEYS: ModuleKey[] = ["crm", "schedule", "quotes", "invoices", "followups", "website", "content", "reviews", "analytics", "team"];

const allModules = (access: ModuleAccess): Record<ModuleKey, ModuleAccess> =>
  Object.fromEntries(MODULE_KEYS.map((k) => [k, access])) as Record<ModuleKey, ModuleAccess>;

export const ROLES: Record<RoleKey, Role> = {
  owner: {
    key: "owner",
    name: "Owner",
    blurb: "Everything, including approvals and this page.",
    modules: allModules("act"),
    sarah: {
      askSchedule: "all",
      moveJobs: "all",
      askCrm: "all",
      requestQuotes: true,
      sendInvoices: true,
      changePricing: true,
      approveHardGates: true,
    },
  },
  office: {
    key: "office",
    name: "Office",
    blurb: "Runs the desk: CRM, invoices, schedule.",
    modules: {
      ...allModules("view"),
      crm: "act",
      schedule: "act",
      quotes: "act",
      invoices: "act",
      followups: "act",
      team: "none",
    },
    sarah: {
      askSchedule: "all",
      moveJobs: "all",
      askCrm: "all",
      requestQuotes: true,
      sendInvoices: true,
      changePricing: false,
      approveHardGates: false,
    },
  },
  crew: {
    key: "crew",
    name: "Crew",
    blurb: "Their own jobs: schedule, route, job notes.",
    modules: { ...allModules("none"), schedule: "view" },
    sarah: {
      askSchedule: "own",
      moveJobs: "own",
      askCrm: "own",
      requestQuotes: false,
      sendInvoices: false,
      changePricing: false,
      approveHardGates: false,
    },
  },
};

export const SARAH_CAP_LABELS: Record<keyof LuCapabilities, string> = {
  askSchedule: "Ask about the schedule",
  moveJobs: "Move or cancel jobs",
  askCrm: "Look up customers",
  requestQuotes: "Ask Lu to draft quotes",
  sendInvoices: "Send & track invoices",
  changePricing: "Change pricing",
  approveHardGates: "Approve sends to customers",
};

export const membersStore = makePatchStore<Member>();

const ago = (mins: number) => new Date(Date.now() - mins * 60_000).toISOString();

const APEX_MEMBERS: Member[] = [
  {
    id: "mem_marcus",
    name: "Marcus Reed",
    phone: "(617) 555-0100",
    email: "marcus@apexroofingma.com",
    roleKey: "owner",
    smsStatus: "active",
    appAccess: "active",
    notifications: [
      { eventType: "booking_confirmed", channels: "both" },
      { eventType: "new_qualified_lead", channels: "both" },
    ],
    lastActiveAt: ago(2),
    createdAt: ago(60 * 24 * 90),
  },
  {
    id: "mem_kayla",
    name: "Kayla",
    phone: "(617) 555-0134",
    email: "kayla@apexroofingma.com",
    roleKey: "office",
    smsStatus: "active",
    appAccess: "active",
    notifications: [
      { eventType: "booking_confirmed", channels: "both" },
      { eventType: "new_qualified_lead", channels: "both" },
    ],
    lastActiveAt: ago(120),
    createdAt: ago(60 * 24 * 60),
  },
  {
    id: "mem_danny",
    name: "Danny",
    phone: "(617) 555-0177",
    roleKey: "crew", // no email — texts only, zero app onboarding
    smsStatus: "active",
    appAccess: "none",
    notifications: [],
    lastActiveAt: ago(45), // asked Lu for his Thursday route
    createdAt: ago(60 * 24 * 30),
  },
];

export function listMembersMock(): Member[] {
  return membersStore.withCreated(APEX_MEMBERS).map((m) => membersStore.apply(m));
}

let memberSeq = 0;

export function addMemberMock(input: { name: string; phone: string; roleKey: RoleKey; email?: string }): Member {
  const member: Member = {
    id: `mem_local_${++memberSeq}`,
    name: input.name,
    phone: input.phone,
    email: input.email || undefined,
    roleKey: input.roleKey,
    smsStatus: "pending_hello", // Lu's hello is on its way
    appAccess: input.email ? "invited" : "none",
    notifications: [],
    createdAt: new Date().toISOString(),
  };
  membersStore.add(member);
  return member;
}

/** Effective access = role preset + per-member overrides. */
export function effectiveAccess(member: Member): { modules: Record<ModuleKey, ModuleAccess>; sarah: LuCapabilities } {
  const role = ROLES[member.roleKey];
  return {
    modules: { ...role.modules, ...member.overrides?.modules },
    sarah: { ...role.sarah, ...member.overrides?.sarah },
  };
}
