import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { listAppointments, listLeads } from "@/lib/dashboard";
import {
  APEX_ESCALATIONS,
  APEX_HOME_STATS,
  APEX_SCHEDULE_GLANCE,
  type ScheduleGlanceItem,
} from "./fixtures/apex";

/**
 * Home read model (01-home §4) behind the mock↔real seam (00 §5):
 * demo mode serves the Apex fixtures; real mode reads the org's actual data.
 * Real partners NEVER see fixture data — unbuilt numbers render as `soon` tiles.
 */

export interface OpenEscalation {
  id: string;
  question: string;
  contactName: string;
  contactId?: string;
  createdAt: string;
}

export interface HomeData {
  stats: {
    newLeadsThisWeek: number;
    bookedThisWeek: number;
    /** null = module not live yet → muted `soon` tile */
    quotesAwaiting: number | null;
    quotesAwaitingCents?: number;
    reviewsCollected: number | null;
    reviewsAvg?: number;
  };
  scheduleGlance: { dayLabel: string; items: ScheduleGlanceItem[] };
  escalations: OpenEscalation[];
}

export function getHomeDataMock(): HomeData {
  return {
    stats: APEX_HOME_STATS,
    scheduleGlance: APEX_SCHEDULE_GLANCE,
    escalations: APEX_ESCALATIONS,
  };
}

export async function getHomeDataReal(organizationId: string, timezone: string): Promise<HomeData> {
  const nowIso = new Date().toISOString();
  const weekStart = startOfWeekIso(timezone);

  const [leads, appts, escalations] = await Promise.all([
    listLeads(organizationId),
    listAppointments(organizationId),
    listOpenEscalations(organizationId),
  ]);

  const active = new Set(["proposed", "confirmed"]);
  const upcoming = appts.filter((a) => active.has(a.status) && a.startAt >= nowIso);
  const glanceDay = upcoming[0] ? dayKey(upcoming[0].startAt, timezone) : null;
  const glanceItems: ScheduleGlanceItem[] = upcoming
    .filter((a) => glanceDay && dayKey(a.startAt, timezone) === glanceDay)
    .slice(0, 5)
    .map((a) => ({
      id: a.id,
      startAt: a.startAt,
      name: a.lead?.contactName || a.lead?.contactPhone || "Estimate",
      town: "",
      kind: "estimate" as const,
    }));

  return {
    stats: {
      newLeadsThisWeek: leads.filter((l) => l.createdAt >= weekStart).length,
      bookedThisWeek: appts.filter((a) => a.status === "confirmed" && a.createdAt >= weekStart).length,
      quotesAwaiting: null, // Quotes module not live → soon tile
      reviewsCollected: null, // Reviews module not live → soon tile
    },
    scheduleGlance: {
      dayLabel: glanceDay ? dayLabel(upcoming[0]!.startAt, timezone) : "",
      items: glanceItems,
    },
    escalations,
  };
}

async function listOpenEscalations(organizationId: string): Promise<OpenEscalation[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("Escalation")
    .select("id, question, createdAt, leadId, lead:Lead(id, contactName, contactPhone)")
    .eq("organizationId", organizationId)
    .eq("status", "open")
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Record<string, any>[]).map((e) => {
    const lead = Array.isArray(e.lead) ? e.lead[0] : e.lead;
    return {
      id: e.id,
      question: e.question,
      contactName: lead?.contactName || lead?.contactPhone || "A customer",
      contactId: lead?.id,
      createdAt: e.createdAt,
    };
  });
}

/* ------------------------------ tz-aware helpers ------------------------------ */

function dayKey(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, dateStyle: "short" }).format(new Date(iso));
}

function dayLabel(iso: string, timezone: string): string {
  const today = dayKey(new Date().toISOString(), timezone);
  const tomorrow = dayKey(new Date(Date.now() + 86_400_000).toISOString(), timezone);
  const key = dayKey(iso, timezone);
  if (key === today) return "Today";
  if (key === tomorrow) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "long" }).format(new Date(iso));
}

/** ISO instant of local Monday 00:00 in the org's timezone (approximate, DST-safe enough for counts). */
function startOfWeekIso(timezone: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dayIdx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  const sinceMidnightMs =
    Number(get("hour") === "24" ? "0" : get("hour")) * 3_600_000 + Number(get("minute")) * 60_000;
  return new Date(now.getTime() - (dayIdx < 0 ? 0 : dayIdx) * 86_400_000 - sinceMidnightMs).toISOString();
}
