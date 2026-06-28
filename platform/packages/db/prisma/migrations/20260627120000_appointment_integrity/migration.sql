-- Appointment integrity + calendar-grade foundation.
-- Makes double-booking IMPOSSIBLE at the DB level and reshapes appointments into
-- time intervals (calendar-ready). See packages/db/prisma/schema.prisma NOTE.
-- Apply order assumes lead data is wiped first (Phase 6); the dedupe + nullable-then-
-- NOT NULL steps make it safe on non-empty tables too.

-- 1) Calendar-grade + sync columns (nullable first for a safe backfill).
ALTER TABLE "Appointment" ADD COLUMN "startAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "endAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'UTC';
ALTER TABLE "Appointment" ADD COLUMN "externalProvider" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "externalCalendarId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "externalEventId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "syncedAt" TIMESTAMP(3);

CREATE TYPE "AppointmentSyncState" AS ENUM ('local_only', 'pending_push', 'synced', 'push_failed');
ALTER TABLE "Appointment" ADD COLUMN "syncState" "AppointmentSyncState" NOT NULL DEFAULT 'local_only';

-- 2) Backfill the interval from the legacy instant (60-min default). No-op on an empty table.
UPDATE "Appointment"
  SET "startAt" = "slotDatetime",
      "endAt"   = "slotDatetime" + interval '60 minutes'
  WHERE "startAt" IS NULL;

ALTER TABLE "Appointment" ALTER COLUMN "startAt" SET NOT NULL;
ALTER TABLE "Appointment" ALTER COLUMN "endAt" SET NOT NULL;
ALTER TABLE "Appointment" DROP COLUMN "slotDatetime";

CREATE INDEX "Appointment_contractorId_startAt_idx" ON "Appointment"("contractorId", "startAt");

-- 3) Defensive dedupe: if duplicate ACTIVE appointments share a start (the pre-fix bug),
--    keep the earliest per (contractor, startAt) and cancel the rest so the constraints apply.
WITH ranked AS (
  SELECT "id", row_number() OVER (PARTITION BY "contractorId", "startAt" ORDER BY "createdAt") AS rn
  FROM "Appointment" WHERE "status" IN ('proposed', 'confirmed')
)
UPDATE "Appointment"
  SET "status" = 'cancelled', "cancelledAt" = now(), "cancelReason" = 'dedupe: pre-constraint cleanup'
  WHERE "id" IN (SELECT "id" FROM ranked WHERE rn > 1);

-- 4) THE GUARANTEE: no two ACTIVE appointments for one contractor may overlap in time.
--    btree_gist gives GiST an equality operator class for the scalar contractorId.
--    Columns are `timestamp` (UTC instants), so tsrange (not tstzrange). Half-open [)
--    so back-to-back 9-10 / 10-11 do NOT collide.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment" ADD CONSTRAINT "appt_no_overlap_per_contractor"
  EXCLUDE USING gist (
    "contractorId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE ("status" IN ('proposed', 'confirmed'));

-- Belt-and-suspenders: exact-start uniqueness per contractor (fast-fails the common race).
CREATE UNIQUE INDEX "appt_unique_active_start_per_contractor"
  ON "Appointment"("contractorId", "startAt") WHERE "status" IN ('proposed', 'confirmed');

-- One ACTIVE appointment per lead — removes the reschedule/cancel ambiguity.
CREATE UNIQUE INDEX "appt_one_active_per_lead"
  ON "Appointment"("leadId") WHERE "status" IN ('proposed', 'confirmed');

-- 5) Per-contractor calendar connection (empty/unused until sync ships).
CREATE TABLE "CalendarConnection" (
  "id" TEXT NOT NULL,
  "contractorId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalCalendarId" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'disconnected',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarConnection_contractorId_provider_key" ON "CalendarConnection"("contractorId", "provider");
ALTER TABLE "CalendarConnection" ADD CONSTRAINT "CalendarConnection_contractorId_fkey"
  FOREIGN KEY ("contractorId") REFERENCES "Contractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
