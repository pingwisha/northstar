-- Spaced review of mistakes: each unfixed mistake comes back after 1, 3 and 7 days.
-- review_step counts the "remembered" marks (0..3); review_due is the day it is next shown, NULL once the cycle is complete.
ALTER TABLE mistakes ADD COLUMN review_step INTEGER NOT NULL DEFAULT 0;
ALTER TABLE mistakes ADD COLUMN review_due TEXT;
-- Mistakes written before this change start their cycle the day after they were written.
UPDATE mistakes SET review_due = date(created_at, '+1 day') WHERE fixed_at IS NULL;
CREATE INDEX mistakes_review ON mistakes (user_id, review_due);
