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
