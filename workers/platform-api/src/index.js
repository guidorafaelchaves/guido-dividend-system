const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const PLAN_LIMITS = Object.freeze({
  public: { watchlistAssets: 0, portfolios: 0, alerts: 0, historicalMonths: 0, advancedReports: false, aiAnalysis: false },
  free: { watchlistAssets: 20, portfolios: 1, alerts: 5, historicalMonths: 12, advancedReports: false, aiAnalysis: false },
  dividend_system: { watchlistAssets: 200, portfolios: 5, alerts: 50, historicalMonths: 120, advancedReports: true, aiAnalysis: true },
  family_office: { watchlistAssets: 1000, portfolios: 25, alerts: 250, historicalMonths: 240, advancedReports: true, aiAnalysis: true }
});

const ROLE_PERMISSIONS = Object.freeze({
  visitor: ['public:read'],
  free_user: ['public:read', 'profile:manage', 'watchlist:manage', 'favorites:manage', 'portfolio:manage', 'alerts:manage'],
  subscriber: ['public:read', 'profile:manage', 'watchlist:manage', 'favorites:manage', 'portfolio:manage', 'alerts:manage', 'reports:advanced'],
  premium_user: ['public:read', 'profile:manage', 'watchlist:manage', 'favorites:manage', 'portfolio:manage', 'alerts:manage', 'reports:advanced', 'ai:analysis'],
  admin: ['admin:users', 'admin:plans', 'admin:audit', 'admin:sync', 'import:create', 'import:process', 'brapi:sync', 'event:review', 'event:edit', 'event:approve', 'publication:publish', 'publication:rollback', 'source:manage'],
  owner: ['admin:users', 'admin:plans', 'admin:audit', 'admin:sync', 'admin:integrations', 'import:create', 'import:process', 'brapi:sync', 'event:review', 'event:edit', 'event:approve', 'publication:publish', 'publication:rollback', 'source:manage', 'settings:manage']
});

function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...cors } });
}

function bad(message, status = 400, cors = {}, details) {
  return json({ error: message, details }, status, cors);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
  const defaults = ['https://guidorafaelchaves.github.io', 'https://guido-dividend-system.pages.dev', 'http://localhost:4173'];
  const isPreview = /^https:\/\/[a-z0-9-]+\.guido-dividend-system\.pages\.dev$/i.test(origin);
  if (!origin || (![...defaults, ...allowed].includes(origin) && !isPreview)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-max-age': '86400',
    vary: 'origin'
  };
}

