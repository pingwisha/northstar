-- Results of practice tests (пробники). weak_topics is a short text the person wrote, topics separated by commas or lines.
CREATE TABLE trials (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  goal_id     TEXT NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  taken_on    TEXT NOT NULL,
  title       TEXT NOT NULL,
  score       REAL NOT NULL CHECK (score >= 0),
  max_score   REAL NOT NULL CHECK (max_score > 0),
  weak_topics TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX trials_user_taken ON trials (user_id, taken_on);
