import { getPrisma } from "@leadanswered/db";

/** Read-only prod inspection: the orgs for an owner email + their row counts. */
const email = process.argv[2] ?? "levigabrielcramos@gmail.com";
const db = getPrisma();

const orgs = await db.organization.findMany({ where: { ownerEmail: email } });
console.log(`orgs for ${email}:`, orgs.map((o) => ({ id: o.id, companyName: o.companyName, onboardingComplete: o.onboardingComplete })));
const all = await db.organization.findMany({ select: { id: true, companyName: true, ownerEmail: true } });
console.log("ALL orgs:", all);

for (const o of orgs) {
  const orgId = o.id;
  const counts: Record<string, number> = {};
  counts.departments = await db.department.count({ where: { orgId } });
  counts.agents = await db.agent.count({ where: { orgId } });
  counts.tasks = await db.task.count({ where: { orgId } });
  counts.artifacts = await db.artifact.count({ where: { orgId } });
  counts.approvals = await db.approval.count({ where: { orgId } });
  counts.threads = await db.thread.count({ where: { orgId } });
  counts.messages = await db.message.count({ where: { orgId } });
  counts.events = await db.agentEvent.count({ where: { orgId } });
  counts.memory = await db.memory.count({ where: { orgId } });
  counts.sites = await db.site.count({ where: { orgId } });
  counts.sessions = await db.session.count({ where: { orgId } });
  counts.canvasNodes = await db.canvasNode.count({ where: { orgId } });
  counts.edges = await db.edge.count({ where: { orgId } });
  counts.collections = await db.collection.count({ where: { orgId } });
  counts.usageEvents = await db.usageEvent.count({ where: { orgId } });
  counts.subscriptions = await db.subscription.count({ where: { orgId } });
  counts.github = await db.githubConnection.count({ where: { orgId } });
  counts.vercel = await db.vercelConnection.count({ where: { orgId } });
  counts.supabase = await db.supabaseConnection.count({ where: { orgId } });
  console.log(`counts for ${orgId} (${o.companyName}):`, counts);
}
await db.$disconnect();
