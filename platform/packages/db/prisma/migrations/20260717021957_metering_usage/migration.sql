-- CreateEnum
CREATE TYPE "UsageKind" AS ENUM ('llm', 'sandbox');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" "UsageKind" NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "sandboxSeconds" INTEGER,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "taskId" TEXT,
    "agentId" TEXT,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageEvent_orgId_idx" ON "UsageEvent"("orgId");

-- CreateIndex
CREATE INDEX "UsageEvent_orgId_at_idx" ON "UsageEvent"("orgId", "at");
