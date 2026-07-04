CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  plan TEXT NOT NULL DEFAULT 'free'
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('trial','active','canceled')),
  mrr_brl REAL NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  canceled_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT 'active',
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('brapi_call','ai_tokens','cloud_request')),
  quantity REAL NOT NULL DEFAULT 0,
  cost_brl REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'manual'
);

CREATE TABLE IF NOT EXISTS cost_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK(category IN ('brapi','ai','cloud','support','payment')),
  amount_brl REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  source TEXT NOT NULL DEFAULT 'manual',
  note TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_activity_date ON user_activity(activity_date);
CREATE INDEX IF NOT EXISTS idx_activity_user_date ON user_activity(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_kind ON usage_events(kind);
CREATE INDEX IF NOT EXISTS idx_cost_created ON cost_events(created_at);
CREATE INDEX IF NOT EXISTS idx_cost_category ON cost_events(category);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscriptions(status);
