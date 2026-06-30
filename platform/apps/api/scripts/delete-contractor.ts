/**
 * Hard-delete a contractor and its Supabase Auth user — for resetting a test account so the
 * full create→invite→onboard flow can be re-run from scratch. This is a DESTRUCTIVE, irreversible
 * wipe (not the churn/offboarding flow — that SOFT-cancels and keeps the user; see SCOPE §11).
 *
 * All Contractor relations are `onDelete: Cascade`, so deleting the one row removes its leads,
 * conversations, messages, appointments, escalations, recipients, subscriptions, and calendar
 * connections automatically. The Auth user is then removed via the GoTrue admin REST API.
 *
 * Dry-run by default (prints the blast radius). Pass --yes to actually delete.
 *   cd apps/api && pnpm exec tsx scripts/delete-contractor.ts --email=owner@x.com         # dry run
 *   cd apps/api && pnpm exec tsx scripts/delete-contractor.ts --email=owner@x.com --yes    # delete
 *   (add --keep-auth to delete the contractor data but keep the Supabase login)
 */
import { config } from "dotenv";
import { expand } from "dotenv-expand";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

expand(config()); // apps/api/.env → DATABASE_URL
const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../web/.env.local") }); // → NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY

import { getPrisma } from "@leadanswered/db";

const EMAIL = (process.argv.find((a) => a.startsWith("--email="))?.split("=")[1] ?? "").toLowerCase();
const execute = process.argv.includes("--yes");
const keepAuth = process.argv.includes("--keep-auth");

async function handleAuthUser(email: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return "skipped — no Supabase service-role env found";
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  const res = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers });
  if (!res.ok) return `lookup failed: ${res.status} ${await res.text()}`;
  const body = (await res.json()) as { users?: Array<{ id: string; email?: string }> };
  const user = (body.users ?? []).find((u) => u.email?.toLowerCase() === email);
  if (!user) return "no Auth user found for that email";
  if (!execute) return `would delete Auth user ${user.id}`;

  const del = await fetch(`${url}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers });
  return del.ok ? `deleted Auth user ${user.id}` : `delete failed: ${del.status} ${await del.text()}`;
}

async function main() {
  if (!EMAIL) {
    console.error("Usage: tsx scripts/delete-contractor.ts --email=owner@x.com [--yes] [--keep-auth]");
    process.exit(1);
  }
  const db = getPrisma();
  const c = await db.contractor.findFirst({ where: { ownerEmail: EMAIL } });

  if (!c) {
    console.log(`No contractor with ownerEmail=${EMAIL}.`);
  } else {
    const [leads, appts, escalations, recipients] = await Promise.all([
      db.lead.count({ where: { contractorId: c.id } }),
      db.appointment.count({ where: { contractorId: c.id } }),
      db.escalation.count({ where: { contractorId: c.id } }),
      db.notificationRecipient.count({ where: { contractorId: c.id } }),
    ]);
    console.log(`Contractor: ${c.companyName} — ${c.id}`);
    console.log(
      `  cascades to: ${leads} lead(s), ${appts} appointment(s), ${escalations} escalation(s), ` +
        `${recipients} recipient(s) (+ their conversations/messages/subscriptions/calendar connections)`,
    );
    if (execute) {
      await db.contractor.delete({ where: { id: c.id } });
      console.log("  ✓ contractor + all cascaded rows deleted");
    } else {
      console.log("  DRY RUN — would delete the contractor (cascades to everything above).");
    }
  }

  if (keepAuth) console.log("Auth user: kept (--keep-auth)");
  else console.log("Auth user:", await handleAuthUser(EMAIL));

  if (!execute) console.log("\nDRY RUN — re-run with --yes to actually delete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit());
