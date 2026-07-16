import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { AGENTS, agentById, type DeptId } from "@/lib/canvas/graph";
import { EngineerWorkplace } from "../_components/EngineerWorkplace";
// The real page bodies, reused verbatim — the canvas shows the SAME pages the app serves.
import AgentDetailPage from "@/app/(app)/agents/[id]/page";

/**
 * /embed/[node] — the canvas node dispatch. `{dept}-dept` renders that department's
 * DASHBOARD (chrome-less); `{dept}-work` renders the agent's WORKPLACE.
 *
 * v0 reality (cockpit.md Part D): only the **Engineering** agent is provisioned, so it's
 * the only surface with real data. `engineering-work` shows the Engineer's REAL live work
 * (dock tasks + scratchpad) and its deployed sites; every other department surface is
 * honest-empty — no fixtures, no invented data. The (app) routes stay canonical; this
 * group only strips the chrome so iframes can show the live page.
 */

export const metadata = { title: "Lu Computer" };

const DEPT_IDS = new Set(AGENTS.map((a) => a.id));

/** Honest "not provisioned yet" stub — v0 only stands up the Engineering agent, so every
 *  other department renders empty rather than the old fixture dashboards. */
function NotSetUp({ dept }: { dept: DeptId }) {
  const a = agentById(dept)!;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={a.label} description={a.blurb} />
      <EmptyState
        title={`${a.label} isn't set up yet`}
        body={`v0 provisions the Engineering agent first. ${a.agentName} activates once you set up ${a.label} — there's nothing real to show here until then.`}
      />
    </div>
  );
}

export default async function EmbedNodePage({ params }: { params: Promise<{ node: string }> }) {
  const { node } = await params;
  const m = node.match(/^([a-z]+)-(dept|work)$/);
  if (!m || !DEPT_IDS.has(m[1] as DeptId)) notFound();
  const dept = m[1] as DeptId;

  // WORKPLACE — the agent's live work-in-progress view. Only Engineering is provisioned in
  // v0, so it shows REAL dock data; every other workplace is honest-empty.
  if (m[2] === "work") {
    return dept === "engineering" ? <EngineerWorkplace /> : <NotSetUp dept={dept} />;
  }

  // DEPARTMENT dashboard.
  switch (dept) {
    // Support = the Lu assistant surface (the receptionist agent detail), served verbatim.
    case "support":
      return <AgentDetailPage params={Promise.resolve({ id: "receptionist" })} searchParams={Promise.resolve({})} />;
    // Engineering IS provisioned, but its collapsing dept DASHBOARD isn't a built surface
    // yet — its live work lives on the -work embed, so this stays honest-empty (not "unset").
    case "engineering": {
      const a = agentById("engineering")!;
      return (
        <div className="flex flex-col gap-4">
          <PageHeader title={a.label} description={a.blurb} />
          <EmptyState title={`${a.label} is quiet`} body={`${a.agentName}'s live work shows on its workplace — this dashboard fills in as it ships.`} />
        </div>
      );
    }
    // finance / sales / operations / marketing / legal / design — not provisioned in v0:
    // honest-empty rather than the old fixture DepartmentPage dashboards.
    default:
      return <NotSetUp dept={dept} />;
  }
}
