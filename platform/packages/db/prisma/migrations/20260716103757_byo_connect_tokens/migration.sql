-- AlterTable
ALTER TABLE "GithubConnection" ADD COLUMN     "userToken" TEXT,
ALTER COLUMN "installationId" DROP NOT NULL,
ALTER COLUMN "login" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VercelConnection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "teamId" TEXT,
    "vercelUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VercelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VercelConnection_orgId_idx" ON "VercelConnection"("orgId");
