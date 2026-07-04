const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store'
};

function json(data, status = 200, cors = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...cors } });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean);
  const defaults = [
    'https://guido-dividend-system.pages.dev',
    'https://guidorafaelchaves.github.io'
  ];
  const isPreview = /^https:\/\/[a-z0-9-]+\.guido-dividend-system\.pages\.dev$/i.test(origin);
  if (!origin || (![...defaults, ...allowed].includes(origin) && !isPreview)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'authorization,content-type',
    'access-control-max-age': '86400',
    vary: 'origin'
  };
}

function bad(message, status = 400, cors = {}) {
  return json({ error: message }, status, cors);
}

function bearer(request) {
  const header = request.headers.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
}

async function verifySupabaseUser(request, env) {
  const token = bearer(request);
  if (!token) return null;
  const res = await fetch(`${String(env.SUPABASE_URL || '').replace(/\/+$/, '')}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return res.json();
}

function requireTicker(value) {
  const ticker = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  if (!ticker) throw new Error('Ticker ausente.');
  return ticker;
}

async function handleBrapiQuote(request, env, cors) {
  const user = await verifySupabaseUser(request, env);
  if (!user?.id) return bad('Unauthorized', 401, cors);
  const url = new URL(request.url);
  const ticker = requireTicker(url.searchParams.get('ticker'));
  const qs = new URLSearchParams({ dividends: 'true', token: env.BRAPI_TOKEN });
  const range = url.searchParams.get('range');
  const interval = url.searchParams.get('interval');
  if (range) qs.set('range', range);
  if (interval) qs.set('interval', interval);
  const upstream = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(ticker)}?${qs.toString()}`, {
    headers: { accept: 'application/json' }
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { ...JSON_HEADERS, ...cors }
  });
}

async function handleOpenAIAnalysis(request, env, cors) {
  const user = await verifySupabaseUser(request, env);
  if (!user?.id) return bad('Unauthorized', 401, cors);
  const payload = await request.json().catch(() => null);
  if (!payload?.messages && !payload?.prompt) return bad('Payload de análise ausente.', 400, cors);
  const model = String(payload.model || env.OPENAI_DEFAULT_MODEL || 'gpt-4o-mini');
  const messages = payload.messages || [
    { role: 'system', content: 'Você é um analista financeiro técnico, objetivo e focado em fluxo de caixa de dividendos. Não calcule peso de carteira, rebalanceamento ou alocação ideal.' },
    { role: 'user', content: String(payload.prompt || '') }
  ];
  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model,
      temperature: Number(payload.temperature ?? 0.2),
      messages,
      response_format: payload.response_format
    })
  });
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { ...JSON_HEADERS, ...cors }
  });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/api/brapi/quote') return handleBrapiQuote(request, env, cors);
      if (request.method === 'POST' && url.pathname === '/api/openai/analysis') return handleOpenAIAnalysis(request, env, cors);
      if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true, service: 'radar-saas-gateway' }, 200, cors);
      return bad('Not found', 404, cors);
    } catch (err) {
      return bad(err?.message || 'Internal error', 500, cors);
    }
  }
};
