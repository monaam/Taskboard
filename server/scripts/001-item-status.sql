-- Replaces ChecklistItem.completed (boolean) with status (text).
--
--   completed = false  ->  'todo'
--   completed = true   ->  'done'
--   new third state    ->  'in_progress'
--
-- Written as hand-rolled SQL rather than a Prisma migration because this
-- project's migration history is still locked to mysql (P3019) and the
-- workflow is `prisma db push`. Run this BEFORE pushing the new schema, so the
-- backfill happens while `completed` still exists — db push on its own would
-- drop the column and silently reset every finished task to 'todo'.
--
-- Idempotent: safe to re-run, and safe to run against a database that has
-- already been migrated.
BEGIN;

ALTER TABLE "ChecklistItem" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'todo';

-- Guarded so a re-run cannot clobber statuses set since the first run.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ChecklistItem' AND column_name = 'completed'
  ) THEN
    UPDATE "ChecklistItem" SET "status" = 'done' WHERE "completed" = true AND "status" = 'todo';
  END IF;
END $$;

ALTER TABLE "ChecklistItem" DROP COLUMN IF EXISTS "completed";

COMMIT;
