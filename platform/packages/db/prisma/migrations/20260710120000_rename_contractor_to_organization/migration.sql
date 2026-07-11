-- Rename tenant entity Contractor -> Organization (segment-agnostic vocabulary).
-- Data-preserving: Prisma treats a model rename as DROP+CREATE, so this migration is
-- hand-written with ALTER … RENAME. Column renames automatically update every dependent
-- object (FKs, indexes, the btree_gist EXCLUDE), so only the object NAMES need renaming
-- to match Prisma's conventions for the `Organization` model (keeps `migrate status` clean).

-- 1) Table
ALTER TABLE "Contractor" RENAME TO "Organization";

-- 2) Organization's own primary key + unique indexes (table rename does NOT rename these)
ALTER TABLE "Organization" RENAME CONSTRAINT "Contractor_pkey" TO "Organization_pkey";
ALTER INDEX "Contractor_slug_key" RENAME TO "Organization_slug_key";
ALTER INDEX "Contractor_ownerEmail_key" RENAME TO "Organization_ownerEmail_key";

-- 3) FK columns: contractorId -> organizationId
ALTER TABLE "Lead"                  RENAME COLUMN "contractorId" TO "organizationId";
ALTER TABLE "NotificationRecipient" RENAME COLUMN "contractorId" TO "organizationId";
ALTER TABLE "Appointment"           RENAME COLUMN "contractorId" TO "organizationId";
ALTER TABLE "Escalation"            RENAME COLUMN "contractorId" TO "organizationId";
ALTER TABLE "CalendarConnection"    RENAME COLUMN "contractorId" TO "organizationId";

-- 4) Secondary indexes referencing the old column name
ALTER INDEX "Lead_contractorId_contactPhone_idx"           RENAME TO "Lead_organizationId_contactPhone_idx";
ALTER INDEX "Escalation_contractorId_status_idx"           RENAME TO "Escalation_organizationId_status_idx";
ALTER INDEX "Appointment_contractorId_startAt_idx"         RENAME TO "Appointment_organizationId_startAt_idx";
ALTER INDEX "CalendarConnection_contractorId_provider_key" RENAME TO "CalendarConnection_organizationId_provider_key";

-- 5) FK constraints
ALTER TABLE "Lead"                  RENAME CONSTRAINT "Lead_contractorId_fkey"                  TO "Lead_organizationId_fkey";
ALTER TABLE "NotificationRecipient" RENAME CONSTRAINT "NotificationRecipient_contractorId_fkey" TO "NotificationRecipient_organizationId_fkey";
ALTER TABLE "Appointment"           RENAME CONSTRAINT "Appointment_contractorId_fkey"           TO "Appointment_organizationId_fkey";
ALTER TABLE "Escalation"            RENAME CONSTRAINT "Escalation_contractorId_fkey"            TO "Escalation_organizationId_fkey";
ALTER TABLE "CalendarConnection"    RENAME CONSTRAINT "CalendarConnection_contractorId_fkey"    TO "CalendarConnection_organizationId_fkey";

-- 6) Raw-SQL booking-integrity constraints (not tracked by Prisma; renamed for consistency).
--    The column rename in step 3 already updated their internal references.
ALTER TABLE "Appointment" RENAME CONSTRAINT "appt_no_overlap_per_contractor" TO "appt_no_overlap_per_organization";
ALTER INDEX "appt_unique_active_start_per_contractor" RENAME TO "appt_unique_active_start_per_organization";
