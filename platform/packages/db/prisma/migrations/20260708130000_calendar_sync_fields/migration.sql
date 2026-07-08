-- Google Calendar two-way sync fields (GOOGLE_CALENDAR.md §6, §9). All additive + nullable, so this
-- is safe to apply and does NOT touch the raw-SQL booking-integrity constraints (btree_gist EXCLUDE +
-- partial unique indexes) that Prisma can't express.

-- Appointment: loop-prevention marker (the event version WE last wrote).
ALTER TABLE "Appointment" ADD COLUMN "externalEtag" TEXT;

-- CalendarConnection: display fields + incremental-sync cursor + push-notification watch channel.
ALTER TABLE "CalendarConnection" ADD COLUMN "scope" TEXT;
ALTER TABLE "CalendarConnection" ADD COLUMN "email" TEXT;
ALTER TABLE "CalendarConnection" ADD COLUMN "syncToken" TEXT;
ALTER TABLE "CalendarConnection" ADD COLUMN "channelId" TEXT;
ALTER TABLE "CalendarConnection" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "CalendarConnection" ADD COLUMN "channelToken" TEXT;
ALTER TABLE "CalendarConnection" ADD COLUMN "channelExpiresAt" TIMESTAMP(3);
