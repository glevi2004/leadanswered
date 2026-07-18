-- Existing-project import + repo profiles (ladder step 2, workflow §8b). Additive only.

-- AlterTable
ALTER TABLE "Site" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'created';
ALTER TABLE "Site" ADD COLUMN "setupCommand" TEXT;
ALTER TABLE "Site" ADD COLUMN "testCommand" TEXT;
