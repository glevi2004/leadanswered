-- The event journal (docs/workflow.md §1) + report-back message meta (§3). Additive only.

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "meta" JSONB;

-- CreateTable
CREATE TABLE "AgentEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taskId" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentEvent_orgId_createdAt_idx" ON "AgentEvent"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentEvent_taskId_idx" ON "AgentEvent"("taskId");
