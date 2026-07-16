import { requireOrganization } from "@/lib/dashboard-auth";
import { agentById } from "@/lib/canvas/graph";
import { PageHeader } from "@/components/app/PageHeader";
import { DepartmentApp } from "@/components/department/DepartmentApp";

/**
 * A department's own app page (canvas.md step 1 — "The department-as-app frame"): the two
 * side-by-side depth-cards (Department + Workplace). v0 provisions Engineering only; every
 * other key renders an honest "not set up yet" inside the same frame.
 */

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const agent = agentById(key);
  return { title: `${agent?.label ?? "Department"} — Lu Computer` };
}

export default async function DepartmentAppPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  await requireOrganization();
  const agent = agentById(key);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={agent ? `${agent.label} Department` : "Department"}
        description="Its home, its backend, and the live preview of what it's building now."
      />
      <DepartmentApp department={key} />
    </div>
  );
}
