import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Workplace } from "@/components/canvas/Workplace";
import { DepartmentPage } from "@/components/dept/DepartmentPage";
import { AGENTS, agentById, type DeptId } from "@/lib/canvas/graph";
// The real page bodies, reused verbatim — the canvas shows the SAME pages the app serves.
import AgentDetailPage from "@/app/(app)/agents/[id]/page";

/**
 * /embed/[node] — the canvas node dispatch. `{dept}-dept` renders that department's
 * DASHBOARD (chrome-less: the bespoke DepartmentPage for built departments, the Lu
 * assistant for Support); `{dept}-work` renders the agent's WORKPLACE. Departments
 * without a built surface yet get an honest-empty stub. The (app) routes stay
 * canonical — this group only strips the chrome so iframes can show the live page.
 */

export const metadata = { title: "Lu Computer" };

const DEPT_IDS = new Set(AGENTS.map((a) => a.id));

export default async function EmbedNodePage({ params }: { params: Promise<{ node: string }> }) {
  const { node } = await params;
  const m = node.match(/^([a-z]+)-(dept|work)$/);
  if (!m || !DEPT_IDS.has(m[1] as DeptId)) notFound();
  const dept = m[1] as DeptId;

  if (m[2] === "work") return <Workplace dept={dept} />;

  switch (dept) {
    // Built departments preview the bespoke Department page (roadmap + tabbed body).
    case "finance":
      return <DepartmentPage dept="finance" />;
    case "sales":
      return <DepartmentPage dept="sales" />;
    case "operations":
      return <DepartmentPage dept="operations" />;
    case "marketing":
      return <DepartmentPage dept="marketing" />;
    case "support":
      return <AgentDetailPage params={Promise.resolve({ id: "receptionist" })} searchParams={Promise.resolve({})} />;
    default: {
      // legal / engineering / design — no built surface yet: honest-empty dashboard
      const a = agentById(dept)!;
      return (
        <div className="flex flex-col gap-4">
          <PageHeader title={a.label} description={a.blurb} />
          <EmptyState title={`${a.label} is quiet`} body={`${a.agentName} hasn't produced anything yet — this dashboard fills in the moment work starts.`} />
        </div>
      );
    }
  }
}
