import { requireOrganization } from "@/lib/dashboard-auth";
import { PageHeader } from "@/components/app/PageHeader";
import { AGENT_PRESETS, type AgentId } from "@/lib/workspace/agent-presets";
import { AgentsClient } from "./AgentsClient";

export const metadata = { title: "Agents — Lead Answered" };

/**
 * The Agents container (server) — the grid of AI-worker presets. The client grid drives
 * navigation to each agent's detail surface.
 */
export default async function AgentsPage() {
  await requireOrganization();
  const hired = Object.fromEntries(
    AGENT_PRESETS.map((p) => [p.id, true]),
  ) as Record<AgentId, boolean>;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Agents" description="Your AI coworkers — hire one and Lu gets to work." />
      <AgentsClient hired={hired} />
    </div>
  );
}
