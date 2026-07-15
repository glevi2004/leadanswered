import { requireOrganization } from "@/lib/dashboard-auth";
import { PageHeader } from "@/components/app/PageHeader";
import { AGENT_PRESETS, type AgentId } from "@/lib/workspace/agent-presets";
import { AgentsClient } from "./AgentsClient";

export const metadata = { title: "Agents — Lead Answered" };

/**
 * The Agents container (server) — the grid of AI-worker presets you hire.
 * Hired-state: Receptionist is always on the team; the rest are "hired" when
 * their module is flipped live in a New org's profile, and always hired for the
 * Mature/demo org (their detail surfaces run on fixtures). The client grid drives
 * the hire flow + navigation to each agent's detail surface.
 */
export default async function AgentsPage() {
  const organization = await requireOrganization();
  const isNew = organization.demoProfile === "new";
  const installed: Partial<Record<AgentId, string>> = organization.__profile?.modules ?? {};

  const hired = Object.fromEntries(
    AGENT_PRESETS.map((p) => [
      p.id,
      p.id === "receptionist" ? true : isNew ? installed[p.id] === "live" : true,
    ]),
  ) as Record<AgentId, boolean>;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Agents" description="Your AI coworkers — hire one and Lu gets to work." />
      <AgentsClient hired={hired} />
    </div>
  );
}
