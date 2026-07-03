import { runProactiveTurn, type ProactiveDeps } from "../proactiveTurn.js";

export type NudgeDeps = ProactiveDeps;

/**
 * Quiet-lead follow-up (SCOPE §5). Delegates to the proactive-turn engine, which gates
 * (terminal status / lead already replied / open escalation / already nudged this interaction)
 * and sends a CONTEXT-AWARE message — or stays silent — instead of a static estimate line.
 * At most one nudge per interaction.
 */
export async function runNudgeJob(deps: NudgeDeps, leadId: string): Promise<"nudged" | "skipped"> {
  const r = await runProactiveTurn(deps, leadId, "quiet_followup");
  return r === "sent" ? "nudged" : "skipped";
}
