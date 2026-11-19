-- A person's own note on a task, and a mark telling a material they added from one the AI planned.
ALTER TABLE tasks ADD COLUMN note TEXT;
ALTER TABLE materials ADD COLUMN own INTEGER NOT NULL DEFAULT 0 CHECK (own IN (0, 1));
