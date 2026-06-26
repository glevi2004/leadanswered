-- AlterTable: email-routing key + email idempotency key (SCOPE §9)
ALTER TABLE "Contractor" ADD COLUMN "slug" TEXT;
ALTER TABLE "Lead" ADD COLUMN "sourceMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_slug_key" ON "Contractor"("slug");
CREATE UNIQUE INDEX "Lead_sourceMessageId_key" ON "Lead"("sourceMessageId");
