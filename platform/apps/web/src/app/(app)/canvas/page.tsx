import { requireOrganization } from "@/lib/dashboard-auth";
import { CompanyCanvas, type CanvasDepartment } from "@/components/canvas/CompanyCanvas";

export const metadata = { title: "Canvas — Lead Answered" };

/**
 * API base for the apps/api backend (same env the onboarding/schedule actions read).
 * Localhost default matches apps/api's dev PORT (3000).
 */
const API_BASE = (process.env.API_PUBLIC_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * The org's REAL departments (v0: just Engineering, status `active`) for the canvas.
 * Best-effort: a fetch failure / empty response falls back to `[]` so the canvas still
 * renders (Lu only) instead of crashing. Fresh each request (no-store).
 */
async function loadDepartments(orgId: string): Promise<CanvasDepartment[]> {
  try {
    const res = await fetch(`${API_BASE}/api/departments?orgId=${encodeURIComponent(orgId)}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(`[canvas] departments fetch failed: ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { departments?: CanvasDepartment[] };
    return Array.isArray(data?.departments) ? data.departments : [];
  } catch (e) {
    console.warn("[canvas] departments fetch error:", e);
    return [];
  }
}

/**
 * The company canvas, INSIDE the app shell (2026-07-15). Lu at the center, every
 * REAL department orbiting her, each agent's pages as live previews. Selecting an
 * agent drives Lu's dock. Rendered full-bleed: the wrapper cancels the layout's forced
 * padding (-m-4 -mb-24 / sm:-m-6) and gives the graph a bounded height so its
 * h-full viewport fills the content card.
 */
export default async function CanvasPage() {
  const organization = await requireOrganization();
  const departments = await loadDepartments(organization.id);
  return (
    <div className="relative -m-4 -mb-24 flex h-[calc(100svh-2rem)] flex-col overflow-hidden sm:-m-6">
      <CompanyCanvas orgId={organization.id} departments={departments} />
      {/* recessed-well vignette: the plane paints edge-to-edge and would hide the frame's inset
          shadow, so we lay it on top (below the z-20+ toolbar/pills) to keep the sunken look. */}
      <div className="canvas-recess pointer-events-none absolute inset-0 z-[6]" />
    </div>
  );
}
