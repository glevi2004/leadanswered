import "../env.js"; // loads .env + expands ${DB_PASSWORD} before getPrisma reads it
import { getPrisma } from "@leadanswered/db";
import { testContractor, testRecipients } from "../seed.js";

/**
 * Seed the Phase 1 test contractor + notification recipients into Postgres.
 * Run with DATABASE_URL set and after `prisma migrate`:
 *   pnpm --filter @leadanswered/api seed
 */
async function main(): Promise<void> {
  const db = getPrisma();
  const c = testContractor;

  await db.contractor.upsert({
    where: { id: c.id },
    update: { slug: c.slug ?? null }, // backfill the routing slug on an existing test contractor
    create: {
      id: c.id,
      name: c.name,
      companyName: c.companyName,
      slug: c.slug ?? null,
      sarahName: c.sarahName,
      sarahPersonaNotes: c.personaNotes ?? null,
      projectTypes: c.projectTypes,
      qualificationRules: c.qualificationRules as object,
      standingAvailability: c.standingAvailability as object,
      baseLocations: c.serviceArea.baseLocations as object,
      includeOverrides: c.serviceArea.includeOverrides,
      excludeOverrides: c.serviceArea.excludeOverrides,
      twilioNumber: c.twilioNumber ?? null,
    },
  });

  for (const r of testRecipients) {
    await db.notificationRecipient.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        contractorId: c.id,
        name: r.name,
        phone: r.phone,
        email: r.email,
        subscriptions: {
          create: r.subscriptions.map((s) => ({
            eventType: s.eventType,
            channels: s.channels,
          })),
        },
      },
    });
  }

  console.log(`Seeded contractor '${c.companyName}' (${c.id}) + ${testRecipients.length} recipient(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
