-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('idle', 'working');

-- CreateEnum
CREATE TYPE "DepartmentStatus" AS ENUM ('active', 'in_development');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('agent_can_do', 'needs_input', 'needs_earlier', 'in_progress', 'needs_approval', 'done', 'failed');

-- CreateEnum
CREATE TYPE "ArtifactKind" AS ENUM ('agent_session', 'pr_diff', 'site_preview', 'image', 'file', 'doc');

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('draft', 'building', 'preview', 'live', 'failed');

-- CreateEnum
CREATE TYPE "DeploymentEnv" AS ENUM ('preview', 'production');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('queued', 'building', 'ready', 'error', 'canceled');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('starting', 'running', 'hibernated', 'killed', 'failed');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "CanvasNodeType" AS ENUM ('terminal', 'markdown', 'folder', 'site', 'text', 'drawing');

-- CreateEnum
CREATE TYPE "EdgeKind" AS ENUM ('owns', 'reads', 'produces');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "DepartmentStatus" NOT NULL DEFAULT 'in_development',
    "context" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "departmentKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "contract" TEXT NOT NULL DEFAULT '',
    "models" JSONB NOT NULL DEFAULT '{}',
    "status" "AgentStatus" NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractRevision" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "departmentKey" TEXT NOT NULL,
    "agentId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'agent_can_do',
    "parentTaskId" TEXT,
    "input" JSONB,
    "result" JSONB,
    "model" TEXT,
    "assignedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taskId" TEXT,
    "agentId" TEXT,
    "kind" "ArtifactKind" NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "departmentKey" TEXT,
    "repoFullName" TEXT,
    "vercelProjectId" TEXT,
    "domain" TEXT,
    "status" "SiteStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "env" "DeploymentEnv" NOT NULL,
    "url" TEXT NOT NULL,
    "sha" TEXT,
    "prNumber" INTEGER,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "sandboxId" TEXT,
    "agentKind" TEXT NOT NULL,
    "repo" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'starting',
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GithubConnection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "repos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "taskId" TEXT,
    "action" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "decidedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasNode" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "type" "CanvasNodeType" NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "w" DOUBLE PRECISION,
    "h" DOUBLE PRECISION,
    "refId" TEXT,
    "z" INTEGER,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Edge" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" "EdgeKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Edge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "agentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Department_orgId_idx" ON "Department"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_orgId_key_key" ON "Department"("orgId", "key");

-- CreateIndex
CREATE INDEX "Agent_orgId_idx" ON "Agent"("orgId");

-- CreateIndex
CREATE INDEX "Agent_orgId_departmentKey_idx" ON "Agent"("orgId", "departmentKey");

-- CreateIndex
CREATE INDEX "ContractRevision_agentId_idx" ON "ContractRevision"("agentId");

-- CreateIndex
CREATE INDEX "Task_orgId_idx" ON "Task"("orgId");

-- CreateIndex
CREATE INDEX "Task_orgId_departmentKey_idx" ON "Task"("orgId", "departmentKey");

-- CreateIndex
CREATE INDEX "Task_agentId_idx" ON "Task"("agentId");

-- CreateIndex
CREATE INDEX "Task_parentTaskId_idx" ON "Task"("parentTaskId");

-- CreateIndex
CREATE INDEX "Artifact_orgId_idx" ON "Artifact"("orgId");

-- CreateIndex
CREATE INDEX "Artifact_taskId_idx" ON "Artifact"("taskId");

-- CreateIndex
CREATE INDEX "Artifact_agentId_idx" ON "Artifact"("agentId");

-- CreateIndex
CREATE INDEX "Site_orgId_idx" ON "Site"("orgId");

-- CreateIndex
CREATE INDEX "Deployment_siteId_idx" ON "Deployment"("siteId");

-- CreateIndex
CREATE INDEX "Session_orgId_idx" ON "Session"("orgId");

-- CreateIndex
CREATE INDEX "GithubConnection_orgId_idx" ON "GithubConnection"("orgId");

-- CreateIndex
CREATE INDEX "Approval_orgId_idx" ON "Approval"("orgId");

-- CreateIndex
CREATE INDEX "Approval_taskId_idx" ON "Approval"("taskId");

-- CreateIndex
CREATE INDEX "CanvasNode_orgId_idx" ON "CanvasNode"("orgId");

-- CreateIndex
CREATE INDEX "Edge_orgId_idx" ON "Edge"("orgId");

-- CreateIndex
CREATE INDEX "Edge_fromId_idx" ON "Edge"("fromId");

-- CreateIndex
CREATE INDEX "Edge_toId_idx" ON "Edge"("toId");

-- CreateIndex
CREATE INDEX "Collection_orgId_idx" ON "Collection"("orgId");

-- CreateIndex
CREATE INDEX "Collection_agentId_idx" ON "Collection"("agentId");

-- AddForeignKey
ALTER TABLE "ContractRevision" ADD CONSTRAINT "ContractRevision_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "Task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