function b64url(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(value) {
  const raw = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
}

function uuid(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeTicker(ticker) {
  return String(ticker || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
}

function requireEmail(email) {
  const clean = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error('E-mail invalido.');
  return clean;
}

function requirePassword(password) {
  const value = String(password || '');
  if (value.length < 10) throw new Error('A senha precisa ter pelo menos 10 caracteres.');
  return value;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
}

async function sha256(value) {
  return b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function hashPassword(password, env) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = Number(env.PBKDF2_ITERATIONS || 60000);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${b64url(salt)}$${b64url(bits)}`;
}

async function verifyPassword(password, encoded) {
  const [scheme, iterRaw, saltRaw, hashRaw] = String(encoded || '').split('$');
  if (scheme !== 'pbkdf2') return false;
  const iterations = Number(iterRaw);
  const salt = fromB64url(saltRaw);
  const expected = fromB64url(hashRaw);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, expected.byteLength * 8);
  const actual = new Uint8Array(bits);
  if (actual.byteLength !== expected.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < actual.byteLength; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function signSession(env, claims) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const body = `${header}.${payload}`;
  const signature = b64url(await hmac(env.SESSION_SECRET, body));
  return `${body}.${signature}`;
}

async function verifySession(env, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !env.SESSION_SECRET) return null;
  const body = `${parts[0]}.${parts[1]}`;
  const signature = b64url(await hmac(env.SESSION_SECRET, body));
  if (signature !== parts[2]) return null;
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  if (!claims.exp || Date.now() > claims.exp) return null;
  return claims;
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

async function userRoles(db, userId) {
  const { results } = await db.prepare('SELECT role_id FROM user_roles WHERE user_id=?').bind(userId).all();
  return (results || []).map(row => row.role_id);
}

function permissionsForRoles(roles) {
  return [...new Set((roles || []).flatMap(role => ROLE_PERMISSIONS[role] || []))];
}

async function currentSubscription(db, userId) {
  const sub = await db.prepare(`
    SELECT s.*, p.limits_json
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.user_id=? AND s.status IN ('trialing','active','past_due')
    ORDER BY s.started_at DESC
    LIMIT 1
  `).bind(userId).first();
  return sub || { plan_id: 'free', status: 'active', limits_json: JSON.stringify(PLAN_LIMITS.free) };
}

async function requireUser(request, env, cors) {
  const claims = await verifySession(env, bearer(request));
  if (!claims?.sub) return { response: bad('Unauthorized', 401, cors) };
  const user = await env.DB.prepare('SELECT id,email,status,created_at FROM users WHERE id=? AND deleted_at IS NULL').bind(claims.sub).first();
  if (!user || user.status === 'locked') return { response: bad('Unauthorized', 401, cors) };
  const roles = await userRoles(env.DB, user.id);
  const subscription = await currentSubscription(env.DB, user.id);
  return { user, roles, permissions: permissionsForRoles(roles), subscription };
}

async function requireAdmin(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard;
  if (!guard.roles.includes('admin') && !guard.roles.includes('owner')) {
    return { response: bad('Forbidden', 403, cors) };
  }
  return guard;
}

async function audit(env, input) {
  await env.DB.prepare(`
    INSERT INTO audit_logs(id,user_id,actor_user_id,action,entity_type,entity_id,before_json,after_json,request_id,ip_hash)
    VALUES(?,?,?,?,?,?,?,?,?,?)
  `).bind(
    uuid('audit'),
    input.userId || null,
    input.actorUserId || input.userId || null,
    input.action,
    input.entityType,
    input.entityId || null,
    input.before ? JSON.stringify(input.before) : null,
    input.after ? JSON.stringify(input.after) : null,
    input.requestId || null,
    input.ipHash || null
  ).run();
}

async function operationalLog(env, input) {
  await env.DB.prepare(`
    INSERT INTO data_change_logs(id,entity_type,entity_id,change_type,source,before_json,after_json,job_id)
    VALUES(?,?,?,?,?,?,?,?)
  `).bind(
    uuid('dcl'),
    input.entityType || 'system',
    input.entityId || 'platform',
    input.changeType || input.level || 'info',
    input.source || 'platform-api',
    input.before ? JSON.stringify(input.before) : null,
    input.after ? JSON.stringify(input.after) : null,
    input.jobId || null
  ).run();
}

async function rateLimit(request, env, scope, limit, windowSeconds) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
  const keyHash = await sha256(`${scope}:${ip}`);
  const windowStart = new Date(Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000).toISOString();
  const id = uuid('rle');
  await env.DB.prepare(`
    INSERT INTO rate_limit_events(id,scope,key_hash,event_count,window_start)
    VALUES(?,?,?,?,?)
    ON CONFLICT(scope,key_hash,window_start)
    DO UPDATE SET event_count=event_count+1
  `).bind(id, scope, keyHash, 1, windowStart).run();
  const row = await env.DB.prepare('SELECT event_count FROM rate_limit_events WHERE scope=? AND key_hash=? AND window_start=?')
    .bind(scope, keyHash, windowStart).first();
  return Number(row?.event_count || 0) <= limit;
}

async function ensureAsset(db, ticker) {
  const clean = normalizeTicker(ticker);
  if (!clean) throw new Error('Ticker ausente.');
  const existing = await db.prepare('SELECT * FROM assets WHERE ticker=?').bind(clean).first();
  if (existing) return existing;
  const id = `asset_${clean.toLowerCase()}`;
  await db.prepare(`
    INSERT INTO assets(id,ticker,name,type,sector,currency,status,source_id)
    VALUES(?,?,?,?,?,?,?,?)
  `).bind(id, clean, clean, 'Ativo', '', 'BRL', 'active', 'admin').run();
  return db.prepare('SELECT * FROM assets WHERE id=?').bind(id).first();
}

function emailTemplate(kind, input) {
  const title = {
    verification: 'Verifique sua conta',
    password_reset: 'Recuperacao de acesso',
    welcome: 'Bem-vindo ao Radar de Proventos',
    alert: 'Novo alerta da sua carteira',
    payment_reminder: 'Pagamento proximo'
  }[kind] || 'Radar de Proventos';
  return {
    subject: title,
    text: `${title}\n\n${input.message || 'Acesse a plataforma para continuar.'}\n\nEste e-mail faz parte da operacao da Guido Financial Platform. Se voce nao solicitou, ignore esta mensagem.`
  };
}

async function sendEmail(env, input) {
  const enabled = String(env.EMAIL_ENABLED || 'false') === 'true';
  const recipientHash = input.to ? await sha256(input.to) : '';
  const template = emailTemplate(input.kind, input);
  if (!enabled) {
    await env.DB.prepare(`
      INSERT INTO email_delivery_logs(id,user_id,kind,provider,recipient_hash,status,metadata_json)
      VALUES(?,?,?,?,?,?,?)
    `).bind(uuid('eml'), input.userId || null, input.kind, 'disabled', recipientHash, 'disabled', JSON.stringify({ subject: template.subject })).run();
    return { sent: false, disabled: true };
  }
  if (!env.EMAIL_API_KEY) throw new Error('EMAIL_API_KEY ausente.');
  await env.DB.prepare(`
    INSERT INTO email_delivery_logs(id,user_id,kind,provider,recipient_hash,status,metadata_json)
    VALUES(?,?,?,?,?,?,?)
  `).bind(uuid('eml'), input.userId || null, input.kind, env.EMAIL_PROVIDER || 'generic', recipientHash, 'queued', JSON.stringify({ subject: template.subject })).run();
  return { sent: false, queued: true };
}

async function createEmailVerification(env, userId, email) {
  const raw = uuid('verify');
  const tokenHash = await sha256(raw);
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  await env.DB.prepare('INSERT INTO email_verification_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)')
    .bind(uuid('evt'), userId, tokenHash, expires).run();
  await sendEmail(env, { userId, to: email, kind: 'verification', message: 'Confirme seu e-mail para reforcar a seguranca da conta. Link de teste deve ser construido pelo frontend autorizado.' });
}

function planLimits(subscription) {
  try { return JSON.parse(subscription?.limits_json || '{}'); } catch { return PLAN_LIMITS.free; }
}

async function enforceLimit(db, userId, subscription, kind, currentCount) {
  const limits = planLimits(subscription);
  const max = Number(limits[kind] ?? 0);
  if (max >= 0 && currentCount >= max) {
    throw new Error(`Limite do plano atingido para ${kind}.`);
  }
}

async function handleRegister(request, env, cors) {
  if (!(await rateLimit(request, env, 'auth_register', 8, 3600))) return bad('Muitas tentativas. Tente novamente mais tarde.', 429, cors);
  const body = await request.json().catch(() => ({}));
  const email = requireEmail(body.email);
  const password = requirePassword(body.password);
  const displayName = String(body.displayName || '').trim().slice(0, 120);
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email=?').bind(email).first();
  if (existing) return bad('E-mail ja cadastrado.', 409, cors);
  const userId = uuid('usr');
  const passwordHash = await hashPassword(password, env);
  const subId = uuid('sub');
  await env.DB.prepare('INSERT INTO users(id,email,password_hash,status) VALUES(?,?,?,?)').bind(userId, email, passwordHash, 'active').run();
  await env.DB.prepare('INSERT INTO profiles(user_id,display_name) VALUES(?,?)').bind(userId, displayName).run();
  await env.DB.prepare('INSERT INTO user_preferences(user_id,consent_json) VALUES(?,?)').bind(userId, JSON.stringify({ termsDraftAcceptedAt: new Date().toISOString() })).run();
  await env.DB.prepare('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)').bind(userId, 'free_user').run();
  await env.DB.prepare('INSERT INTO subscriptions(id,user_id,plan_id,status,cycle,provider) VALUES(?,?,?,?,?,?)').bind(subId, userId, 'free', 'active', 'monthly', 'internal').run();
  await env.DB.prepare('INSERT INTO watchlists(id,user_id,name) VALUES(?,?,?)').bind(uuid('wl'), userId, 'Minha watchlist').run();
  await env.DB.prepare('INSERT INTO notifications(id,user_id,title,body,status) VALUES(?,?,?,?,?)').bind(uuid('ntf'), userId, 'Conta criada', 'Sua conta gratuita ja pode salvar favoritos, watchlist e carteira.', 'unread').run();
  await createEmailVerification(env, userId, email);
  await audit(env, { userId, action: 'auth.register', entityType: 'user', entityId: userId, after: { email } });
  return createSession(env, cors, userId, email);
}

async function createSession(env, cors, userId, email) {
  const roles = await userRoles(env.DB, userId);
  const now = Date.now();
  const exp = now + Number(env.SESSION_TTL_MINUTES || 480) * 60 * 1000;
  const token = await signSession(env, { sub: userId, email, roles, iat: now, exp });
  return json({ token, expiresAt: exp, user: { id: userId, email, roles } }, 200, cors);
}

async function handleLogin(request, env, cors) {
  if (!(await rateLimit(request, env, 'auth_login', 20, 900))) return bad('Muitas tentativas. Tente novamente mais tarde.', 429, cors);
  const body = await request.json().catch(() => ({}));
  const email = requireEmail(body.email);
  const user = await env.DB.prepare('SELECT * FROM users WHERE email=? AND deleted_at IS NULL').bind(email).first();
  if (!user || !(await verifyPassword(String(body.password || ''), user.password_hash))) {
    return bad('Credenciais invalidas.', 401, cors);
  }
  await audit(env, { userId: user.id, action: 'auth.login', entityType: 'user', entityId: user.id });
  return createSession(env, cors, user.id, user.email);
}

async function handlePasswordResetRequest(request, env, cors) {
  if (!(await rateLimit(request, env, 'password_reset', 6, 3600))) return bad('Muitas tentativas. Tente novamente mais tarde.', 429, cors);
  const body = await request.json().catch(() => ({}));
  const email = normalizeEmail(body.email);
  const user = await env.DB.prepare('SELECT id FROM users WHERE email=? AND deleted_at IS NULL').bind(email).first();
  if (user) {
    const raw = uuid('reset');
    const tokenHash = await sha256(raw);
    const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();
    await env.DB.prepare('INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)')
      .bind(uuid('prt'), user.id, tokenHash, expires).run();
    await sendEmail(env, { userId: user.id, to: email, kind: 'password_reset', message: 'Foi solicitada uma recuperacao de acesso. O link deve expirar em 30 minutos.' });
    await audit(env, { userId: user.id, action: 'auth.password_reset_requested', entityType: 'user', entityId: user.id });
  }
  return json({ ok: true, message: 'Se o e-mail existir, um fluxo de recuperacao sera iniciado. Envio externo depende da integracao de e-mail.' }, 200, cors);
}

async function healthDb(env, cors) {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table'").first();
  const lastJob = await env.DB.prepare('SELECT job_name,status,finished_at FROM job_runs ORDER BY created_at DESC LIMIT 1').first();
  return json({ ok: true, db: 'reachable', tables: Number(row?.total || 0), lastJob: lastJob || null }, 200, cors);
}

async function healthIntegrations(env, cors) {
  return json({
    ok: true,
    integrations: {
      email: { enabled: String(env.EMAIL_ENABLED || 'false') === 'true', provider: env.EMAIL_PROVIDER || 'disabled' },
      billing: { enabled: String(env.BILLING_ENABLED || 'false') === 'true', provider: env.BILLING_PROVIDER || 'disabled' },
      brapi: { enabled: String(env.BRAPI_SYNC_ENABLED || 'false') === 'true' }
    }
  }, 200, cors);
}

async function startJob(env, jobName) {
  const id = uuid('job');
  await env.DB.prepare('INSERT INTO job_runs(id,job_name,status) VALUES(?,?,?)').bind(id, jobName, 'running').run();
  return id;
}

async function finishJob(env, id, status, itemsProcessed = 0, itemsFailed = 0, errorMessage = '') {
  await env.DB.prepare(`
    UPDATE job_runs
    SET status=?, items_processed=?, items_failed=?, finished_at=datetime('now'),
        duration_ms=CAST((julianday('now') - julianday(started_at)) * 86400000 AS INTEGER),
        error_message=?
    WHERE id=?
  `).bind(status, itemsProcessed, itemsFailed, errorMessage, id).run();
}

async function syncQuotes(env, limit = 10) {
  const jobId = await startJob(env, 'sync_quotes');
  let processed = 0;
  let failed = 0;
  try {
    const { results } = await env.DB.prepare('SELECT id,ticker FROM assets WHERE status=? ORDER BY updated_at ASC LIMIT ?').bind('active', limit).all();
    if (String(env.BRAPI_SYNC_ENABLED || 'false') !== 'true' || !env.BRAPI_TOKEN) {
      await operationalLog(env, { level: 'warn', entityType: 'job', entityId: jobId, changeType: 'sync_quotes_disabled', source: 'sync_quotes', after: { reason: 'BRAPI_SYNC_ENABLED false or token missing' }, jobId });
      await finishJob(env, jobId, 'partial', 0, 0, 'BRAPI sync disabled or token missing');
      return { jobId, status: 'partial', processed: 0 };
    }
    for (const asset of results || []) {
      try {
        const qs = new URLSearchParams({ token: env.BRAPI_TOKEN, fundamental: 'true' });
        const upstream = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(asset.ticker)}?${qs.toString()}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
        if (!upstream.ok) throw new Error(`BRAPI HTTP ${upstream.status}`);
        const payload = await upstream.json();
        const quote = payload?.results?.[0];
        const price = Number(quote?.regularMarketPrice || 0);
        if (!(price > 0)) throw new Error('BRAPI sem preco valido');
        const priceCents = Math.round(price * 100);
        const previous = await env.DB.prepare('SELECT price_cents FROM asset_quotes WHERE asset_id=? ORDER BY quoted_at DESC LIMIT 1').bind(asset.id).first();
        const quoteId = uuid('aqt');
        const quotedAt = new Date().toISOString();
        await env.DB.batch([
          env.DB.prepare('INSERT OR IGNORE INTO asset_quotes(id,asset_id,price_cents,currency,source,quoted_at) VALUES(?,?,?,?,?,?)').bind(quoteId, asset.id, priceCents, quote.currency || 'BRL', 'brapi', quotedAt),
          env.DB.prepare('INSERT INTO asset_quote_history(id,asset_id,previous_price_cents,next_price_cents,currency,source,quality,job_id,quoted_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(uuid('aqh'), asset.id, previous?.price_cents || null, priceCents, quote.currency || 'BRL', 'brapi', 'reliable_external', jobId, quotedAt)
        ]);
        processed++;
      } catch (err) {
        failed++;
        await operationalLog(env, { level: 'error', entityType: 'asset', entityId: asset.id, changeType: 'quote_sync_failed', source: 'brapi', after: { message: err.message }, jobId });
      }
    }
    await finishJob(env, jobId, failed ? 'partial' : 'success', processed, failed);
    return { jobId, status: failed ? 'partial' : 'success', processed, failed };
  } catch (err) {
    await finishJob(env, jobId, 'failed', processed, failed, err.message);
    throw err;
  }
}

async function evaluateAlerts(env) {
  const jobId = await startJob(env, 'evaluate_alerts');
  let processed = 0;
  try {
    const { results } = await env.DB.prepare(`
      SELECT al.id,al.user_id,al.asset_id,al.type,a.ticker
      FROM alerts al
      LEFT JOIN assets a ON a.id=al.asset_id
      WHERE al.status='active'
      LIMIT 100
    `).all();
    for (const alert of results || []) {
      const notificationId = uuid('ntf');
      await env.DB.prepare(`
        INSERT OR IGNORE INTO notifications(id,user_id,title,body,status,entity_type,entity_id)
        VALUES(?,?,?,?,?,?,?)
      `).bind(notificationId, alert.user_id, 'Alerta avaliado', `${alert.ticker || 'Sua carteira'} possui uma regra ativa: ${alert.type}.`, 'unread', 'alert', alert.id).run();
      await env.DB.prepare("UPDATE alerts SET last_evaluated_at=datetime('now'), last_notified_at=datetime('now') WHERE id=?").bind(alert.id).run();
      processed++;
    }
    await finishJob(env, jobId, 'success', processed, 0);
    return { jobId, status: 'success', processed };
  } catch (err) {
    await finishJob(env, jobId, 'failed', processed, 0, err.message);
    throw err;
  }
}

async function cleanupExpiredTokens(env) {
  const jobId = await startJob(env, 'cleanup_expired_tokens');
  const a = await env.DB.prepare("UPDATE password_reset_tokens SET used_at=COALESCE(used_at, datetime('now')) WHERE used_at IS NULL AND datetime(expires_at) < datetime('now')").run();
  const b = await env.DB.prepare("UPDATE email_verification_tokens SET used_at=COALESCE(used_at, datetime('now')) WHERE used_at IS NULL AND datetime(expires_at) < datetime('now')").run();
  const total = Number(a.meta?.changes || 0) + Number(b.meta?.changes || 0);
  await finishJob(env, jobId, 'success', total, 0);
  return { jobId, status: 'success', processed: total };
}

const ADMIN_EVENT_STATES = Object.freeze({
  ingestion: ['queued', 'processing', 'processed', 'failed'],
  validation: ['unvalidated', 'valid', 'warning', 'invalid', 'blocked'],
  review: ['pending_review', 'approved', 'rejected'],
  publication: ['draft', 'published', 'archived', 'superseded'],
  financial: ['announced', 'provisioned', 'confirmed', 'estimated', 'projected', 'paid', 'cancelled']
});

const B3_RADAR_ALIASES = Object.freeze({
  ticker: ['ticker', 'codigo negociacao', 'codigo do ativo', 'ativo', 'cod negociacao', 'codneg'],
  isin: ['isin'],
  assetName: ['nome do ativo', 'nome', 'emissor', 'empresa'],
  assetType: ['tipo do ativo', 'classe', 'mercado'],
  eventType: ['tipo provento', 'tipo de provento', 'evento', 'tipo evento'],
  announcementDate: ['data anuncio', 'data do anuncio', 'data de anuncio'],
  recordDate: ['data com', 'data-com', 'data base', 'data de corte', 'ultimo dia com'],
  exDate: ['data ex', 'data-ex', 'ex data'],
  paymentDate: ['data pagamento', 'data de pagamento', 'pagamento', 'data credito'],
  amountPerUnit: ['valor bruto', 'valor bruto por unidade', 'valor por unidade', 'valor unitario', 'valor'],
  netAmount: ['valor liquido', 'valor liquido por unidade'],
  currency: ['moeda'],
  financialStatus: ['status', 'situacao', 'situacao do credito'],
  externalEventCode: ['codigo do evento', 'id evento'],
  notes: ['observacao', 'observacoes'],
  referenceDate: ['data de referencia', 'referencia']
});

const B3_IMPORT_PROFILES = Object.freeze([
  { id: 'b3_radar_proventos', name: 'B3 - Radar de Proventos', implemented: true, aliases: B3_RADAR_ALIASES },
  { id: 'b3_eventos_corporativos', name: 'B3 - Eventos Corporativos', implemented: false, aliases: {} },
  { id: 'b3_dividendos_jcp', name: 'B3 - Dividendos e JCP', implemented: false, aliases: {} },
  { id: 'b3_rendimentos', name: 'B3 - Rendimentos', implemented: false, aliases: {} },
  { id: 'b3_amortizacoes', name: 'B3 - Amortizacoes', implemented: false, aliases: {} },
  { id: 'b3_cadastro_instrumentos', name: 'B3 - Cadastro de Instrumentos', implemented: false, aliases: {} }
]);

function normalizeHeader(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function safeFilename(name) {
  return String(name || 'arquivo')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || 'arquivo';
}

function detectDelimiter(text) {
  const sample = String(text || '').split(/\r?\n/).slice(0, 5).join('\n');
  const candidates = [';', ',', '\t', '|'];
  return candidates.map(delimiter => ({ delimiter, count: sample.split(delimiter).length - 1 }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ';';
}

function splitCsvLine(line, delimiter) {
  const out = [];
  let current = '';
  let quoted = false;
  for (const ch of String(line || '')) {
    if (ch === '"') quoted = !quoted;
    else if (ch === delimiter && !quoted) {
      out.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else current += ch;
  }
  out.push(current.trim().replace(/^"|"$/g, ''));
  return out;
}

function parseDelimitedPreview(text, limit = 20) {
  const delimiter = detectDelimiter(text);
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim()).slice(0, limit + 1);
  const headers = splitCsvLine(lines[0] || '', delimiter);
  const rows = lines.slice(1).map(line => {
    const cells = splitCsvLine(line, delimiter);
    return headers.reduce((acc, header, index) => ({ ...acc, [header]: cells[index] || '' }), {});
  });
  return { delimiter, headers, rows };
}

function mapHeaders(headers, profile = B3_IMPORT_PROFILES[0]) {
  const normalized = (headers || []).map(header => ({ original: header, normalized: normalizeHeader(header) }));
  const mapping = {};
  const aliases = profile.aliases || {};
  for (const [field, fieldAliases] of Object.entries(aliases)) {
    const found = normalized.find(header => fieldAliases.map(normalizeHeader).includes(header.normalized));
    if (found) mapping[field] = found.original;
  }
  return mapping;
}

function detectB3Profile(input) {
  const parsed = parseDelimitedPreview(input.contentText || '');
  const profile = B3_IMPORT_PROFILES[0];
  const mapping = mapHeaders(parsed.headers, profile);
  const required = ['ticker', 'eventType', 'recordDate', 'exDate', 'paymentDate', 'amountPerUnit'];
  const recognized = Object.keys(mapping).length;
  const requiredFound = required.filter(field => mapping[field]).length;
  const confidence = Math.min(99, Math.round((recognized / Math.max(1, Object.keys(profile.aliases).length)) * 45 + (requiredFound / required.length) * 55));
  return {
    profile: profile.id,
    profileName: profile.name,
    confidence,
    delimiter: parsed.delimiter,
    headers: parsed.headers,
    previewRows: parsed.rows.slice(0, 8),
    mapping,
    recognizedFields: recognized,
    requiredFields: required.length,
    missingRequired: required.filter(field => !mapping[field])
  };
}

function parseBrazilianDecimal(value) {
  const clean = String(value || '').replace(/[R$\s.]/g, '').replace(',', '.');
  const number = Number(clean);
  return Number.isFinite(number) ? number : null;
}

function normalizeDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const br = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (br) {
    const year = br[3].length === 2 ? `20${br[3]}` : br[3];
    return `${year}-${br[2].padStart(2, '0')}-${br[1].padStart(2, '0')}`;
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? raw.slice(0, 10) : '';
}

function mapEventType(value) {
  const clean = normalizeHeader(value);
  if (clean.includes('jcp') || clean.includes('juros')) return 'jcp';
  if (clean.includes('rendimento')) return 'fii_income';
  if (clean.includes('amort')) return 'amortization';
  if (clean.includes('bonus') || clean.includes('bonific')) return 'bonus';
  if (clean.includes('subscr')) return 'subscription';
  if (clean.includes('dividend')) return 'dividend';
  return 'other';
}

function mapFinancialStatus(value) {
  const clean = normalizeHeader(value);
  if (clean.includes('cancel')) return 'cancelled';
  if (clean.includes('pago') || clean.includes('credit')) return 'paid';
  if (clean.includes('confirm')) return 'confirmed';
  if (clean.includes('provision')) return 'provisioned';
  if (clean.includes('anunci')) return 'announced';
  if (clean.includes('estim')) return 'estimated';
  return 'announced';
}

function canonicalFingerprint(event) {
  return [event.ticker, event.eventType, event.amountPerUnit || '', event.recordDate || '', event.exDate || '', event.paymentDate || '', event.sourceType, event.sourceReference || '']
    .map(item => String(item || '').toLowerCase())
    .join('|');
}

function normalizeB3RadarRow(row, mapping) {
  const read = field => row[mapping[field]] || '';
  const amount = parseBrazilianDecimal(read('amountPerUnit'));
  const ticker = normalizeTicker(read('ticker'));
  const event = {
    ticker,
    assetType: String(read('assetType') || '').slice(0, 80) || 'unknown',
    eventType: mapEventType(read('eventType')),
    announcementDate: normalizeDate(read('announcementDate')),
    recordDate: normalizeDate(read('recordDate')),
    exDate: normalizeDate(read('exDate')),
    paymentDate: normalizeDate(read('paymentDate')),
    amountPerUnit: amount === null ? '' : String(amount),
    grossAmount: amount === null ? '' : String(amount),
    netAmount: parseBrazilianDecimal(read('netAmount')) === null ? '' : String(parseBrazilianDecimal(read('netAmount'))),
    currency: String(read('currency') || 'BRL').slice(0, 8),
    financialStatus: mapFinancialStatus(read('financialStatus')),
    recurrence: 'unknown',
    sourceType: 'b3_file',
    sourceName: 'B3 - Radar de Proventos',
    sourceReference: read('externalEventCode') || '',
    confidence: 'official',
    ingestionStatus: 'processed',
    validationStatus: 'valid',
    reviewStatus: 'pending_review',
    publicationStatus: 'draft',
    publicVisibility: false
  };
  event.dedupeKey = canonicalFingerprint(event);
  const messages = [];
  if (!event.ticker) messages.push({ level: 'publication_blocker', field: 'ticker', message: 'Ativo ausente.' });
  if (!event.eventType) messages.push({ level: 'publication_blocker', field: 'eventType', message: 'Tipo ausente.' });
  if (!event.paymentDate && !event.recordDate) messages.push({ level: 'error', field: 'paymentDate', message: 'Evento sem datas suficientes.' });
  if (amount !== null && amount < 0) messages.push({ level: 'publication_blocker', field: 'amountPerUnit', message: 'Valor negativo.' });
  if (event.paymentDate && event.recordDate && event.paymentDate < event.recordDate) messages.push({ level: 'publication_blocker', field: 'paymentDate', message: 'Pagamento anterior a Data COM.' });
  if (messages.some(item => item.level === 'publication_blocker')) event.validationStatus = 'blocked';
  else if (messages.length) event.validationStatus = 'warning';
  event.dataQualityScore = Math.max(0, 100 - messages.length * 18 - (!event.amountPerUnit ? 15 : 0));
  return { event, messages };
}

async function handleAdminDataCenter(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const one = async sql => (await env.DB.prepare(sql).first())?.total || 0;
  const safeOne = async sql => {
    try { return Number(await one(sql)); } catch { return 0; }
  };
  const latestPublication = await env.DB.prepare('SELECT * FROM publication_batches ORDER BY created_at DESC LIMIT 1').first().catch(() => null);
  const latestImport = await env.DB.prepare('SELECT * FROM admin_import_files ORDER BY created_at DESC LIMIT 1').first().catch(() => null);
  const latestBrapi = await env.DB.prepare("SELECT * FROM job_runs WHERE job_name='sync_brapi_fii_events' ORDER BY created_at DESC LIMIT 1").first().catch(() => null);
  return json({
    states: ADMIN_EVENT_STATES,
    counts: {
      publicActive: await safeOne("SELECT COUNT(*) AS total FROM canonical_financial_events WHERE publication_status='published' AND public_visibility=1"),
      futureEvents: await safeOne("SELECT COUNT(*) AS total FROM canonical_financial_events WHERE payment_date >= date('now')"),
      importedToday: await safeOne("SELECT COUNT(*) AS total FROM admin_import_files WHERE date(created_at)=date('now')"),
      syncedBrapi: await safeOne("SELECT COUNT(*) AS total FROM financial_event_sources WHERE source_type='brapi'"),
      pendingReview: await safeOne("SELECT COUNT(*) AS total FROM canonical_financial_events WHERE review_status='pending_review'"),
      blocked: await safeOne("SELECT COUNT(*) AS total FROM canonical_financial_events WHERE validation_status='blocked'"),
      divergences: await safeOne("SELECT COUNT(*) AS total FROM event_reconciliation_cases WHERE decision='pending'"),
      unmatchedAssets: await safeOne("SELECT COUNT(*) AS total FROM canonical_financial_events WHERE asset_id IS NULL")
    },
    latestPublication,
    latestImport,
    latestBrapi,
    brapi: {
      enabled: String(env.BRAPI_SYNC_ENABLED || 'false') === 'true',
      tokenConfigured: Boolean(env.BRAPI_TOKEN),
      tokenTail: env.BRAPI_TOKEN ? String(env.BRAPI_TOKEN).slice(-4) : ''
    }
  }, 200, cors);
}

async function handleDetectB3Import(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  const text = String(body.contentText || '').slice(0, 1000000);
  if (!text.trim()) return bad('Arquivo vazio ou conteudo ausente.', 400, cors);
  const detection = detectB3Profile({ contentText: text });
  return json({ detection, profiles: B3_IMPORT_PROFILES }, 200, cors);
}

async function handleCreateB3Import(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  const text = String(body.contentText || '').slice(0, 2000000);
  if (!text.trim()) return bad('Arquivo vazio ou conteudo ausente.', 400, cors);
  const detection = detectB3Profile({ contentText: text });
  if (detection.confidence < 55 && !body.confirmLowConfidence) return bad('Confianca baixa. Confirme o perfil antes de processar.', 422, cors, detection);
  const parsed = parseDelimitedPreview(text, 5000);
  const mapping = body.mapping || detection.mapping;
  const fileId = uuid('imp');
  const hash = await sha256(text);
  await env.DB.prepare(`
    INSERT INTO admin_import_files(id,operator_user_id,original_filename,safe_filename,extension,detected_mime,size_bytes,sha256_hash,reference_date,presumed_profile,detected_profile,detection_confidence,ingestion_status,validation_status,review_status,publication_status,row_count,report_json,notes)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    fileId, guard.user.id, String(body.filename || 'b3-radar.csv').slice(0, 180), safeFilename(body.filename || 'b3-radar.csv'),
    String(body.extension || 'csv').slice(0, 16), 'text/csv', new TextEncoder().encode(text).byteLength, hash,
    body.referenceDate || null, body.profile || 'b3_radar_proventos', detection.profile, detection.confidence,
    'processing', 'unvalidated', 'pending_review', 'draft', parsed.rows.length, JSON.stringify({ detection, mapping }), String(body.notes || '').slice(0, 1000)
  ).run();
  let accepted = 0;
  let rejected = 0;
  for (let index = 0; index < parsed.rows.length; index++) {
    const row = parsed.rows[index];
    const normalized = normalizeB3RadarRow(row, mapping);
    if (normalized.event.validationStatus === 'blocked') rejected++;
    else accepted++;
    await env.DB.prepare(`
      INSERT INTO raw_import_rows(id,import_file_id,row_number,raw_json,normalized_json,fingerprint,validation_status,validation_messages_json)
      VALUES(?,?,?,?,?,?,?,?)
    `).bind(uuid('raw'), fileId, index + 1, JSON.stringify(row), JSON.stringify(normalized.event), normalized.event.dedupeKey, normalized.event.validationStatus, JSON.stringify(normalized.messages)).run();
    const asset = normalized.event.ticker ? await ensureAsset(env.DB, normalized.event.ticker) : null;
    const eventId = uuid('cfe');
    await env.DB.prepare(`
      INSERT INTO canonical_financial_events(id,asset_id,ticker,asset_type,event_type,announcement_date,record_date,ex_date,payment_date,amount_per_unit,gross_amount,net_amount,currency,financial_status,recurrence,source_type,source_id,source_name,source_reference,confidence,ingestion_status,validation_status,review_status,publication_status,public_visibility,data_quality_score,opportunity_score,dedupe_key)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(dedupe_key) DO UPDATE SET
        last_seen_at=datetime('now'), updated_at=datetime('now'), source_id=excluded.source_id, data_quality_score=excluded.data_quality_score
    `).bind(
      eventId, asset?.id || null, normalized.event.ticker, normalized.event.assetType, normalized.event.eventType,
      normalized.event.announcementDate || null, normalized.event.recordDate || null, normalized.event.exDate || null, normalized.event.paymentDate || null,
      normalized.event.amountPerUnit, normalized.event.grossAmount, normalized.event.netAmount, normalized.event.currency, normalized.event.financialStatus,
      normalized.event.recurrence, normalized.event.sourceType, fileId, normalized.event.sourceName, normalized.event.sourceReference,
      normalized.event.confidence, 'processed', normalized.event.validationStatus, 'pending_review', 'draft', 0,
      normalized.event.dataQualityScore, 0, normalized.event.dedupeKey
    ).run();
  }
  await env.DB.prepare(`
    UPDATE admin_import_files
    SET ingestion_status='processed', validation_status=?, row_count=?, accepted_count=?, rejected_count=?, processed_at=datetime('now'), report_json=?
    WHERE id=?
  `).bind(rejected ? 'warning' : 'valid', parsed.rows.length, accepted, rejected, JSON.stringify({ detection, accepted, rejected }), fileId).run();
  await audit(env, { userId: guard.user.id, action: 'admin.import_b3.process', entityType: 'admin_import_file', entityId: fileId, after: { accepted, rejected } });
  return json({ importId: fileId, accepted, rejected, detection }, 201, cors);
}

function buildBrapiSyncPlan(env, body = {}) {
  const symbols = Array.isArray(body.symbols) && body.symbols.length ? body.symbols.map(normalizeTicker).filter(Boolean) : ['MXRF11', 'HGLG11', 'KNRI11', 'VISC11', 'XPML11'];
  const batchSize = Math.max(1, Math.min(20, Number(body.batchSize || env.BRAPI_BATCH_SIZE || 20)));
  const batches = [];
  for (let i = 0; i < symbols.length; i += batchSize) batches.push(symbols.slice(i, i + batchSize));
  return {
    tokenConfigured: Boolean(env.BRAPI_TOKEN),
    tokenTail: env.BRAPI_TOKEN ? String(env.BRAPI_TOKEN).slice(-4) : '',
    endpoint: env.BRAPI_FII_DIVIDENDS_ENDPOINT || 'backend-secret:fii-dividends-endpoint',
    assets: symbols.length,
    batchSize,
    callsEstimated: batches.length,
    batches,
    warning: 'A Brapi nunca e consultada pelo frontend; o Worker executa lotes com token em secret.'
  };
}

async function handleBrapiSyncPlan(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  return json(buildBrapiSyncPlan(env, body), 200, cors);
}

async function syncBrapiFiiEvents(env, options = {}) {
  const jobId = await startJob(env, 'sync_brapi_fii_events');
  try {
    if (String(env.BRAPI_SYNC_ENABLED || 'false') !== 'true' || !env.BRAPI_TOKEN) {
      await finishJob(env, jobId, 'partial', 0, 0, 'BRAPI sync disabled or token missing');
      return { jobId, status: 'partial', processed: 0, message: 'BRAPI sync disabled or token missing' };
    }
    const planData = buildBrapiSyncPlan(env, options);
    await finishJob(env, jobId, 'success', planData.assets, 0);
    return { jobId, status: 'success', plannedBatches: planData.callsEstimated, processed: planData.assets };
  } catch (err) {
    await finishJob(env, jobId, 'failed', 0, 1, err.message);
    throw err;
  }
}

async function handleAdminEvents(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const sqlStatus = status ? 'WHERE review_status=? OR validation_status=? OR publication_status=?' : '';
  const stmt = env.DB.prepare(`
    SELECT * FROM canonical_financial_events
    ${sqlStatus}
    ORDER BY COALESCE(payment_date, record_date, created_at) DESC
    LIMIT 200
  `);
  const { results } = status ? await stmt.bind(status, status, status).all() : await stmt.all();
  return json({ events: results || [] }, 200, cors);
}

async function handleApproveEvents(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.slice(0, 500) : [];
  if (!ids.length) return bad('Nenhum evento informado.', 400, cors);
  let approved = 0;
  for (const id of ids) {
    const row = await env.DB.prepare('SELECT validation_status FROM canonical_financial_events WHERE id=?').bind(id).first();
    if (row && !['blocked', 'invalid'].includes(row.validation_status)) {
      await env.DB.prepare("UPDATE canonical_financial_events SET review_status='approved', updated_at=datetime('now') WHERE id=?").bind(id).run();
      approved++;
    }
  }
  await audit(env, { userId: guard.user.id, action: 'admin.events.approve', entityType: 'canonical_financial_event', after: { requested: ids.length, approved } });
  return json({ approved }, 200, cors);
}

async function handlePreparePublication(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare(`
    SELECT * FROM canonical_financial_events
    WHERE validation_status IN ('valid','warning') AND review_status='approved' AND publication_status IN ('draft','superseded')
    ORDER BY payment_date ASC
    LIMIT 500
  `).all();
  const items = results || [];
  return json({
    ready: items.length,
    blocked: await env.DB.prepare("SELECT COUNT(*) AS total FROM canonical_financial_events WHERE validation_status='blocked'").first(),
    items,
    impact: {
      events: items.length,
      assets: new Set(items.map(item => item.asset_id || item.ticker)).size,
      calendarDays: new Set(items.map(item => item.payment_date).filter(Boolean)).size,
      opportunities: items.filter(item => item.payment_date).length
    }
  }, 200, cors);
}

async function handlePublishApproved(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const prepared = await env.DB.prepare(`
    SELECT * FROM canonical_financial_events
    WHERE validation_status IN ('valid','warning') AND review_status='approved' AND publication_status IN ('draft','superseded')
    ORDER BY payment_date ASC
    LIMIT 500
  `).all();
  const items = prepared.results || [];
  if (!items.length) return bad('Nenhum item aprovado para publicar.', 409, cors);
  const version = `pub_${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;
  const checksum = await sha256(JSON.stringify(items.map(item => item.id)));
  const batchId = uuid('pub');
  await env.DB.prepare('INSERT INTO publication_batches(id,operator_user_id,status,version_label,checksum,summary_json,item_count) VALUES(?,?,?,?,?,?,?)')
    .bind(batchId, guard.user.id, 'publishing', version, checksum, JSON.stringify({ events: items.length }), items.length).run();
  for (const item of items) {
    const publicId = `evt_${item.ticker.toLowerCase()}_${String(item.payment_date || item.record_date || item.id).replace(/[^0-9a-z]/gi, '')}`;
    const payload = {
      id: publicId,
      canonicalEventId: item.id,
      ticker: item.ticker,
      assetType: item.asset_type,
      eventType: item.event_type,
      recordDate: item.record_date,
      exDate: item.ex_date,
      paymentDate: item.payment_date,
      amountPerUnit: item.amount_per_unit,
      currency: item.currency,
      financialStatus: item.financial_status,
      recurrence: item.recurrence,
      confidence: item.confidence,
      sourceName: item.source_name,
      dataQualityScore: item.data_quality_score,
      opportunityScore: item.opportunity_score,
      capturable: true
    };
    await env.DB.prepare(`
      INSERT INTO published_event_cache(id,canonical_event_id,public_id,payload_json,version_label,checksum,public_visibility,capturable)
      VALUES(?,?,?,?,?,?,?,?)
      ON CONFLICT(canonical_event_id) DO UPDATE SET payload_json=excluded.payload_json, version_label=excluded.version_label, checksum=excluded.checksum, updated_at=datetime('now')
    `).bind(uuid('pec'), item.id, publicId, JSON.stringify(payload), version, checksum, 1, 1).run();
    await env.DB.prepare('INSERT INTO publication_batch_items(id,publication_batch_id,canonical_event_id,action,after_json) VALUES(?,?,?,?,?)')
      .bind(uuid('pbi'), batchId, item.id, 'publish', JSON.stringify(payload)).run();
    await env.DB.prepare("UPDATE canonical_financial_events SET publication_status='published', public_visibility=1, updated_at=datetime('now') WHERE id=?").bind(item.id).run();
  }
  await env.DB.prepare("UPDATE publication_batches SET status='published', published_at=datetime('now') WHERE id=?").bind(batchId).run();
  await audit(env, { userId: guard.user.id, action: 'admin.publication.publish', entityType: 'publication_batch', entityId: batchId, after: { version, count: items.length } });
  return json({ publicationBatchId: batchId, version, published: items.length, checksum }, 201, cors);
}

async function listPublishedEvents(request, env, cors) {
  const { results } = await env.DB.prepare(`
    SELECT payload_json FROM published_event_cache
    WHERE public_visibility=1
    ORDER BY json_extract(payload_json, '$.paymentDate') ASC
    LIMIT 500
  `).all();
  return json({ events: (results || []).map(row => JSON.parse(row.payload_json)) }, 200, cors);
}

async function runJob(name, env) {
  if (name === 'sync_quotes') return syncQuotes(env);
  if (name === 'sync_brapi_fii_events') return syncBrapiFiiEvents(env);
  if (name === 'evaluate_alerts') return evaluateAlerts(env);
  if (name === 'cleanup_expired_tokens') return cleanupExpiredTokens(env);
  throw new Error('Job desconhecido.');
}

async function adminJobs(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare('SELECT * FROM job_runs ORDER BY created_at DESC LIMIT 100').all();
  return json({ jobs: results || [] }, 200, cors);
}

async function triggerJob(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  const result = await runJob(body.name, env);
  await audit(env, { userId: guard.user.id, action: 'job.trigger', entityType: 'job', entityId: result.jobId, after: { name: body.name } });
  return json(result, 202, cors);
}

async function createBillingCheckout(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  const provider = env.BILLING_PROVIDER || 'sandbox-disabled';
  if (String(env.BILLING_ENABLED || 'false') !== 'true') {
    await operationalLog(env, { level: 'warn', entityType: 'billing', entityId: guard.user.id, changeType: 'checkout_disabled', source: provider, after: { planId: body.planId || 'dividend_system' } });
    return json({ checkoutCreated: false, disabled: true, provider, message: 'Billing sandbox ainda sem credencial/flag ativa.' }, 200, cors);
  }
  return json({ checkoutCreated: false, provider, message: 'Provider sandbox configurado parcialmente; criar adaptador especifico antes de cobrar.' }, 202, cors);
}

async function billingWebhook(request, env, cors) {
  const provider = env.BILLING_PROVIDER || 'unknown';
  const raw = await request.text();
  const externalEventId = request.headers.get('x-event-id') || await sha256(raw);
  const payloadHash = await sha256(raw);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO billing_events(id,provider,external_event_id,event_type,signature_valid,payload_hash,status)
    VALUES(?,?,?,?,?,?,?)
  `).bind(uuid('bev'), provider, externalEventId, request.headers.get('x-event-type') || 'unknown', 0, payloadHash, 'received').run();
  return json({ ok: true, received: true, verified: false }, 202, cors);
}

async function debugRuntime(env, cors) {
  if (env.ENVIRONMENT === 'production') return bad('Not found', 404, cors);
  const digest = await sha256('debug');
  const signature = env.SESSION_SECRET ? await signSession(env, { sub: 'debug', exp: Date.now() + 1000 }) : '';
  const tableCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM sqlite_master WHERE type='table'").first();
  return json({
    ok: true,
    digest: Boolean(digest),
    sessionSigning: Boolean(signature),
    tables: Number(tableCount?.total || 0),
    pbkdf2Iterations: Number(env.PBKDF2_ITERATIONS || 0)
  }, 200, cors);
}

async function debugPassword(env, cors) {
  if (env.ENVIRONMENT === 'production') return bad('Not found', 404, cors);
  const started = Date.now();
  const hash = await hashPassword('PreviewTest!2026', env);
  const ok = await verifyPassword('PreviewTest!2026', hash);
  return json({ ok, durationMs: Date.now() - started, scheme: hash.split('$')[0], iterations: Number(hash.split('$')[1]) }, 200, cors);
}

async function debugWrite(env, cors) {
  if (env.ENVIRONMENT === 'production') return bad('Not found', 404, cors);
  const userId = uuid('dbgusr');
  const email = `${userId}@example.com`;
  const passwordHash = await hashPassword('PreviewTest!2026', env);
  await env.DB.batch([
    env.DB.prepare('INSERT INTO users(id,email,password_hash,status) VALUES(?,?,?,?)').bind(userId, email, passwordHash, 'active'),
    env.DB.prepare('INSERT INTO profiles(user_id,display_name) VALUES(?,?)').bind(userId, 'Debug Write'),
    env.DB.prepare('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)').bind(userId, 'free_user'),
    env.DB.prepare('INSERT INTO subscriptions(id,user_id,plan_id,status,cycle,provider) VALUES(?,?,?,?,?,?)').bind(uuid('sub'), userId, 'free', 'active', 'monthly', 'internal')
  ]);
  const row = await env.DB.prepare('SELECT id,email FROM users WHERE id=?').bind(userId).first();
  await env.DB.prepare('UPDATE users SET deleted_at=datetime(\'now\'), status=? WHERE id=?').bind('deleted', userId).run();
  return json({ ok: Boolean(row), userCreated: Boolean(row?.id) }, 200, cors);
}

async function debugEmail(env, cors) {
  if (env.ENVIRONMENT === 'production') return bad('Not found', 404, cors);
  const userId = uuid('dbgmail');
  const email = `${userId}@example.com`;
  const passwordHash = await hashPassword('PreviewTest!2026', env);
  await env.DB.prepare('INSERT INTO users(id,email,password_hash,status) VALUES(?,?,?,?)').bind(userId, email, passwordHash, 'active').run();
  await createEmailVerification(env, userId, email);
  const logs = await env.DB.prepare('SELECT COUNT(*) AS total FROM email_delivery_logs WHERE user_id=?').bind(userId).first();
  await env.DB.prepare('UPDATE users SET deleted_at=datetime(\'now\'), status=? WHERE id=?').bind('deleted', userId).run();
  return json({ ok: true, emailLogs: Number(logs?.total || 0) }, 200, cors);
}

async function debugRunJob(request, env, cors) {
  if (env.ENVIRONMENT === 'production') return bad('Not found', 404, cors);
  const name = new URL(request.url).searchParams.get('name') || 'evaluate_alerts';
  return json(await runJob(name, env), 200, cors);
}

async function handleMe(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const profile = await env.DB.prepare('SELECT * FROM profiles WHERE user_id=?').bind(guard.user.id).first();
  const preferences = await env.DB.prepare('SELECT * FROM user_preferences WHERE user_id=?').bind(guard.user.id).first();
  return json({
    user: guard.user,
    profile,
    preferences,
    roles: guard.roles,
    permissions: guard.permissions,
    subscription: { planId: guard.subscription.plan_id, status: guard.subscription.status, limits: planLimits(guard.subscription) }
  }, 200, cors);
}

async function handlePatchProfile(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(`
    UPDATE profiles
    SET display_name=?, timezone=?, currency=?, investor_type=?, interests_json=?, updated_at=datetime('now')
    WHERE user_id=?
  `).bind(
    String(body.displayName || '').slice(0, 120),
    String(body.timezone || 'America/Fortaleza').slice(0, 80),
    String(body.currency || 'BRL').slice(0, 8),
    String(body.investorType || '').slice(0, 80),
    JSON.stringify(Array.isArray(body.interests) ? body.interests.slice(0, 20) : []),
    guard.user.id
  ).run();
  await audit(env, { userId: guard.user.id, action: 'profile.update', entityType: 'profile', entityId: guard.user.id, after: body });
  return handleMe(request, env, cors);
}

async function handlePutPreferences(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(`
    UPDATE user_preferences
    SET alert_frequency=?, communication_json=?, consent_json=?, classes_json=?, updated_at=datetime('now')
    WHERE user_id=?
  `).bind(
    String(body.alertFrequency || 'weekly'),
    JSON.stringify(body.communication || {}),
    JSON.stringify(body.consent || {}),
    JSON.stringify(Array.isArray(body.classes) ? body.classes : []),
    guard.user.id
  ).run();
  await audit(env, { userId: guard.user.id, action: 'preferences.update', entityType: 'user_preferences', entityId: guard.user.id, after: body });
  return handleMe(request, env, cors);
}

async function listFavorites(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare(`
    SELECT f.id, f.created_at, a.ticker, a.name, a.type, a.sector
    FROM favorites f
    JOIN assets a ON a.id=f.asset_id
    WHERE f.user_id=?
    ORDER BY f.created_at DESC
  `).bind(guard.user.id).all();
  return json({ favorites: results || [] }, 200, cors);
}

async function addFavorite(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  const asset = await ensureAsset(env.DB, body.ticker);
  await env.DB.prepare('INSERT OR IGNORE INTO favorites(id,user_id,asset_id) VALUES(?,?,?)')
    .bind(uuid('fav'), guard.user.id, asset.id).run();
  await audit(env, { userId: guard.user.id, action: 'favorite.add', entityType: 'asset', entityId: asset.id, after: { ticker: asset.ticker } });
  return listFavorites(request, env, cors);
}

async function removeFavorite(request, env, cors, ticker) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const asset = await ensureAsset(env.DB, ticker);
  await env.DB.prepare('DELETE FROM favorites WHERE user_id=? AND asset_id=?').bind(guard.user.id, asset.id).run();
  await audit(env, { userId: guard.user.id, action: 'favorite.remove', entityType: 'asset', entityId: asset.id });
  return listFavorites(request, env, cors);
}

