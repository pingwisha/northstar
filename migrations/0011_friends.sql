-- Friends (decision 0075). An invitation is a one-time link; only the hash of its key is stored.
-- A friendship is one row with the two people in sorted order; each side's nickname is what the OTHER person sees:
-- nick_a is the name user_a gave themselves, nick_b the name user_b gave themselves.
CREATE TABLE friend_invites (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  nickname   TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX friend_invites_user ON friend_invites (user_id);

CREATE TABLE friendships (
  id         TEXT PRIMARY KEY,
  user_a     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  user_b     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  nick_a     TEXT NOT NULL,
  nick_b     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX friendships_b ON friendships (user_b);
