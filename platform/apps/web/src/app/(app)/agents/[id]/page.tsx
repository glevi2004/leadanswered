import { redirect } from "next/navigation";
import { requireOrganization } from "@/lib/dashboard-auth";
import { SarahPageClient } from "../../sarah/SarahPageClient";
import { getAgentPreset } from "@/lib/workspace/agent-presets";

/**
 * Agent detail dispatch — each hired agent's own surface, reached via the Agents
 * grid. The Receptionist opens the Lu assistant surface; every other agent's
 * bespoke dashboard folds into the Workspace canvas, so unknown ids fall back there.
 */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const preset = getAgentPreset(id);
  return { title: `${preset?.label ?? "Agents"} — Lu Computer` };
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  await requireOrganization();

  if (id === "receptionist") {
    return (
      <div className="flex min-h-[480px] flex-1 flex-col">
        <SarahPageClient />
      </div>
    );
  }

  redirect("/agents");
}