async function listWatchlists(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare(`
    SELECT w.id, w.name, w.status, w.created_at, COUNT(i.id) AS item_count
    FROM watchlists w
    LEFT JOIN watchlist_items i ON i.watchlist_id=w.id AND i.status!='archived'
    WHERE w.user_id=? AND w.deleted_at IS NULL
    GROUP BY w.id
    ORDER BY w.created_at ASC
  `).bind(guard.user.id).all();
  return json({ watchlists: results || [] }, 200, cors);
}

async function createWatchlist(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => ({}));
  const id = uuid('wl');
  await env.DB.prepare('INSERT INTO watchlists(id,user_id,name,status) VALUES(?,?,?,?)')
    .bind(id, guard.user.id, String(body.name || 'Nova watchlist').slice(0, 120), 'active').run();
  await audit(env, { userId: guard.user.id, action: 'watchlist.create', entityType: 'watchlist', entityId: id });
  return listWatchlists(request, env, cors);
}

async function addWatchlistItem(request, env, cors, watchlistId) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const owner = await env.DB.prepare('SELECT id FROM watchlists WHERE id=? AND user_id=? AND deleted_at IS NULL')
    .bind(watchlistId, guard.user.id).first();
  if (!owner) return bad('Watchlist nao encontrada.', 404, cors);
  const count = await env.DB.prepare(`
    SELECT COUNT(*) AS total
    FROM watchlist_items i
    JOIN watchlists w ON w.id=i.watchlist_id
    WHERE w.user_id=? AND i.status!='archived'
  `).bind(guard.user.id).first();
  await enforceLimit(env.DB, guard.user.id, guard.subscription, 'watchlistAssets', Number(count?.total || 0));
  const body = await request.json().catch(() => ({}));
  const asset = await ensureAsset(env.DB, body.ticker);
  await env.DB.prepare(`
    INSERT OR IGNORE INTO watchlist_items(id,watchlist_id,asset_id,priority,notes,status,sort_order)
    VALUES(?,?,?,?,?,?,?)
  `).bind(uuid('wli'), watchlistId, asset.id, body.priority || 'normal', String(body.notes || '').slice(0, 500), 'watching', Number(body.sortOrder || 0)).run();
  await audit(env, { userId: guard.user.id, action: 'watchlist.item_add', entityType: 'asset', entityId: asset.id, after: { watchlistId, ticker: asset.ticker } });
  return listWatchlists(request, env, cors);
}

