-- CreateEnum
CREATE TYPE "MemoryTier" AS ENUM ('core', 'longterm');

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "tier" "MemoryTier" NOT NULL DEFAULT 'core',
    "key" TEXT,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Memory_orgId_idx" ON "Memory"("orgId");

-- CreateIndex
CREATE INDEX "Memory_orgId_tier_idx" ON "Memory"("orgId", "tier");
