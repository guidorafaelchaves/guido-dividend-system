INSERT OR IGNORE INTO assets(id,ticker,name,type,sector,currency,status,source_id) VALUES
  ('asset_dev_knri11','KNRI11','Kinea Renda Imobiliaria FII','FII','Hibrido','BRL','active','demo'),
  ('asset_dev_itsa4','ITSA4','Itausa PN','Acao','Holdings','BRL','active','demo');

INSERT OR IGNORE INTO financial_events(id,asset_id,kind,status,amount_cents,currency,ex_date,payment_date,source,ingest_state,confidence,dedupe_key) VALUES
  ('evt_dev_knri11_2026_08','asset_dev_knri11','rendimento','estimated',95,'BRL','2026-08-01','2026-08-14','demo','published','estimated','asset_dev_knri11|rendimento|2026-08-01|2026-08-14|95|demo');