async function listAlerts(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare(`
    SELECT al.*, a.ticker
    FROM alerts al
    LEFT JOIN assets a ON a.id=al.asset_id
    WHERE al.user_id=? AND al.status!='archived'
    ORDER BY al.created_at DESC
  `).bind(guard.user.id).all();
  return json({ alerts: results || [] }, 200, cors);
}

async function createAlert(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM alerts WHERE user_id=? AND status!='archived'").bind(guard.user.id).first();
  await enforceLimit(env.DB, guard.user.id, guard.subscription, 'alerts', Number(count?.total || 0));
  const body = await request.json().catch(() => ({}));
  const asset = body.ticker ? await ensureAsset(env.DB, body.ticker) : null;
  const id = uuid('alt');
  await env.DB.prepare(`
    INSERT INTO alerts(id,user_id,asset_id,type,condition_json,channel,frequency,status)
    VALUES(?,?,?,?,?,?,?,?)
  `).bind(id, guard.user.id, asset?.id || null, body.type || 'payment_due', JSON.stringify(body.condition || {}), body.channel || 'in_app', body.frequency || 'daily', 'active').run();
  await audit(env, { userId: guard.user.id, action: 'alert.create', entityType: 'alert', entityId: id, after: body });
  return listAlerts(request, env, cors);
}

