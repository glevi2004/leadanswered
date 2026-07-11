/**
 * Cutover step (SCOPE / DEPLOY runbook): wipe all LEAD-SCOPED data so the new
 * Appointment integrity constraints can be applied to clean tables. Organization config,
 * recipients, and calendar connections are PRESERVED.
 *
 * Dry-run by default (prints counts). Pass --yes to actually delete.
 *   cd apps/api && pnpm exec tsx scripts/wipe-lead-data.ts          # dry run
 *   cd apps/api && pnpm exec tsx scripts/wipe-lead-data.ts --yes    # delete
 *
 * Run this BEFORE `prisma migrate deploy` of the appointment_integrity migration.
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
expand(config()); // load apps/api/.env (DATABASE_URL)

import { getPrisma } from "@leadanswered/db";

async function main() {
  const db = getPrisma();
  const execute = process.argv.includes("--yes");

  const counts = {
    appointments: await db.appointment.count(),
    escalations: await db.escalation.count(),
    messages: await db.message.count(),
    conversations: await db.conversation.count(),
    leads: await db.lead.count(),
  };
  const organizations = await db.organization.count();
  console.log("Lead-scoped rows:", counts);
  console.log(`Preserved: ${organizations} organization(s) + recipients + config + calendar connections.`);

  if (!execute) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --yes to wipe.");
    return;
  }

  // Child → parent order (FK-safe even without relying on cascade).
  await db.appointment.deleteMany();
  await db.escalation.deleteMany();
  await db.message.deleteMany();
  await db.conversation.deleteMany();
  await db.lead.deleteMany();

  console.log("\n✓ Wiped all lead-scoped data. Now run: pnpm --filter @leadanswered/db migrate:deploy");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
