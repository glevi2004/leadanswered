import { describe, it, expect, beforeEach, vi } from "vitest";
import { statusChip, formatWhen, formatTime } from "./dashboard-ui";

// Mock the service-role client so getLeadDetail's query is observable + controllable.
const h = vi.hoisted(() => {
  const state = { eqCalls: [] as [string, unknown][], resultData: null as unknown };
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      state.eqCalls.push([col, val]);
      return builder;
    },
    order: () => builder,
    maybeSingle: async () => ({ data: state.resultData, error: null }),
  };
  return { state, client: { from: () => builder } };
});
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdmin: () => h.client }));

import { getLeadDetail } from "./dashboard";

describe("statusChip", () => {
  it("maps known statuses to their family chip", () => {
    expect(statusChip("booked").label).toBe("Booked");
    expect(statusChip("booked").chip).toContain("emerald");
    expect(statusChip("disqualified").chip).toContain("red");
    expect(statusChip("overdue").chip).toContain("red");
    expect(statusChip("accepted").chip).toContain("emerald");
    expect(statusChip("sent").chip).toContain("blue");
  });
  it("falls back to gray for unknown statuses", () => {
    expect(statusChip("mystery")).toEqual({ label: "mystery", chip: "bg-muted text-muted-foreground" });
  });
});

describe("formatWhen / formatTime", () => {
  it("handles null + invalid input", () => {
    expect(formatWhen(null)).toBe("—");
    expect(formatWhen("not-a-date")).toBe("—");
    expect(formatTime("not-a-date")).toBe("");
  });
  it("formats in the organization's timezone", () => {
    const out = formatWhen("2026-07-01T18:00:00Z", "America/New_York"); // 2:00 PM ET
    expect(out).toMatch(/Jul 1/);
    expect(out).toMatch(/2:00/);
  });
});

describe("getLeadDetail — tenant isolation", () => {
  beforeEach(() => {
    h.state.eqCalls = [];
    h.state.resultData = null;
  });

  it("always pins the query to BOTH the lead id and the caller's organizationId", async () => {
    await getLeadDetail("organization-1", "lead-9");
    expect(h.state.eqCalls).toContainEqual(["id", "lead-9"]);
    expect(h.state.eqCalls).toContainEqual(["organizationId", "organization-1"]); // the guard
  });

  it("returns null when no row matches (another tenant's lead id)", async () => {
    h.state.resultData = null;
    expect(await getLeadDetail("organization-1", "someone-elses-lead")).toBeNull();
  });

  it("normalizes a to-one conversation array and sorts messages by time", async () => {
    h.state.resultData = {
      id: "lead-1",
      organizationId: "organization-1",
      contactName: "Maria",
      status: "qualifying",
      conversation: [
        {
          state: "agent",
          messages: [
            { id: "m2", direction: "outbound", body: "Hi", createdAt: "2026-01-01T10:01:00Z" },
            { id: "m1", direction: "inbound", body: "Hello", createdAt: "2026-01-01T10:00:00Z" },
          ],
        },
      ],
      appointments: [],
      escalations: [],
    };
    const res = await getLeadDetail("organization-1", "lead-1");
    expect(res?.conversation?.messages.map((m) => m.id)).toEqual(["m1", "m2"]);
  });
});
