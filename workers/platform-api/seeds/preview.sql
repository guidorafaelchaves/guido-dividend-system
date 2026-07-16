INSERT OR IGNORE INTO data_sources(id,name,kind,trust_level) VALUES
  ('preview_seed','Preview Seed','fixture','demo');

INSERT OR IGNORE INTO assets(id,ticker,name,type,sector,currency,status,source_id) VALUES
  ('asset_preview_knri11','KNRI11','Kinea Renda Imobiliaria FII','FII','Hibrido','BRL','active','preview_seed');
