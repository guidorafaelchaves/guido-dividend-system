CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS email_delivery_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'disabled',
  recipient_hash TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK(status IN ('queued','sent','disabled','failed')),
  error_message TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS asset_quote_history (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  previous_price_cents INTEGER,
  next_price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  source TEXT NOT NULL,
  quality TEXT NOT NULL DEFAULT 'reliable_external',
  job_id TEXT,
  quoted_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(asset_id) REFERENCES assets(id),
  FOREIGN KEY(job_id) REFERENCES data_sync_jobs(id)
);

CREATE TABLE IF NOT EXISTS financial_event_versions (
  id TEXT PRIMARY KEY,
  financial_event_id TEXT NOT NULL,
  version_no INTEGER NOT NULL,
  before_json TEXT,
  after_json TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'reliable_external',
  reviewed_by_user_id TEXT,
  job_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(financial_event_id, version_no),
  FOREIGN KEY(financial_event_id) REFERENCES financial_events(id),
  FOREIGN KEY(reviewed_by_user_id) REFERENCES users(id),
  FOREIGN KEY(job_id) REFERENCES data_sync_jobs(id)
);

CREATE TABLE IF NOT EXISTS data_change_logs (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  change_type TEXT NOT NULL,
  source TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  job_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(job_id) REFERENCES data_sync_jobs(id)
);

CREATE TABLE IF NOT EXISTS job_runs (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','running','success','failed','partial','cancelled')),
  cursor_json TEXT NOT NULL DEFAULT '{}',
  items_processed INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS billing_customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_customer_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, external_customer_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature_valid INTEGER NOT NULL DEFAULT 0,
  processed_at TEXT,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','processed','ignored','failed')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, external_event_id)
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  portfolio_id TEXT,
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('uploaded','validated','imported','failed','reverted')),
  source_filename TEXT NOT NULL DEFAULT '',
  row_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  report_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(portfolio_id) REFERENCES portfolios(id)
);

CREATE TABLE IF NOT EXISTS rate_limit_events (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 1,
  window_start TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(scope, key_hash, window_start)
);

ALTER TABLE financial_events ADD COLUMN ingest_state TEXT NOT NULL DEFAULT 'published';
ALTER TABLE financial_events ADD COLUMN confidence TEXT NOT NULL DEFAULT 'reliable_external';
ALTER TABLE financial_events ADD COLUMN dedupe_key TEXT;
ALTER TABLE transactions ADD COLUMN import_batch_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_events_dedupe ON financial_events(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_email_delivery_user ON email_delivery_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quote_history_asset ON asset_quote_history(asset_id, quoted_at);
CREATE INDEX IF NOT EXISTS idx_event_versions_event ON financial_event_versions(financial_event_id, version_no);
CREATE INDEX IF NOT EXISTS idx_job_runs_name_status ON job_runs(job_name, status, created_at);
CREATE INDEX IF NOT EXISTS idx_billing_events_provider ON billing_events(provider, external_event_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_user ON import_batches(user_id, status);
CREATE INDEX IF NOT EXISTS idx_rate_limit_scope ON rate_limit_events(scope, key_hash, window_start);
