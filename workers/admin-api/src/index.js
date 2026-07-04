const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

const PERIOD_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...cors }
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const defaultAllowed = [
    'https://guidorafaelchaves.github.io',
    'https://guido-dividend-system.pages.dev'
  ];
  const allowed = String(env.ADMIN_ALLOWED_ORIGINS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([...defaultAllowed, ...allowed]);
  const isProjectPreview = /^https:\/\/[a-z0-9-]+\.guido-dividend-system\.pages\.dev$/i.test(origin);
  if (!origin || (!allowedOrigins.has(origin) && !isProjectPreview)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'access-control-max-age': '86400',
    vary: 'origin'
  };
}

function bad(message, status = 400, cors = {}) {
  return json({ error: message }, status, cors);
}

function b64url(bytes) {
  const bin = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(value) {
  const raw = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = raw + '='.repeat((4 - (raw.length % 4)) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
}

async function signSession(env, claims) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const body = `${header}.${payload}`;
  const sig = b64url(await hmac(env.ADMIN_JWT_SECRET, body));
  return `${body}.${sig}`;
}

async function verifySession(env, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const body = `${parts[0]}.${parts[1]}`;
  const expected = b64url(await hmac(env.ADMIN_JWT_SECRET, body));
  if (expected !== parts[2]) return null;
  const claims = JSON.parse(new TextDecoder().decode(fromB64url(parts[1])));
  if (!claims.exp || Date.now() > claims.exp) return null;
  if (claims.role !== 'owner') return null;
  return claims;
}

async function verifyPassword(password, encodedHash) {
  const [scheme, iterRaw, saltB64, hashB64] = String(encodedHash || '').trim().split('$').map(part => part.trim());
  if (scheme === 'sha256') {
    const salt = fromB64url(saltB64);
    const expected = fromB64url(hashB64);
    const payload = new Uint8Array(salt.byteLength + new TextEncoder().encode(password).byteLength);
    payload.set(salt, 0);
    payload.set(new TextEncoder().encode(password), salt.byteLength);
    const actual = new Uint8Array(await crypto.subtle.digest('SHA-256', payload));
    if (actual.byteLength !== expected.byteLength) return false;
    let diff = 0;
    for (let i = 0; i < actual.byteLength; i++) diff |= actual[i] ^ expected[i];
    return diff === 0;
  }
  if (scheme !== 'pbkdf2') throw new Error('Invalid password hash scheme');
  const iterations = Number(iterRaw);
  const salt = fromB64url(saltB64);
  const expected = fromB64url(hashB64);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, expected.byteLength * 8);
  const actual = new Uint8Array(bits);
  if (actual.byteLength !== expected.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < actual.byteLength; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function requireAdmin(request, env, cors) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const claims = await verifySession(env, token);
  if (!claims) return { response: bad('Unauthorized', 401, cors) };
  return { claims };
}

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function previousRange(days) {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - days);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function scalar(db, sql, binds = []) {
  const row = await db.prepare(sql).bind(...binds).first();
  return Number(Object.values(row || { v: 0 })[0] || 0);
}

async function costByCategory(db, since) {
  const { results } = await db.prepare(`
    SELECT category, COALESCE(SUM(amount_brl), 0) AS total
    FROM cost_events
    WHERE date(created_at) >= date(?)
    GROUP BY category
  `).bind(since).all();
  return Object.fromEntries((results || []).map(x => [x.category, Number(x.total || 0)]));
}

async function usageByKind(db, since) {
  const { results } = await db.prepare(`
    SELECT kind, COALESCE(SUM(quantity), 0) AS total
    FROM usage_events
    WHERE date(created_at) >= date(?)
    GROUP BY kind
  `).bind(since).all();
  return Object.fromEntries((results || []).map(x => [x.kind, Number(x.total || 0)]));
}

async function buildMetrics(env, period) {
  const days = PERIOD_DAYS[period] || 30;
  const since = isoDaysAgo(days);
  const prev = previousRange(days);
  const db = env.DB;

  const [costs, usage] = await Promise.all([costByCategory(db, since), usageByKind(db, since)]);
  const totalCost = Object.values(costs).reduce((a, b) => a + Number(b || 0), 0);
  const previousCost = await scalar(db, `
    SELECT COALESCE(SUM(amount_brl), 0) AS v
    FROM cost_events
    WHERE date(created_at) >= date(?) AND date(created_at) < date(?)
  `, [prev.start, prev.end]);

  const paid = await scalar(db, `SELECT COUNT(DISTINCT user_id) AS v FROM subscriptions WHERE status='active'`);
  const trials = await scalar(db, `SELECT COUNT(DISTINCT user_id) AS v FROM subscriptions WHERE status='trial'`);
  const mrr = await scalar(db, `SELECT COALESCE(SUM(mrr_brl), 0) AS v FROM subscriptions WHERE status='active'`);
  const canceled = await scalar(db, `
    SELECT COUNT(DISTINCT user_id) AS v
    FROM subscriptions
    WHERE status='canceled' AND canceled_at IS NOT NULL AND date(canceled_at) >= date(?)
  `, [since]);
  const dau = await scalar(db, `
    SELECT COUNT(DISTINCT user_id) AS v
    FROM user_activity
    WHERE date(activity_date) = date('now')
  `);
  const mau = await scalar(db, `
    SELECT COUNT(DISTINCT user_id) AS v
    FROM user_activity
    WHERE date(activity_date) >= date(?)
  `, [since]);
  const prevDau = await scalar(db, `
    SELECT COUNT(DISTINCT user_id) AS v
    FROM user_activity
    WHERE date(activity_date) = date(?)
  `, [prev.end]);
  const prevMau = await scalar(db, `
    SELECT COUNT(DISTINCT user_id) AS v
    FROM user_activity
    WHERE date(activity_date) >= date(?) AND date(activity_date) < date(?)
  `, [prev.start, prev.end]);
  const prevMrr = await scalar(db, `
    SELECT COALESCE(SUM(mrr_brl), 0) AS v
    FROM subscriptions
    WHERE status='active' AND date(started_at) < date(?)
  `, [prev.end]);
  const firstHalf = await scalar(db, `
    SELECT COUNT(DISTINCT user_id) AS v
    FROM user_activity
    WHERE date(activity_date) >= date(?) AND date(activity_date) < date('now', '-15 day')
  `, [since]);
  const retained = await scalar(db, `
    SELECT COUNT(DISTINCT a.user_id) AS v
    FROM user_activity a
    WHERE date(a.activity_date) >= date('now', '-15 day')
      AND a.user_id IN (
        SELECT DISTINCT user_id FROM user_activity
        WHERE date(activity_date) >= date(?) AND date(activity_date) < date('now', '-15 day')
      )
  `, [since]);

  return {
    revenue: {
      mrr,
      arpu: paid > 0 ? mrr / paid : 0,
      cac: Number(env.DEFAULT_CAC_BRL || 0),
      churnPct: paid > 0 ? (canceled / paid) * 100 : 0
    },
    users: {
      dau,
      mau,
      trials,
      paid,
      retained30d: firstHalf > 0 ? (retained / firstHalf) * 100 : 0,
      conversionPct: (trials + paid) > 0 ? (paid / (trials + paid)) * 100 : 0
    },
    usage: {
      brapiCalls: usage.brapi_call || 0,
      aiTokens: usage.ai_tokens || 0,
      cloudRequests: usage.cloud_request || 0
    },
    costs: {
      brapi: costs.brapi || 0,
      ai: costs.ai || 0,
      cloud: costs.cloud || 0,
      support: costs.support || 0,
      payment: costs.payment || 0
    },
    previous: { mrr: prevMrr, dau: prevDau, mau: prevMau, totalCost: previousCost },
    thresholds: {
      brapiCostPerUser: Number(env.THRESHOLD_BRAPI_COST_PER_USER || 1.2),
      aiCostPerUser: Number(env.THRESHOLD_AI_COST_PER_USER || 2.4),
      grossMarginMin: Number(env.THRESHOLD_GROSS_MARGIN_MIN || 72),
      ltvCacMin: Number(env.THRESHOLD_LTV_CAC_MIN || 3),
      burnMultipleMax: Number(env.THRESHOLD_BURN_MULTIPLE_MAX || 1.5),
      retentionMin: Number(env.THRESHOLD_RETENTION_MIN || 42)
    }
  };
}

async function handleLogin(request, env, cors) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) return bad('Missing credentials', 400, cors);
  if (String(body.email).toLowerCase() !== String(env.ADMIN_EMAIL || '').toLowerCase()) {
    return bad('Unauthorized', 401, cors);
  }
  const ok = await verifyPassword(body.password, env.ADMIN_PASSWORD_HASH);
  if (!ok) return bad('Unauthorized', 401, cors);
  const now = Date.now();
  const exp = now + 1000 * 60 * 30;
  const token = await signSession(env, {
    sub: String(env.ADMIN_EMAIL),
    role: 'owner',
    iat: now,
    exp
  });
  return json({ token, expiresAt: exp, user: { email: env.ADMIN_EMAIL, role: 'owner' } }, 200, cors);
}

