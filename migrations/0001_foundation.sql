-- Foundation schema (plan step 0.4). Timestamps are ISO 8601 UTC strings,
-- dates are YYYY-MM-DD. Every user-owned table carries user_id and is deleted
-- with the user (foreign keys are enforced by D1).

CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nick       TEXT,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- People the owner invited. Signing in is allowed for the owner's emails
-- (ALLOWED_EMAILS secret) and for every email listed here.
CREATE TABLE invites (
  email      TEXT PRIMARY KEY COLLATE NOCASE,
  invited_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE goals (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  start_date   TEXT NOT NULL,
  deadline     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'done', 'archived')),
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX goals_user ON goals (user_id, status);

CREATE TABLE stages (
  id       TEXT PRIMARY KEY,
  user_id  TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  goal_id  TEXT NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title    TEXT NOT NULL,
  due_date TEXT
);
CREATE INDEX stages_goal ON stages (goal_id, position);

-- Progress reads weight and completed_at; an unchecked task counts as zero.
CREATE TABLE tasks (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  goal_id      TEXT NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  stage_id     TEXT REFERENCES stages (id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  planned_for  TEXT NOT NULL,
  weight       INTEGER NOT NULL DEFAULT 1 CHECK (weight > 0),
  completed_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX tasks_user_planned ON tasks (user_id, planned_for);
CREATE INDEX tasks_goal ON tasks (goal_id);

-- Study materials attached to a task. source says where the link came from.
CREATE TABLE materials (
  id      TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  task_id TEXT NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  kind    TEXT NOT NULL CHECK (kind IN ('article', 'video', 'trainer', 'checklist', 'other')),
  title   TEXT NOT NULL,
  url     TEXT,
  source  TEXT
);
CREATE INDEX materials_task ON materials (task_id);

CREATE TABLE chats (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE chat_messages (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  chat_id    TEXT NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX chat_messages_chat ON chat_messages (chat_id, created_at);

-- Requests to the AI proxy per person per day.
CREATE TABLE ai_usage (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day     TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
