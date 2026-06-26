// Admin provisioning: set (or create) a user's password directly via the
// service-role key — no email, bypassing the auth email rate limit.
// Usage: node --env-file=.env.local scripts/set-password.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;
if (!email || !password) {
  console.error("usage: node --env-file=.env.local scripts/set-password.mjs <email> <password>");
  process.exit(1);
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) throw listErr;
const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (existing) {
  const { error } = await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
  if (error) throw error;
  console.log(`✓ updated password for existing user ${email}`);
} else {
  const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  console.log(`✓ created ${email} (email confirmed) with password`);
}
process.exit(0);
