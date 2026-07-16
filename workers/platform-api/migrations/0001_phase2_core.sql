CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','pending_verification','locked','deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/Fortaleza',
  currency TEXT NOT NULL DEFAULT 'BRL',
  investor_type TEXT NOT NULL DEFAULT '',
  interests_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(user_id, role_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(role_id) REFERENCES roles(id)
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','hidden','archived')),
  limits_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('trialing','active','past_due','paused','cancelled','expired','incomplete')),
  cycle TEXT NOT NULL DEFAULT 'monthly',
  provider TEXT NOT NULL DEFAULT 'manual',
  external_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  renews_at TEXT,
  cancelled_at TEXT,
  grace_ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  ticker TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  sector TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'active',
  source_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS asset_quotes (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  source TEXT NOT NULL,
  quoted_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(asset_id, source, quoted_at),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS financial_events (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('confirmed','provisioned','estimated','projected','cancelled')),
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  ex_date TEXT,
  payment_date TEXT,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(asset_id, kind, ex_date, payment_date, source),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS data_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  trust_level TEXT NOT NULL DEFAULT 'external',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY,
  alert_frequency TEXT NOT NULL DEFAULT 'weekly',
  communication_json TEXT NOT NULL DEFAULT '{}',
  consent_json TEXT NOT NULL DEFAULT '{}',
  classes_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS watchlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS watchlist_items (
  id TEXT PRIMARY KEY,
  watchlist_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high')),
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'watching' CHECK(status IN ('watching','paused','archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(watchlist_id, asset_id),
  FOREIGN KEY(watchlist_id) REFERENCES watchlists(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, asset_id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT,
  type TEXT NOT NULL,
  condition_json TEXT NOT NULL DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'in_app',
  frequency TEXT NOT NULL DEFAULT 'daily',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','archived')),
  last_evaluated_at TEXT,
  last_notified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paused_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'unread' CHECK(status IN ('unread','read','archived')),
  entity_type TEXT,
  entity_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS portfolios (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'BRL',
  strategy TEXT NOT NULL DEFAULT '',
  target_income_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('buy','sell','transfer_in','transfer_out','dividend','jcp','fii_income','amortization','bonus','split','reverse_split','subscription','fee','tax','adjustment')),
  trade_date TEXT NOT NULL,
  quantity_decimal TEXT NOT NULL DEFAULT '0',
  price_cents INTEGER NOT NULL DEFAULT 0,
  gross_amount_cents INTEGER NOT NULL DEFAULT 0,
  fees_cents INTEGER NOT NULL DEFAULT 0,
  taxes_cents INTEGER NOT NULL DEFAULT 0,
  broker TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual',
  import_id TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('draft','confirmed','reconciled','deleted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(portfolio_id) REFERENCES portfolios(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS income_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  financial_event_id TEXT,
  status TEXT NOT NULL CHECK(status IN ('predicted','provisioned','confirmed','received','reconciled','divergent','cancelled')),
  quantity_decimal TEXT NOT NULL DEFAULT '0',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  payment_date TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(portfolio_id) REFERENCES portfolios(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id),
  FOREIGN KEY(financial_event_id) REFERENCES financial_events(id)
);

CREATE TABLE IF NOT EXISTS investment_theses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  thesis TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS data_sync_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('queued','running','success','failed','cancelled')),
  started_at TEXT,
  finished_at TEXT,
  duration_ms INTEGER,
  items_processed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  next_run_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS publication_reviews (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','published')),
  reviewer_user_id TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  before_json TEXT,
  after_json TEXT,
  request_id TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_assets_ticker ON assets(ticker);
CREATE INDEX IF NOT EXISTS idx_events_asset_payment ON financial_events(asset_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_watchlists_user ON watchlists(user_id, status);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist ON watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id, status);
CREATE INDEX IF NOT EXISTS idx_transactions_portfolio ON transactions(portfolio_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_income_user_payment ON income_records(user_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_sync_status ON data_sync_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

INSERT OR IGNORE INTO roles(id, name) VALUES
  ('visitor','visitor'),
  ('free_user','free_user'),
  ('subscriber','subscriber'),
  ('premium_user','premium_user'),
  ('editor','editor'),
  ('analyst','analyst'),
  ('support','support'),
  ('admin','admin'),
  ('owner','owner'),
  ('service','service');

INSERT OR IGNORE INTO plans(id, name, tier, status, limits_json) VALUES
  ('public','Public',0,'active','{"watchlistAssets":0,"portfolios":0,"alerts":0,"historicalMonths":0,"advancedReports":false,"aiAnalysis":false}'),
  ('free','Free',1,'active','{"watchlistAssets":20,"portfolios":1,"alerts":5,"historicalMonths":12,"advancedReports":false,"aiAnalysis":false}'),
  ('dividend_system','Dividend System',2,'active','{"watchlistAssets":200,"portfolios":5,"alerts":50,"historicalMonths":120,"advancedReports":true,"aiAnalysis":true}'),
  ('family_office','Family Office IA',3,'hidden','{"watchlistAssets":1000,"portfolios":25,"alerts":250,"historicalMonths":240,"advancedReports":true,"aiAnalysis":true}');

INSERT OR IGNORE INTO data_sources(id, name, kind, trust_level) VALUES
  ('demo','Demo Fixture','fixture','demo'),
  ('brapi','BRAPI','market_provider','external'),
  ('admin','Admin Curadoria','curated','curated'),
  ('legacy','Dividend System Legado','legacy','internal');

INSERT OR IGNORE INTO assets(id, ticker, name, type, sector, currency, status, source_id) VALUES
  ('asset_mxrf11','MXRF11','Maxi Renda FII','FII','Recebiveis imobiliarios','BRL','active','demo'),
  ('asset_bbas3','BBAS3','Banco do Brasil','Acao','Bancos','BRL','active','demo'),
  ('asset_taee11','TAEE11','Taesa Units','Unit','Energia eletrica','BRL','active','demo'),
  ('asset_petr4','PETR4','Petrobras PN','Acao','Petroleo e gas','BRL','active','demo'),
  ('asset_hglg11','HGLG11','CSHG Logistica FII','FII','Logistica','BRL','active','demo');