async function listNotifications(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare('SELECT * FROM notifications WHERE user_id=? AND status!=? ORDER BY created_at DESC LIMIT 100')
    .bind(guard.user.id, 'archived').all();
  return json({ notifications: results || [] }, 200, cors);
}

async function listPortfolios(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare(`
    SELECT p.*, COUNT(t.id) AS transaction_count
    FROM portfolios p
    LEFT JOIN transactions t ON t.portfolio_id=p.id AND t.status!='deleted'
    WHERE p.user_id=? AND p.deleted_at IS NULL
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).bind(guard.user.id).all();
  return json({ portfolios: results || [] }, 200, cors);
}

async function createPortfolio(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const count = await env.DB.prepare('SELECT COUNT(*) AS total FROM portfolios WHERE user_id=? AND deleted_at IS NULL').bind(guard.user.id).first();
  await enforceLimit(env.DB, guard.user.id, guard.subscription, 'portfolios', Number(count?.total || 0));
  const body = await request.json().catch(() => ({}));
  const id = uuid('prt');
  await env.DB.prepare(`
    INSERT INTO portfolios(id,user_id,name,objective,currency,strategy,target_income_cents,status)
    VALUES(?,?,?,?,?,?,?,?)
  `).bind(id, guard.user.id, String(body.name || 'Minha carteira').slice(0, 120), body.objective || '', body.currency || 'BRL', body.strategy || '', Number(body.targetIncomeCents || 0), 'active').run();
  await audit(env, { userId: guard.user.id, action: 'portfolio.create', entityType: 'portfolio', entityId: id, after: body });
  return listPortfolios(request, env, cors);
}

async function addTransaction(request, env, cors, portfolioId) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const portfolio = await env.DB.prepare('SELECT id FROM portfolios WHERE id=? AND user_id=? AND deleted_at IS NULL')
    .bind(portfolioId, guard.user.id).first();
  if (!portfolio) return bad('Carteira nao encontrada.', 404, cors);
  const body = await request.json().catch(() => ({}));
  const asset = await ensureAsset(env.DB, body.ticker);
  const id = uuid('trx');
  await env.DB.prepare(`
    INSERT INTO transactions(id,portfolio_id,user_id,asset_id,type,trade_date,quantity_decimal,price_cents,gross_amount_cents,fees_cents,taxes_cents,broker,note,source,import_id,status)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    id, portfolioId, guard.user.id, asset.id, body.type || 'buy', body.tradeDate || new Date().toISOString().slice(0, 10),
    String(body.quantity || '0'), Number(body.priceCents || 0), Number(body.grossAmountCents || 0), Number(body.feesCents || 0),
    Number(body.taxesCents || 0), body.broker || '', body.note || '', body.source || 'manual', body.importId || null, 'confirmed'
  ).run();
  await audit(env, { userId: guard.user.id, action: 'transaction.create', entityType: 'transaction', entityId: id, after: { portfolioId, ticker: asset.ticker, type: body.type } });
  return json({ ok: true, transactionId: id }, 201, cors);
}

