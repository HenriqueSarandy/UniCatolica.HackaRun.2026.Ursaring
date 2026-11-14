CREATE TABLE sessions (
  id            TEXT PRIMARY KEY,
  point_id      TEXT NOT NULL,
  state         TEXT NOT NULL DEFAULT 'inicio',
  last_dest_id  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE TABLE chat_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL REFERENCES sessions(id),
  role        TEXT NOT NULL CHECK (role IN ('user','bot')),
  text        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_chat_log_session ON chat_log(session_id, id);
