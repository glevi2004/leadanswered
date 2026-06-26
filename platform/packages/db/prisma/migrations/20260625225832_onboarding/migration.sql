-- Onboarding (Phase 3) + dashboard-editable escalation topics
ALTER TABLE "Contractor" ADD COLUMN "escalationTopics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Contractor" ADD COLUMN "ownerEmail" TEXT;
ALTER TABLE "Contractor" ADD COLUMN "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Contractor_ownerEmail_key" ON "Contractor"("ownerEmail");
