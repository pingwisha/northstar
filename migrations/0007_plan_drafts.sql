-- A plan the AI proposed and the person has not accepted yet. One draft per goal.
CREATE TABLE plan_drafts (
  goal_id    TEXT PRIMARY KEY REFERENCES goals (id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  plan       TEXT NOT NULL,
  missing    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX plan_drafts_user ON plan_drafts (user_id);
