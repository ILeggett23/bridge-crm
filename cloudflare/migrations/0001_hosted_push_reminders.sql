CREATE TABLE IF NOT EXISTS bridge_push_subscriptions (
  endpoint TEXT PRIMARY KEY NOT NULL,
  subscription_json TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  time_zone TEXT,
  schedule_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT
);

CREATE TABLE IF NOT EXISTS bridge_push_deliveries (
  reminder_key TEXT PRIMARY KEY NOT NULL,
  sent_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bridge_push_subscriptions_active
  ON bridge_push_subscriptions(disabled_at);
