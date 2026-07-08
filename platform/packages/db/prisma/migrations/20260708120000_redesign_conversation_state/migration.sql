-- Redesign ConversationState to the workflow model: intake | agent | done.
-- (Old values: greeting, qualifying, proposing_slots, confirming, booked, done.)
-- The DB is empty, so the enum cast below has no rows to convert.

-- AlterEnum
BEGIN;
CREATE TYPE "ConversationState_new" AS ENUM ('intake', 'agent', 'done');
ALTER TABLE "Conversation" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "state" TYPE "ConversationState_new" USING ("state"::text::"ConversationState_new");
ALTER TYPE "ConversationState" RENAME TO "ConversationState_old";
ALTER TYPE "ConversationState_new" RENAME TO "ConversationState";
DROP TYPE "ConversationState_old";
ALTER TABLE "Conversation" ALTER COLUMN "state" SET DEFAULT 'intake';
COMMIT;
