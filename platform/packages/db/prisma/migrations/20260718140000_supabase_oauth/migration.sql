-- Supabase OAuth (byo-connect Phase 2): mgmt token expires → refresh; service key fetched
-- on demand after project selection, so it may be absent at connect time. Additive only.

-- AlterTable
ALTER TABLE "SupabaseConnection" ALTER COLUMN "serviceKey" DROP NOT NULL;
ALTER TABLE "SupabaseConnection" ADD COLUMN "refreshToken" TEXT;
ALTER TABLE "SupabaseConnection" ADD COLUMN "expiresAt" TIMESTAMP(3);