async function handleMetrics(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const period = new URL(request.url).searchParams.get('period') || '30d';
  return json(await buildMetrics(env, period), 200, cors);
}

async function handleIngest(request, env, cors) {
  const guard = await requireAdmin(request, env, cors);
  if (guard.response) return guard.response;
  const body = await request.json().catch(() => null);
  if (!body?.kind) return bad('Missing kind', 400, cors);
  const now = new Date().toISOString();
  if (body.kind === 'cost') {
    await env.DB.prepare(`
      INSERT INTO cost_events(category, amount_brl, created_at, source, note)
      VALUES(?, ?, ?, ?, ?)
    `).bind(body.category, Number(body.amount_brl || 0), body.created_at || now, body.source || 'manual', body.note || '').run();
  } else if (body.kind === 'usage') {
    await env.DB.prepare(`
      INSERT INTO usage_events(user_id, kind, quantity, cost_brl, created_at, source)
      VALUES(?, ?, ?, ?, ?, ?)
    `).bind(body.user_id || 'system', body.usage_kind, Number(body.quantity || 0), Number(body.cost_brl || 0), body.created_at || now, body.source || 'manual').run();
  } else {
    return bad('Unsupported kind', 400, cors);
  }
  return json({ ok: true }, 201, cors);
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    try {
      if (request.method === 'POST' && url.pathname === '/admin/auth/session') return handleLogin(request, env, cors);
      if (request.method === 'GET' && url.pathname === '/admin/metrics') return handleMetrics(request, env, cors);
      if (request.method === 'POST' && url.pathname === '/admin/ingest') return handleIngest(request, env, cors);
      if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true }, 200, cors);
      return bad('Not found', 404, cors);
    } catch (err) {
      console.error(err);
      return bad('Internal error', 500, cors);
    }
  }
};
