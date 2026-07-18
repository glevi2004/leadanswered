import { getPrisma } from "@leadanswered/db";

/** Read-only: the auth.users row(s) for an email — created/invited/confirmed timestamps. */
const email = process.argv[2] ?? "levigabrielcramos@gmail.com";
const db = getPrisma();
const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
  `SELECT id, email, created_at, invited_at, confirmation_sent_at, email_confirmed_at, last_sign_in_at
   FROM auth.users WHERE email = $1`,
  email,
);
console.log(JSON.stringify(rows, null, 2));
await db.$disconnect();
