-- DropForeignKey
ALTER TABLE "NotificationRecipient" DROP CONSTRAINT "NotificationRecipient_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationSubscription" DROP CONSTRAINT "NotificationSubscription_recipientId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "Escalation" DROP CONSTRAINT "Escalation_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Escalation" DROP CONSTRAINT "Escalation_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_leadId_fkey";

-- DropForeignKey
ALTER TABLE "Appointment" DROP CONSTRAINT "Appointment_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarConnection" DROP CONSTRAINT "CalendarConnection_organizationId_fkey";

-- DropTable
DROP TABLE "NotificationRecipient";

-- DropTable
DROP TABLE "NotificationSubscription";

-- DropTable
DROP TABLE "Lead";

-- DropTable
DROP TABLE "Conversation";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "Escalation";

-- DropTable
DROP TABLE "Appointment";

-- DropTable
DROP TABLE "CalendarConnection";

-- DropEnum
DROP TYPE "LeadStatus";

-- DropEnum
DROP TYPE "ConversationState";

-- DropEnum
DROP TYPE "MessageDirection";

-- DropEnum
DROP TYPE "AppointmentStatus";

-- DropEnum
DROP TYPE "NotificationEventType";

-- DropEnum
DROP TYPE "NotificationChannel";

-- DropEnum
DROP TYPE "EscalationStatus";

-- DropEnum
DROP TYPE "AppointmentSyncState";

