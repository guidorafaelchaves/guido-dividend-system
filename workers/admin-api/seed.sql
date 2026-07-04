INSERT OR IGNORE INTO users(id,email,plan,created_at) VALUES
  ('u_001','cliente1@example.com','pro',datetime('now','-70 day')),
  ('u_002','cliente2@example.com','pro',datetime('now','-55 day')),
  ('u_003','cliente3@example.com','trial',datetime('now','-12 day')),
  ('u_004','cliente4@example.com','pro',datetime('now','-95 day')),
  ('u_005','cliente5@example.com','trial',datetime('now','-6 day'));

INSERT INTO subscriptions(user_id,status,mrr_brl,started_at,canceled_at) VALUES
  ('u_001','active',39.90,datetime('now','-65 day'),NULL),
  ('u_002','active',39.90,datetime('now','-50 day'),NULL),
  ('u_003','trial',0,datetime('now','-12 day'),NULL),
  ('u_004','active',79.90,datetime('now','-90 day'),NULL),
  ('u_005','trial',0,datetime('now','-6 day'),NULL);

INSERT INTO user_activity(user_id,activity_date,event_name) VALUES
  ('u_001',date('now'),'dashboard_open'),
  ('u_002',date('now'),'dashboard_open'),
  ('u_004',date('now'),'admin_metric'),
  ('u_001',date('now','-4 day'),'b3_import'),
  ('u_002',date('now','-7 day'),'radar_open'),
  ('u_003',date('now','-8 day'),'signup'),
  ('u_004',date('now','-12 day'),'yield_open'),
  ('u_001',date('now','-19 day'),'dashboard_open'),
  ('u_002',date('now','-21 day'),'dashboard_open'),
  ('u_004',date('now','-24 day'),'dashboard_open');

INSERT INTO usage_events(user_id,kind,quantity,cost_brl,created_at,source) VALUES
  ('u_001','brapi_call',1400,38.20,datetime('now','-2 day'),'worker'),
  ('u_002','brapi_call',1180,32.10,datetime('now','-4 day'),'worker'),
  ('u_004','brapi_call',2300,61.50,datetime('now','-5 day'),'worker'),
  ('u_001','ai_tokens',880000,126.40,datetime('now','-2 day'),'ai-gateway'),
  ('u_002','ai_tokens',540000,77.30,datetime('now','-3 day'),'ai-gateway'),
  ('u_004','ai_tokens',1220000,174.60,datetime('now','-6 day'),'ai-gateway'),
  ('system','cloud_request',48000,34.90,datetime('now','-3 day'),'cloudflare');

INSERT INTO cost_events(category,amount_brl,created_at,source,note) VALUES
  ('brapi',131.80,datetime('now','-2 day'),'manual','Consumo mensal parcial Brapi'),
  ('ai',378.30,datetime('now','-2 day'),'manual','Tokens IA embutida'),
  ('cloud',64.90,datetime('now','-2 day'),'manual','Cloudflare Workers/D1'),
  ('support',90.00,datetime('now','-2 day'),'manual','Suporte operacional'),
  ('payment',18.30,datetime('now','-2 day'),'manual','Gateway de pagamento');
