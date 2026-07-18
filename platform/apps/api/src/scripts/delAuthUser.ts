import { getPrisma } from "@leadanswered/db";

/** Ops: delete ONLY the Supabase auth user for an email (org rows untouched). */
const email = process.argv[2];
if (!email) {
  console.error("usage: tsx src/scripts/delAuthUser.ts <email>");
  process.exit(1);
}
const db = getPrisma();
const n = await db.$executeRawUnsafe(`DELETE FROM auth.users WHERE email = $1`, email);
console.log(`auth.users deleted for ${email}:`, n);
await db.$disconnect();
