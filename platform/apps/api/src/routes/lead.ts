import type { Request, Response } from "express";
import { createLeadAndGreet, type LeadDeps } from "../leadService.js";
import { TEST_CONTRACTOR_ID } from "../seed.js";

/** POST /lead — manual lead trigger (SCOPE §6 Phase 1, §9 stand-in). */
export function createLeadRoute(deps: LeadDeps) {
  return async function postLead(req: Request, res: Response): Promise<void> {
    const b = req.body ?? {};
    const name = b.name;
    const phone = b.phone;
    const contractorId = b.contractor_id ?? b.contractorId ?? TEST_CONTRACTOR_ID;
    const project = b.project ?? b.projectHint;

    if (!name || !phone) {
      res.status(400).json({ error: "name and phone are required" });
      return;
    }

    try {
      const result = await createLeadAndGreet(deps, {
        contractorId: String(contractorId),
        contactName: String(name),
        contactPhone: String(phone),
        projectHint: project ? String(project) : null,
      });
      res.status(201).json({ ok: true, leadId: result.leadId, opening: result.opening });
    } catch (err) {
      console.error("[/lead] error:", err);
      res.status(500).json({ error: "failed to create lead" });
    }
  };
}
