CREATE TABLE IF NOT EXISTS bridge_shared_scorecards (
  token TEXT PRIMARY KEY NOT NULL,
  management_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bridge_shared_scorecards_expires
  ON bridge_shared_scorecards(expires_at);
