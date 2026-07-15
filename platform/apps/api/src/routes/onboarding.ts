import type { Request, Response } from "express";
import type { Store } from "../store/types.js";
import { provisionDepartments } from "../onboarding/provision.js";

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
