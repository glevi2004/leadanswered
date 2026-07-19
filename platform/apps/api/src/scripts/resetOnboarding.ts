import { getPrisma } from "@leadanswered/db";

/**
 * Ops script: reset an org back to JUST-AFTER-SIGN-UP so the owner can redo the Lu
 * onboarding (the interview) — WITHOUT touching the auth user, the Organization row,
 * sign-up state (`onboardingComplete` stays true), the seeded sign-up memory
 * (source "onboarding"), subscriptions, usage metering, or provider connections.
 * Deletes: threads+messages (so the kickoff refires on next load), artifacts, approvals,
 * agent events, non-seed memory (consolidation summaries), and — if the org had
 * activated — tasks/sites/agents/departments/canvas so activation can rerun clean.
 * Usage:  tsx src/scripts/resetOnboarding.ts <ownerEmail> [--yes]   (dry-run without --yes)
 */
const email = process.argv[2];
const confirmed = process.argv.includes("--yes");
if (!email) {
  console.error("usage: tsx src/scripts/resetOnboarding.ts <ownerEmail> [--yes]");
  process.exit(1);
}

const db = getPrisma();
const orgs = await db.organization.findMany({ where: { ownerEmail: email } });
if (orgs.length === 0) console.log(`no orgs for ${email}`);

for (const org of orgs) {
  const orgId = org.id;
  console.log(`\norg ${orgId} — "${org.companyName}" (onboardingComplete=${org.onboardingComplete})`);

  const artifacts = await db.artifact.findMany({ where: { orgId }, select: { id: true, kind: true, title: true, payload: true } });
  for (const a of artifacts)
    console.log(`  artifact: [${a.kind}] ${a.title} (type=${(a.payload as { type?: string } | null)?.type ?? "-"})`);
  const memories = await db.memory.findMany({ where: { orgId }, select: { key: true, source: true, content: true } });
  for (const m of memories)
    console.log(`  memory: key=${m.key} source=${m.source} → ${m.content.slice(0, 90)}`);
  const approvals = await db.approval.findMany({ where: { orgId }, select: { action: true, status: true } });
  for (const a of approvals) console.log(`  approval: ${a.action} (${a.status})`);
  const counts = {
    messages: await db.message.count({ where: { orgId } }),
    threads: await db.thread.count({ where: { orgId } }),
    events: await db.agentEvent.count({ where: { orgId } }),
    tasks: await db.task.count({ where: { orgId } }),
    sites: await db.site.count({ where: { orgId } }),
    agents: await db.agent.count({ where: { orgId } }),
    departments: await db.department.count({ where: { orgId } }),
    canvasNodes: await db.canvasNode.count({ where: { orgId } }),
  };
  console.log("  counts:", counts);

  if (!confirmed) {
    console.log("  DRY RUN — rerun with --yes to reset.");
    continue;
  }

  const del: Record<string, number> = {};
  del.messages = (await db.message.deleteMany({ where: { orgId } })).count;
  del.threads = (await db.thread.deleteMany({ where: { orgId } })).count;
  del.artifacts = (await db.artifact.deleteMany({ where: { orgId } })).count;
  del.approvals = (await db.approval.deleteMany({ where: { orgId } })).count;
  del.events = (await db.agentEvent.deleteMany({ where: { orgId } })).count;
  del.memoryNonSeed = (await db.memory.deleteMany({ where: { orgId, NOT: { source: "onboarding" } } })).count;
  del.edges = (await db.edge.deleteMany({ where: { orgId } })).count;
  del.collections = (await db.collection.deleteMany({ where: { orgId } })).count;
  del.canvasNodes = (await db.canvasNode.deleteMany({ where: { orgId } })).count;
  del.deployments = (await db.deployment.deleteMany({ where: { site: { orgId } } })).count;
  del.sites = (await db.site.deleteMany({ where: { orgId } })).count;
  del.tasks = (await db.task.deleteMany({ where: { orgId } })).count;
  del.contractRevisions = (await db.contractRevision.deleteMany({ where: { agent: { orgId } } })).count;
  del.agents = (await db.agent.deleteMany({ where: { orgId } })).count;
  del.departments = (await db.department.deleteMany({ where: { orgId } })).count;
  console.log("  deleted:", del);
}

await db.$disconnect();
if (confirmed) console.log("\ndone — next canvas load fires the kickoff and Lu opens the interview fresh.");
