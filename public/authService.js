(function(global){
  'use strict';

  const SESSION_KEY = 'radar_saas_session_v1';
  const CONFIG_KEY = 'radar_saas_public_config_v1';

  const DEFAULT_CONFIG = Object.freeze({
    enabled: false,
    supabaseUrl: '',
    supabaseAnonKey: '',
    gatewayBaseUrl: ''
  });

  function readConfig(){
    const runtime = global.RADAR_SAAS_CONFIG || {};
    let stored = {};
    try{ stored = JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }catch{}
    return {
      ...DEFAULT_CONFIG,
      ...stored,
      ...runtime,
      enabled: Boolean(runtime.enabled ?? stored.enabled)
    };
  }

  function normalizeBase(url){
    return String(url || '').replace(/\/+$/, '');
  }

  function requireConfig(){
    const cfg = readConfig();
    if(!cfg.enabled) throw new Error('SaaS BaaS não habilitado para este ambiente.');
    if(!cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('Supabase URL/Anon Key ausentes.');
    return {
      ...cfg,
      supabaseUrl: normalizeBase(cfg.supabaseUrl),
      gatewayBaseUrl: normalizeBase(cfg.gatewayBaseUrl)
    };
  }

  function saveSession(session){
    const payload = {
      access_token: session?.access_token || '',
      refresh_token: session?.refresh_token || '',
      expires_at: session?.expires_at || Math.floor(Date.now() / 1000) + Number(session?.expires_in || 3600),
      user: session?.user || null
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return payload;
  }

  function getSession(){
    try{
      const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if(!session?.access_token) return null;
      return session;
    }catch{
      return null;
    }
  }

  function isSessionFresh(session=getSession()){
    return Boolean(session?.access_token && Number(session.expires_at || 0) * 1000 > Date.now() + 30000);
  }

  async function supabaseFetch(path, options={}){
    const cfg = requireConfig();
    const session = getSession();
    const headers = new Headers(options.headers || {});
    headers.set('apikey', cfg.supabaseAnonKey);
    headers.set('content-type', headers.get('content-type') || 'application/json');
    if(session?.access_token) headers.set('authorization', `Bearer ${session.access_token}`);
    const res = await fetch(`${cfg.supabaseUrl}${path}`, { ...options, headers });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if(!res.ok) throw new Error(body?.msg || body?.message || body?.error_description || `Supabase HTTP ${res.status}`);
    return body;
  }

  async function signInWithPassword(email, password){
    const session = await supabaseFetch('/auth/v1/token?grant_type=password', {
      method:'POST',
      body: JSON.stringify({ email, password })
    });
    return saveSession(session);
  }

  async function requestMagicLink(email, redirectTo){
    return supabaseFetch('/auth/v1/otp', {
      method:'POST',
      body: JSON.stringify({ email, type:'magiclink', options:{ email_redirect_to: redirectTo } })
    });
  }

  async function getUser(){
    if(!isSessionFresh()) return null;
    return supabaseFetch('/auth/v1/user', { method:'GET' });
  }

  async function signOut(){
    try{ await supabaseFetch('/auth/v1/logout', { method:'POST', body:'{}' }); }catch{}
    localStorage.removeItem(SESSION_KEY);
  }

  async function getTenantConfig(){
    if(!isSessionFresh()) return null;
    const rows = await supabaseFetch('/rest/v1/user_system_configs?select=config,updated_at&limit=1', {
      method:'GET',
      headers:{ 'content-type':'application/json' }
    });
    return Array.isArray(rows) && rows[0] ? rows[0].config : null;
  }

  async function saveTenantConfig(config){
    if(!isSessionFresh()) throw new Error('Sessão SaaS expirada.');
    const user = await getUser();
    if(!user?.id) throw new Error('Usuário SaaS não localizado.');
    const body = {
      user_id: user.id,
      config,
      updated_at: new Date().toISOString()
    };
    return supabaseFetch('/rest/v1/user_system_configs?on_conflict=user_id', {
      method:'POST',
      headers:{ prefer:'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(body)
    });
  }

  async function gatewayFetch(path, options={}){
    const cfg = requireConfig();
    if(!cfg.gatewayBaseUrl) throw new Error('Gateway SaaS não configurado.');
    if(!isSessionFresh()) throw new Error('Sessão SaaS expirada.');
    const session = getSession();
    const headers = new Headers(options.headers || {});
    headers.set('authorization', `Bearer ${session.access_token}`);
    if(!headers.has('content-type') && options.body) headers.set('content-type', 'application/json');
    const res = await fetch(`${cfg.gatewayBaseUrl}${path}`, { ...options, headers });
    const body = await res.text();
    const parsed = body ? JSON.parse(body) : null;
    if(!res.ok) throw new Error(parsed?.error || `Gateway HTTP ${res.status}`);
    return parsed;
  }

  global.RadarAuthService = {
    configure(config){
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...readConfig(), ...config }));
      return readConfig();
    },
    getConfig: readConfig,
    isEnabled(){ return Boolean(readConfig().enabled); },
    saveSession,
    getSession,
    isSessionFresh,
    signInWithPassword,
    requestMagicLink,
    getUser,
    signOut,
    getTenantConfig,
    saveTenantConfig,
    gatewayFetch
  };
})(window);
