-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'rescheduled';
ALTER TYPE "AppointmentStatus" ADD VALUE 'cancelled';

-- AlterEnum
ALTER TYPE "ConversationState" ADD VALUE 'booked';

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "rescheduledFromIso" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Appointment_leadId_status_idx" ON "Appointment"("leadId", "status");
