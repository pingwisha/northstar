-- The mistake notebook: what went wrong and on which topic, until the person marks it fixed.
CREATE TABLE mistakes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  goal_id    TEXT NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  topic      TEXT NOT NULL,
  note       TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  fixed_at   TEXT
);
CREATE INDEX mistakes_user ON mistakes (user_id, fixed_at, created_at);