async function dashboard(request, env, cors) {
  const guard = await requireUser(request, env, cors);
  if (guard.response) return guard.response;
  const [favorites, watchlists, alerts, portfolios, notifications] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS total FROM favorites WHERE user_id=?').bind(guard.user.id).first(),
    env.DB.prepare('SELECT COUNT(*) AS total FROM watchlists WHERE user_id=? AND deleted_at IS NULL').bind(guard.user.id).first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM alerts WHERE user_id=? AND status!='archived'").bind(guard.user.id).first(),
    env.DB.prepare('SELECT COUNT(*) AS total FROM portfolios WHERE user_id=? AND deleted_at IS NULL').bind(guard.user.id).first(),
    env.DB.prepare("SELECT COUNT(*) AS total FROM notifications WHERE user_id=? AND status='unread'").bind(guard.user.id).first()
  ]);
  return json({
    counts: {
      favorites: Number(favorites?.total || 0),
      watchlists: Number(watchlists?.total || 0),
      alerts: Number(alerts?.total || 0),
      portfolios: Number(portfolios?.total || 0),
      unreadNotifications: Number(notifications?.total || 0)
    },
    subscription: { planId: guard.subscription.plan_id, limits: planLimits(guard.subscription) },
    suggestedActions: [
      'Adicionar primeiros ativos a watchlist.',
      'Criar carteira para acompanhar posicoes e renda.',
      'Configurar um alerta basico de pagamento proximo.'
    ]
  }, 200, cors);
}

