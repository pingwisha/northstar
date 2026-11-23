-- Browsers that agreed to get a daily reminder. One row per browser. hour is the local hour of the
-- reminder in the browser's time zone; last_sent_on is the local day of the last reminder sent.
CREATE TABLE push_subscriptions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  endpoint     TEXT NOT NULL UNIQUE,
  timezone     TEXT NOT NULL,
  hour         INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  last_sent_on TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX push_subscriptions_user ON push_subscriptions (user_id);
