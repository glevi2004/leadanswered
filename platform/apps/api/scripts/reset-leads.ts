/**
 * Reset a contractor's LEADS for re-testing — deletes all its leads (cascading to conversations,
 * messages, appointments, escalations) while KEEPING the contractor + its config. Dry-run by default.
 *   cd apps/api && pnpm exec tsx scripts/reset-leads.ts --email=owner@x.com        # dry run
 *   cd apps/api && pnpm exec tsx scripts/reset-leads.ts --email=owner@x.com --yes   # delete
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config());
import { getPrisma } from "@leadanswered/db";

const EMAIL = (process.argv.find((a) => a.startsWith("--email="))?.split("=")[1] ?? "").toLowerCase();
const SLUG = process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1];
const execute = process.argv.includes("--yes");

async function main() {
  if (!EMAIL && !SLUG) {
    console.error("Usage: tsx scripts/reset-leads.ts (--email=owner@x.com | --slug=apex) [--yes]");
    process.exit(1);
  }
  const db = getPrisma();
  const c = await db.contractor.findFirst({ where: EMAIL ? { ownerEmail: EMAIL } : { slug: SLUG } });
  if (!c) {
    console.log(`No contractor found for ${EMAIL || SLUG}.`);
    return;
  }
  const [leads, appts, escalations] = await Promise.all([
    db.lead.count({ where: { contractorId: c.id } }),
    db.appointment.count({ where: { contractorId: c.id } }),
    db.escalation.count({ where: { contractorId: c.id } }),
  ]);
  console.log(`Contractor: ${c.companyName} (${c.slug}) — config is KEPT`);
  console.log(`  wiping: ${leads} lead(s), ${appts} appointment(s), ${escalations} escalation(s) (+ their conversations & messages)`);
  if (!execute) {
    console.log("\nDRY RUN — re-run with --yes to wipe.");
    return;
  }
  await db.lead.deleteMany({ where: { contractorId: c.id } }); // cascades to conversation/message/appointment/escalation
  console.log("  ✓ leads + all cascaded rows deleted. Re-trigger via the lead email to start fresh.");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => process.exit());
