-- CreateTable
CREATE TABLE "SupabaseConnection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "projectRef" TEXT NOT NULL,
    "serviceKey" TEXT NOT NULL,
    "managementToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupabaseConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupabaseConnection_orgId_idx" ON "SupabaseConnection"("orgId");
