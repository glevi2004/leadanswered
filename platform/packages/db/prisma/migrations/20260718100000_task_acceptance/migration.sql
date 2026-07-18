-- Task.acceptance — the paper's Outcome tier promoted onto the task (harness-spec §2 P2). Additive.

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "acceptance" JSONB;
