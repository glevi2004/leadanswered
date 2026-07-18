import type { Request, Response } from "express";
import type { Store } from "../store/types.js";
import { provisionDepartments, seedOnboardingContext } from "../onboarding/provision.js";

/** Routes here only need the Store; app.ts passes the full deps object (structurally compatible). */
export interface DepartmentRouteDeps {
  store: Store;
}

/**
 * POST /api/onboarding/provision  body { orgId: string, business?: string }
 * Boots up the org's 8 departments (Engineering active + agent, 7 in_development).
 * Idempotent — safe to call more than once. → { departments, engineeringAgent }.
 */
export function createProvisionRoute(deps: DepartmentRouteDeps) {
  return async function postProvision(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    const business = b.business;

    if (!orgId || typeof orgId !== "string") {
      res.status(400).json({ error: "orgId is required" });
      return;
    }

    try {
      const result = await provisionDepartments(deps.store, orgId, {
        business: business ? String(business) : undefined,
      });
      res.status(200).json({
        departments: result.departments,
        engineeringAgent: result.engineeringAgent,
      });
    } catch (err) {
      console.error("[/api/onboarding/provision] error:", err);
      res.status(500).json({ error: "failed to provision departments" });
    }
  };
}

/**
 * POST /api/onboarding/context  body { orgId, companyName?, ownerName?, role?, ideaStage? }
 * Phase-1 sign-up finisher (docs/product.md �5): seed Lu's memory from the sign-up answers
 * WITHOUT activating any department — the in-workspace Lu onboarding (Phase 2) does that on
 * "Accept & activate departments". → { ok: true }.
 */
export function createSeedContextRoute(deps: DepartmentRouteDeps) {
  return async function postSeedContext(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const orgId = b.orgId ?? b.org_id;
    if (!orgId || typeof orgId !== "string") {
      res.status(400).json({ error: "orgId is required" });
      return;
    }
    const str = (v: unknown) => (typeof v === "string" ? v : undefined);
    try {
      await seedOnboardingContext(deps.store, orgId, {
        companyName: str(b.companyName),
        ownerName: str(b.ownerName),
        role: str(b.role),
        ideaStage: str(b.ideaStage),
      });
      res.status(200).json({ ok: true });
    } catch (err) {
      console.error("[/api/onboarding/context] error:", err);
      res.status(500).json({ error: "failed to seed onboarding context" });
    }
  };
}

/**
 * GET /api/onboarding/status?orgId=...
 * Whether the org is still in the in-workspace onboarding (docs/product.md �5 Phase 2) — true
 * until its departments have been activated. Derived: `active` = NO department is `active` yet.
 * → { active: boolean }.
 */
export function createOnboardingStatusRoute(deps: DepartmentRouteDeps) {
  return async function getOnboardingStatus(req: Request, res: Response): Promise<void> {
    const orgId = req.query.orgId;
    if (!orgId || typeof orgId !== "string") {
      res.status(400).json({ error: "orgId query param is required" });
      return;
    }
    try {
      const departments = await deps.store.listDepartments(orgId);
      const active = !departments.some((d) => d.status === "active");
      res.status(200).json({ active });
    } catch (err) {
      console.error("[/api/onboarding/status] error:", err);
      res.status(500).json({ error: "failed to read onboarding status" });
    }
  };
}

/**
 * GET /api/departments?orgId=...
 * The org's departments, each joined with its agent (if any) — the canvas read.
 * → { departments }.
 */
export function createListDepartmentsRoute(deps: DepartmentRouteDeps) {
  return async function getDepartments(req: Request, res: Response): Promise<void> {
    const orgId = req.query.orgId;

    if (!orgId || typeof orgId !== "string") {
      res.status(400).json({ error: "orgId query param is required" });
      return;
    }

    try {
      const departments = await deps.store.listDepartments(orgId);
      res.status(200).json({ departments });
    } catch (err) {
      console.error("[/api/departments] error:", err);
      res.status(500).json({ error: "failed to list departments" });
    }
  };
}
