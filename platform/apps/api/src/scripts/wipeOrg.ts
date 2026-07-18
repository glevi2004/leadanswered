import { getPrisma } from "@leadanswered/db";

/**
 * DESTRUCTIVE ops script: fully delete an owner's org — every org-scoped row, the
 * Organization itself, the Supabase auth user, and any Waitlist row — so the owner
 * can be re-invited and onboard from scratch. Usage:
 *   tsx src/scripts/wipeOrg.ts <ownerEmail> --yes
 */
const email = process.argv[2];
const confirmed = process.argv.includes("--yes");
if (!email || !confirmed) {
  console.error("usage: tsx src/scripts/wipeOrg.ts <ownerEmail> --yes");
  process.exit(1);
}

const db = getPrisma();
const orgs = await db.organization.findMany({ where: { ownerEmail: email } });
if (orgs.length === 0) console.log(`no orgs for ${email}`);

for (const org of orgs) {
  const orgId = org.id;
  console.log(`wiping org ${orgId} (${org.companyName})…`);
  const del: Record<string, number> = {};
  del.edges = (await db.edge.deleteMany({ where: { orgId } })).count;
  del.collections = (await db.collection.deleteMany({ where: { orgId } })).count;
  del.canvasNodes = (await db.canvasNode.deleteMany({ where: { orgId } })).count;
  del.messages = (await db.message.deleteMany({ where: { orgId } })).count;
  del.threads = (await db.thread.deleteMany({ where: { orgId } })).count;
  del.agentEvents = (await db.agentEvent.deleteMany({ where: { orgId } })).count;
  del.memory = (await db.memory.deleteMany({ where: { orgId } })).count;
  del.approvals = (await db.approval.deleteMany({ where: { orgId } })).count;
  del.artifacts = (await db.artifact.deleteMany({ where: { orgId } })).count;
  del.sessions = (await db.session.deleteMany({ where: { orgId } })).count;
  del.deployments = (await db.deployment.deleteMany({ where: { site: { orgId } } })).count;
  del.sites = (await db.site.deleteMany({ where: { orgId } })).count;
  del.tasks = (await db.task.deleteMany({ where: { orgId } })).count;
  del.contractRevisions = (await db.contractRevision.deleteMany({ where: { agent: { orgId } } })).count;
  del.agents = (await db.agent.deleteMany({ where: { orgId } })).count;
  del.departments = (await db.department.deleteMany({ where: { orgId } })).count;
  del.usageEvents = (await db.usageEvent.deleteMany({ where: { orgId } })).count;
  del.subscriptions = (await db.subscription.deleteMany({ where: { orgId } })).count;
  del.github = (await db.githubConnection.deleteMany({ where: { orgId } })).count;
  del.vercel = (await db.vercelConnection.deleteMany({ where: { orgId } })).count;
  del.supabase = (await db.supabaseConnection.deleteMany({ where: { orgId } })).count;
  await db.organization.delete({ where: { id: orgId } });
  del.organization = 1;
  console.log("deleted:", del);
}

const wl = await db.waitlist.deleteMany({ where: { email } });
console.log(`waitlist rows deleted: ${wl.count}`);

// The Supabase AUTH user (auth schema — outside Prisma's models; FK cascades clean up
// identities/sessions). Deleting it lets the owner be invited fresh.
const authDeleted = await db.$executeRawUnsafe(`DELETE FROM auth.users WHERE email = $1`, email);
console.log(`auth.users rows deleted: ${authDeleted}`);

await db.$disconnect();
console.log("done — the owner can be re-invited from /admin and onboards from scratch.");
