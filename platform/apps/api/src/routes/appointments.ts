import type { Request, Response } from "express";
import { applyOwnerChange, type AppointmentChangeDeps } from "../appointmentChange.js";
import { verifyState } from "../calendar/google/state.js";

/**
 * POST /appointments/change — the DASHBOARD trigger of the unified appointment-change action
 * (GOOGLE_CALENDAR.md §2). Authenticated by a signed `cid` handoff minted by the web (shared
 * CALENDAR_STATE_SECRET); the organization must own the appointment. Runs the same handler as a Google-
 * side change, so it mirrors to Google (pushToGoogle) and asks the organization before texting the lead.
 */
export function createAppointmentChangeRoute(deps: AppointmentChangeDeps) {
  return async (req: Request, res: Response): Promise<void> => {
    const auth = verifyState<{ organizationId: string }>(String(req.body?.cid ?? ""));
    if (!auth?.organizationId) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
    const appt = await deps.store.getAppointmentById(String(req.body?.appointmentId ?? ""));
    if (!appt || appt.organizationId !== auth.organizationId) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }
    const action = String(req.body?.action ?? "");
    const change =
      action === "cancel"
        ? ({ type: "cancel", reason: req.body?.reason } as const)
        : ({ type: "reschedule", newStartIso: String(req.body?.newStartIso ?? "") } as const);
    if (change.type === "reschedule" && !change.newStartIso) {
      res.status(400).json({ ok: false, error: "newStartIso required" });
      return;
    }
    const result = await applyOwnerChange(deps, appt.id, change, { source: "dashboard", pushToGoogle: true });
    res.status(result.ok ? 200 : 400).json(result);
  };
}
