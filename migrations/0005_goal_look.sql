-- How a goal looks: a colour and an icon, both keys from a fixed list (see src/lib/goal-look.ts).
ALTER TABLE goals ADD COLUMN color TEXT NOT NULL DEFAULT 'blue';
ALTER TABLE goals ADD COLUMN icon TEXT NOT NULL DEFAULT 'target';
