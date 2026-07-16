CREATE TABLE IF NOT EXISTS admin_import_files (
  id TEXT PRIMARY KEY,
  operator_user_id TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  safe_filename TEXT NOT NULL,
  extension TEXT NOT NULL DEFAULT '',
  detected_mime TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  sha256_hash TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'r2',
  storage_key TEXT,
  reference_date TEXT,
  presumed_profile TEXT NOT NULL DEFAULT '',
  detected_profile TEXT NOT NULL DEFAULT '',
  detection_confidence INTEGER NOT NULL DEFAULT 0,
  ingestion_status TEXT NOT NULL DEFAULT 'queued' CHECK(ingestion_status IN ('queued','processing','processed','failed')),
  validation_status TEXT NOT NULL DEFAULT 'unvalidated' CHECK(validation_status IN ('unvalidated','valid','warning','invalid','blocked')),
  review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK(review_status IN ('pending_review','approved','rejected')),
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','archived','superseded')),
  row_count INTEGER NOT NULL DEFAULT 0,
  accepted_count INTEGER NOT NULL DEFAULT 0,
  rejected_count INTEGER NOT NULL DEFAULT 0,
  report_json TEXT NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  FOREIGN KEY(operator_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS admin_import_mappings (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  name TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '{}',
  mapping_json TEXT NOT NULL DEFAULT '{}',
  transform_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(profile_id, name),
  FOREIGN KEY(created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS raw_import_rows (
  id TEXT PRIMARY KEY,
  import_file_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  raw_json TEXT NOT NULL,
  normalized_json TEXT NOT NULL DEFAULT '{}',
  fingerprint TEXT NOT NULL DEFAULT '',
  validation_status TEXT NOT NULL DEFAULT 'unvalidated',
  validation_messages_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(import_file_id, row_number),
  FOREIGN KEY(import_file_id) REFERENCES admin_import_files(id)
);

CREATE TABLE IF NOT EXISTS canonical_financial_events (
  id TEXT PRIMARY KEY,
  asset_id TEXT,
  ticker TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'unknown',
  event_type TEXT NOT NULL CHECK(event_type IN ('dividend','jcp','fii_income','amortization','bonus','subscription','other')),
  announcement_date TEXT,
  record_date TEXT,
  ex_date TEXT,
  payment_date TEXT,
  amount_per_unit TEXT,
  gross_amount TEXT,
  net_amount TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  financial_status TEXT NOT NULL CHECK(financial_status IN ('announced','provisioned','confirmed','estimated','projected','paid','cancelled')),
  recurrence TEXT NOT NULL DEFAULT 'unknown' CHECK(recurrence IN ('monthly','quarterly','semiannual','annual','irregular','extraordinary','unknown')),
  source_type TEXT NOT NULL CHECK(source_type IN ('b3_file','brapi','manual','official_document')),
  source_id TEXT,
  source_name TEXT NOT NULL,
  source_reference TEXT,
  confidence TEXT NOT NULL CHECK(confidence IN ('official','verified','reliable_external','derived','estimated','unknown')),
  ingestion_status TEXT NOT NULL DEFAULT 'queued' CHECK(ingestion_status IN ('queued','processing','processed','failed')),
  validation_status TEXT NOT NULL DEFAULT 'unvalidated' CHECK(validation_status IN ('unvalidated','valid','warning','invalid','blocked')),
  review_status TEXT NOT NULL DEFAULT 'pending_review' CHECK(review_status IN ('pending_review','approved','rejected')),
  publication_status TEXT NOT NULL DEFAULT 'draft' CHECK(publication_status IN ('draft','published','archived','superseded')),
  public_visibility INTEGER NOT NULL DEFAULT 0,
  data_quality_score INTEGER NOT NULL DEFAULT 0,
  opportunity_score INTEGER NOT NULL DEFAULT 0,
  dedupe_key TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(asset_id) REFERENCES assets(id)
);

CREATE TABLE IF NOT EXISTS financial_event_sources (
  id TEXT PRIMARY KEY,
  canonical_event_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  source_name TEXT NOT NULL,
  source_priority INTEGER NOT NULL DEFAULT 999,
  raw_payload_json TEXT NOT NULL DEFAULT '{}',
  normalized_payload_json TEXT NOT NULL DEFAULT '{}',
  observed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(canonical_event_id) REFERENCES canonical_financial_events(id)
);

CREATE TABLE IF NOT EXISTS brapi_responses (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  batch_no INTEGER NOT NULL DEFAULT 0,
  symbols_json TEXT NOT NULL DEFAULT '[]',
  endpoint TEXT NOT NULL,
  response_hash TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_reconciliation_cases (
  id TEXT PRIMARY KEY,
  canonical_event_id TEXT,
  b3_source_id TEXT,
  brapi_source_id TEXT,
  classification TEXT NOT NULL CHECK(classification IN ('exact_match','probable_match','new_b3_event','new_brapi_event','value_divergence','date_divergence','status_divergence','possible_duplicate','unmatched')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK(severity IN ('info','warning','error','publication_blocker')),
  fields_json TEXT NOT NULL DEFAULT '{}',
  decision TEXT NOT NULL DEFAULT 'pending' CHECK(decision IN ('pending','use_b3','use_brapi','merge','reject','keep_pending')),
  justification TEXT NOT NULL DEFAULT '',
  decided_by_user_id TEXT,
  decided_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(canonical_event_id) REFERENCES canonical_financial_events(id)
);

CREATE TABLE IF NOT EXISTS publication_batches (
  id TEXT PRIMARY KEY,
  operator_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','publishing','published','failed','rolled_back')),
  version_label TEXT NOT NULL,
  checksum TEXT NOT NULL DEFAULT '',
  summary_json TEXT NOT NULL DEFAULT '{}',
  item_count INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  rolled_back_at TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(operator_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS publication_batch_items (
  id TEXT PRIMARY KEY,
  publication_batch_id TEXT NOT NULL,
  canonical_event_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('publish','update','archive','cancel')),
  before_json TEXT,
  after_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(publication_batch_id, canonical_event_id),
  FOREIGN KEY(publication_batch_id) REFERENCES publication_batches(id),
  FOREIGN KEY(canonical_event_id) REFERENCES canonical_financial_events(id)
);

CREATE TABLE IF NOT EXISTS published_event_cache (
  id TEXT PRIMARY KEY,
  canonical_event_id TEXT NOT NULL UNIQUE,
  public_id TEXT NOT NULL UNIQUE,
  payload_json TEXT NOT NULL,
  version_label TEXT NOT NULL,
  checksum TEXT NOT NULL,
  public_visibility INTEGER NOT NULL DEFAULT 1,
  capturable INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(canonical_event_id) REFERENCES canonical_financial_events(id)
);

CREATE TABLE IF NOT EXISTS captured_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  public_event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','updated','cancelled','archived')),
  alert_rules_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, public_event_id),
  FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_import_files_status ON admin_import_files(ingestion_status, validation_status, review_status, publication_status, created_at);
CREATE INDEX IF NOT EXISTS idx_raw_import_rows_file ON raw_import_rows(import_file_id, row_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_financial_events_dedupe ON canonical_financial_events(dedupe_key);
CREATE INDEX IF NOT EXISTS idx_canonical_events_public ON canonical_financial_events(publication_status, public_visibility, payment_date);
CREATE INDEX IF NOT EXISTS idx_event_sources_event ON financial_event_sources(canonical_event_id, source_type);
CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON event_reconciliation_cases(decision, severity, created_at);
CREATE INDEX IF NOT EXISTS idx_publication_batches_status ON publication_batches(status, created_at);
CREATE INDEX IF NOT EXISTS idx_published_event_cache_visibility ON published_event_cache(public_visibility, published_at);
