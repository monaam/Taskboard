-- Replace ChecklistItem.completed (boolean) with status.
--
--   completed = 0  ->  'todo'
--   completed = 1  ->  'done'
--   new state      ->  'in_progress'
--
-- The backfill must sit between the ADD and the DROP: dropping first would
-- discard which items were finished, and there is nothing left to recover it
-- from. MySQL gives each DDL statement an implicit commit, so this is not one
-- transaction -- take a dump before deploying.
ALTER TABLE `ChecklistItem` ADD COLUMN `status` VARCHAR(191) NOT NULL DEFAULT 'todo';

UPDATE `ChecklistItem` SET `status` = 'done' WHERE `completed` = 1;

ALTER TABLE `ChecklistItem` DROP COLUMN `completed`;
