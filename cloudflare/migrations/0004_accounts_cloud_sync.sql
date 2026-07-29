PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bridge_users (
  id TEXT PRIMARY KEY NOT NULL,
  email_normalized TEXT NOT NULL UNIQUE,
  email_display TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS bridge_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent_hash TEXT,
  ip_hash TEXT,
  FOREIGN KEY (user_id) REFERENCES bridge_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bridge_sessions_user
  ON bridge_sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS bridge_account_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  request_ip_hash TEXT,
  FOREIGN KEY (user_id) REFERENCES bridge_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bridge_account_tokens_user
  ON bridge_account_tokens(user_id, purpose, expires_at);

CREATE TABLE IF NOT EXISTS bridge_auth_rate_limits (
  bucket_key TEXT PRIMARY KEY NOT NULL,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL,
  blocked_until INTEGER
);

CREATE TABLE IF NOT EXISTS bridge_user_sync (
  user_id TEXT PRIMARY KEY NOT NULL,
  next_cursor INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES bridge_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bridge_crm_records (
  user_id TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('contact', 'place', 'settings', 'meta')),
  record_id TEXT NOT NULL,
  payload_json TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  sync_cursor INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  PRIMARY KEY (user_id, record_type, record_id),
  FOREIGN KEY (user_id) REFERENCES bridge_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bridge_crm_records_pull
  ON bridge_crm_records(user_id, sync_cursor);

CREATE TABLE IF NOT EXISTS bridge_sync_mutations (
  user_id TEXT NOT NULL,
  mutation_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  result_json TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  PRIMARY KEY (user_id, mutation_id),
  FOREIGN KEY (user_id) REFERENCES bridge_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bridge_sync_mutations_applied
  ON bridge_sync_mutations(user_id, applied_at);

CREATE TABLE IF NOT EXISTS bridge_local_migrations (
  user_id TEXT NOT NULL,
  migration_key TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  source_fingerprint TEXT,
  PRIMARY KEY (user_id, migration_key),
  FOREIGN KEY (user_id) REFERENCES bridge_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bridge_backup_runs (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'complete', 'failed', 'deleted')),
  object_key TEXT,
  content_hash TEXT,
  byte_size INTEGER,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  expires_at TEXT,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES bridge_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS bridge_backup_runs_user
  ON bridge_backup_runs(user_id, created_at DESC);

ALTER TABLE bridge_push_subscriptions ADD COLUMN user_id TEXT;
ALTER TABLE bridge_shared_scorecards ADD COLUMN user_id TEXT;

CREATE INDEX IF NOT EXISTS bridge_push_subscriptions_user
  ON bridge_push_subscriptions(user_id, disabled_at);

CREATE INDEX IF NOT EXISTS bridge_shared_scorecards_user
  ON bridge_shared_scorecards(user_id, created_at DESC);
