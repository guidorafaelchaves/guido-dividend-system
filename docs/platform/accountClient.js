(function(global){
  'use strict';

  const TOKEN_KEY = 'gds_platform_session_v1';
  const API_BASE_KEY = 'gds_platform_api_base_v1';
  const defaultApiBase = 'https://guido-financial-platform-api.guidorafaelchaves.workers.dev';

  function apiBase(){
    return localStorage.getItem(API_BASE_KEY) || defaultApiBase;
  }

  function setApiBase(value){
    const clean = String(value || '').trim().replace(/\/+$/, '');
    if(clean) localStorage.setItem(API_BASE_KEY, clean);
  }

  function session(){
    try{ return JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); }catch{ return null; }
  }

  function token(){
    return session()?.token || '';
  }

  function setSession(value){
    localStorage.setItem(TOKEN_KEY, JSON.stringify(value));
  }

  function clearSession(){
    localStorage.removeItem(TOKEN_KEY);
  }

  async function request(path, options){
    const headers = { 'content-type':'application/json', ...(options?.headers || {}) };
    const currentToken = token();
    if(currentToken) headers.authorization = `Bearer ${currentToken}`;
    const res = await fetch(`${apiBase()}${path}`, {
      method: options?.method || 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  async function register(input){
    const data = await request('/auth/register', { method:'POST', body:input });
    setSession(data);
    return data;
  }

  async function login(input){
    const data = await request('/auth/login', { method:'POST', body:input });
    setSession(data);
    return data;
  }

  async function logout(){
    try{ await request('/auth/logout', { method:'POST' }); }catch{}
    clearSession();
  }

  global.DividendAccountClient = Object.freeze({
    apiBase,
    setApiBase,
    session,
    token,
    request,
    register,
    login,
    logout,
    clearSession
  });
})(window);