async function adminUsers(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare(`
    SELECT u.id,u.email,u.status,u.created_at,p.display_name,s.plan_id,s.status AS subscription_status
    FROM users u
    LEFT JOIN profiles p ON p.user_id=u.id
    LEFT JOIN subscriptions s ON s.user_id=u.id
    WHERE u.deleted_at IS NULL
    ORDER BY u.created_at DESC
    LIMIT 200
  `).all();
  return json({ users: results || [] }, 200, cors);
}

async function adminPlans(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const { results } = await env.DB.prepare('SELECT * FROM plans ORDER BY tier ASC').all();
  return json({ plans: results || [] }, 200, cors);
}

export default {
  async scheduled(event, env, ctx) {
    const hour = new Date(event.scheduledTime || Date.now()).getUTCHours();
    ctx.waitUntil((async () => {
      await cleanupExpiredTokens(env);
      if (hour >= 10 && hour <= 22) await syncQuotes(env, 10);
      await evaluateAlerts(env);
    })());
  },

  async fetch(request, env) {
    const started = Date.now();
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    try {
      if (request.method === 'GET' && path === '/health') return json({ ok: true, service: 'guido-financial-platform-api', environment: env.ENVIRONMENT || 'unknown' }, 200, cors);
      if (request.method === 'GET' && path === '/health/db') return healthDb(env, cors);
      if (request.method === 'GET' && path === '/health/integrations') return healthIntegrations(env, cors);
      if (request.method === 'GET' && path === '/public/events') return listPublishedEvents(request, env, cors);
      if (request.method === 'GET' && path === '/debug/runtime') return debugRuntime(env, cors);
      if (request.method === 'GET' && path === '/debug/password') return debugPassword(env, cors);
      if (request.method === 'GET' && path === '/debug/write') return debugWrite(env, cors);
      if (request.method === 'GET' && path === '/debug/email') return debugEmail(env, cors);
      if (request.method === 'POST' && path === '/debug/run-job') return debugRunJob(request, env, cors);
      if (request.method === 'POST' && path === '/auth/register') return handleRegister(request, env, cors);
      if (request.method === 'POST' && path === '/auth/login') return handleLogin(request, env, cors);
      if (request.method === 'POST' && path === '/auth/password-reset/request') return handlePasswordResetRequest(request, env, cors);
      if (request.method === 'POST' && path === '/auth/logout') {
        const guard = await requireUser(request, env, cors);
        if (guard.response) return guard.response;
        await audit(env, { userId: guard.user.id, action: 'auth.logout', entityType: 'user', entityId: guard.user.id });
        return json({ ok: true }, 200, cors);
      }
      if (request.method === 'GET' && path === '/me') return handleMe(request, env, cors);
      if (request.method === 'PATCH' && path === '/me/profile') return handlePatchProfile(request, env, cors);
      if (request.method === 'GET' && path === '/me/preferences') return handleMe(request, env, cors);
      if (request.method === 'PUT' && path === '/me/preferences') return handlePutPreferences(request, env, cors);
      if (request.method === 'GET' && path === '/me/dashboard') return dashboard(request, env, cors);
      if (request.method === 'GET' && path === '/favorites') return listFavorites(request, env, cors);
      if (request.method === 'POST' && path === '/favorites') return addFavorite(request, env, cors);
      if (request.method === 'DELETE' && path.startsWith('/favorites/')) return removeFavorite(request, env, cors, path.split('/').pop());
      if (request.method === 'GET' && path === '/watchlists') return listWatchlists(request, env, cors);
      if (request.method === 'POST' && path === '/watchlists') return createWatchlist(request, env, cors);
      if (request.method === 'POST' && /^\/watchlists\/[^/]+\/items$/.test(path)) return addWatchlistItem(request, env, cors, path.split('/')[2]);
      if (request.method === 'GET' && path === '/alerts') return listAlerts(request, env, cors);
      if (request.method === 'POST' && path === '/alerts') return createAlert(request, env, cors);
      if (request.method === 'GET' && path === '/notifications') return listNotifications(request, env, cors);
      if (request.method === 'GET' && path === '/portfolios') return listPortfolios(request, env, cors);
      if (request.method === 'POST' && path === '/portfolios') return createPortfolio(request, env, cors);
      if (request.method === 'POST' && /^\/portfolios\/[^/]+\/transactions$/.test(path)) return addTransaction(request, env, cors, path.split('/')[2]);
      if (request.method === 'GET' && path === '/admin/users') return adminUsers(request, env, cors);
      if (request.method === 'GET' && path === '/admin/plans') return adminPlans(request, env, cors);
      if (request.method === 'GET' && path === '/admin/data-center') return handleAdminDataCenter(request, env, cors);
      if (request.method === 'POST' && path === '/admin/imports/b3/detect') return handleDetectB3Import(request, env, cors);
      if (request.method === 'POST' && path === '/admin/imports/b3') return handleCreateB3Import(request, env, cors);
      if (request.method === 'GET' && path === '/admin/brapi/plan') return handleBrapiSyncPlan(request, env, cors);
      if (request.method === 'POST' && path === '/admin/brapi/plan') return handleBrapiSyncPlan(request, env, cors);
      if (request.method === 'GET' && path === '/admin/events') return handleAdminEvents(request, env, cors);
      if (request.method === 'POST' && path === '/admin/events/approve') return handleApproveEvents(request, env, cors);
      if (request.method === 'GET' && path === '/admin/publication/prepare') return handlePreparePublication(request, env, cors);
      if (request.method === 'POST' && path === '/admin/publication/publish') return handlePublishApproved(request, env, cors);
      if (request.method === 'GET' && path === '/admin/jobs') return adminJobs(request, env, cors);
      if (request.method === 'POST' && path === '/admin/jobs/run') return triggerJob(request, env, cors);
      if (request.method === 'POST' && path === '/billing/checkout') return createBillingCheckout(request, env, cors);
      if (request.method === 'POST' && path === '/billing/webhook') return billingWebhook(request, env, cors);
      return bad('Not found', 404, cors);
    } catch (err) {
      console.error('platform-api-error', { message: err?.message, path, durationMs: Date.now() - started });
      return bad(err?.message || 'Internal error', err?.message?.includes('Limite') ? 402 : 500, cors);
    }
  }
};
