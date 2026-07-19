-- Rename the assistant identity columns Sarah -> Lu (Organization).
ALTER TABLE "Organization" RENAME COLUMN "sarahName" TO "assistantName";
ALTER TABLE "Organization" ALTER COLUMN "assistantName" SET DEFAULT 'Lu';
ALTER TABLE "Organization" RENAME COLUMN "sarahPersonaNotes" TO "personaNotes";
