(function(global){
  'use strict';

  const DB_NAME = 'radarSystemConfigDB';
  const DB_VERSION = 1;
  const STORE = 'config';
  const CONFIG_KEY = 'system_config_v1';
  const FALLBACK_KEY = 'radar_system_config_fallback_v1';
  const ENCODING_VERSION = 'aes-gcm-v1';

  const DEFAULT_CONFIG = Object.freeze({
    version: 1,
    updatedAt: '',
    external: {
      brapiToken: '',
      brapiTickers: 'MXRF11, PETR4, VALE3, BBAS3, ITUB4',
      refreshMode: 'smart',
      sheetsApiUrl: '',
      sheetsApiKey: '',
      memoryDocUrl: ''
    },
    ai: {
      openaiApiKey: '',
      model: 'gpt-4o-mini',
      timeoutMs: 90000,
      autoOpenNewTab: true
    },
    radar: {
      pesoRetorno: 0.35,
      pesoRecorrencia: 0.25,
      pesoTiming: 0.20,
      diasJanelaFluxo: 90,
      bonusDataComMaxDias: 5
    }
  });

  const text = {
    encode: value => new TextEncoder().encode(value),
    decode: value => new TextDecoder().decode(value)
  };

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function mergeConfig(input){
    const cfg = input && typeof input === 'object' ? input : {};
    return {
      version: 1,
      updatedAt: cfg.updatedAt || '',
      external: { ...DEFAULT_CONFIG.external, ...(cfg.external || {}) },
      ai: { ...DEFAULT_CONFIG.ai, ...(cfg.ai || {}) },
      radar: { ...DEFAULT_CONFIG.radar, ...(cfg.radar || {}) }
    };
  }

  function normalizeNumber(value, fallback, min, max){
    const n = Number(value);
    if(!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeConfig(input){
    const cfg = mergeConfig(input);
    cfg.external.brapiToken = String(cfg.external.brapiToken || '').trim();
    cfg.external.brapiTickers = String(cfg.external.brapiTickers || DEFAULT_CONFIG.external.brapiTickers).trim();
    cfg.external.refreshMode = ['smart','economic','live'].includes(cfg.external.refreshMode) ? cfg.external.refreshMode : 'smart';
    cfg.external.sheetsApiUrl = String(cfg.external.sheetsApiUrl || '').trim();
    cfg.external.sheetsApiKey = String(cfg.external.sheetsApiKey || '').trim();
    cfg.external.memoryDocUrl = String(cfg.external.memoryDocUrl || '').trim();
    cfg.ai.openaiApiKey = String(cfg.ai.openaiApiKey || '').trim();
    cfg.ai.model = String(cfg.ai.model || DEFAULT_CONFIG.ai.model).trim() || DEFAULT_CONFIG.ai.model;
    cfg.ai.timeoutMs = normalizeNumber(cfg.ai.timeoutMs, DEFAULT_CONFIG.ai.timeoutMs, 5000, 180000);
    cfg.ai.autoOpenNewTab = cfg.ai.autoOpenNewTab !== false;
    cfg.radar.pesoRetorno = normalizeNumber(cfg.radar.pesoRetorno, DEFAULT_CONFIG.radar.pesoRetorno, 0, 1);
    cfg.radar.pesoRecorrencia = normalizeNumber(cfg.radar.pesoRecorrencia, DEFAULT_CONFIG.radar.pesoRecorrencia, 0, 1);
    cfg.radar.pesoTiming = normalizeNumber(cfg.radar.pesoTiming, DEFAULT_CONFIG.radar.pesoTiming, 0, 1);
    cfg.radar.diasJanelaFluxo = Math.round(normalizeNumber(cfg.radar.diasJanelaFluxo, DEFAULT_CONFIG.radar.diasJanelaFluxo, 1, 730));
    cfg.radar.bonusDataComMaxDias = Math.round(normalizeNumber(cfg.radar.bonusDataComMaxDias, DEFAULT_CONFIG.radar.bonusDataComMaxDias, 0, 90));
    return cfg;
  }

  function toBase64(bytes){
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
  }

  function fromBase64(value){
    return Uint8Array.from(atob(value), c => c.charCodeAt(0));
  }

  async function deriveKey(salt){
    if(!global.crypto?.subtle) throw new Error('Web Crypto indisponivel.');
    const material = await crypto.subtle.importKey(
      'raw',
      text.encode(`${location.origin}|radar-admin-config|${navigator.userAgent}`),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name:'PBKDF2', salt, iterations:120000, hash:'SHA-256' },
      material,
      { name:'AES-GCM', length:256 },
      false,
      ['encrypt','decrypt']
    );
  }

  async function encryptConfig(config){
    if(!global.crypto?.subtle) return { v:'plain-v1', payload:btoa(unescape(encodeURIComponent(JSON.stringify(config)))) };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(salt);
    const cipher = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, text.encode(JSON.stringify(config)));
    return { v:ENCODING_VERSION, salt:toBase64(salt), iv:toBase64(iv), payload:toBase64(cipher) };
  }

  async function decryptConfig(record){
    if(!record) return null;
    if(record.v === 'plain-v1') return JSON.parse(decodeURIComponent(escape(atob(record.payload))));
    if(record.v !== ENCODING_VERSION) return null;
    const salt = fromBase64(record.salt);
    const iv = fromBase64(record.iv);
    const key = await deriveKey(salt);
    const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, fromBase64(record.payload));
    return JSON.parse(text.decode(plain));
  }

  function openDb(){
    if(!('indexedDB' in global)) return Promise.reject(new Error('IndexedDB indisponivel.'));
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPut(record){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(record, CONFIG_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function idbGet(){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(CONFIG_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function idbDelete(){
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(CONFIG_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function save(config){
    const normalized = normalizeConfig({ ...config, updatedAt:new Date().toISOString() });
    const record = await encryptConfig(normalized);
    try{
      await idbPut(record);
    }catch{
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(record));
    }
    return normalized;
  }

  async function load(){
    let record = null;
    try{ record = await idbGet(); }catch{}
    if(!record){
      try{ record = JSON.parse(localStorage.getItem(FALLBACK_KEY) || 'null'); }catch{}
    }
    if(!record) return { config:clone(DEFAULT_CONFIG), configured:false, source:'defaults' };
    try{
      return { config:normalizeConfig(await decryptConfig(record)), configured:true, source:record.v };
    }catch{
      return { config:clone(DEFAULT_CONFIG), configured:false, source:'invalid' };
    }
  }

  async function clear(){
    try{ await idbDelete(); }catch{}
    localStorage.removeItem(FALLBACK_KEY);
  }

  function validate(config){
    const cfg = normalizeConfig(config);
    const missing = [];
    if(!cfg.external.brapiToken) missing.push('Token Brapi');
    if(!cfg.ai.openaiApiKey) missing.push('Chave OpenAI');
    if(!cfg.external.sheetsApiUrl) missing.push('URL Sheets/Docs');
    return {
      ok: missing.length === 0,
      missing,
      message: missing.length
        ? `Sistema em manutencao ou parametros nao configurados pelo administrador: ${missing.join(', ')}.`
        : 'Configuracao administrativa carregada.'
    };
  }

  function applyToDashboardState(appState, config){
    if(!appState) return validate(config);
    const cfg = normalizeConfig(config);
    appState.settings = appState.settings || {};
    appState.settings.radar = appState.settings.radar || {};
    appState.settings.radar.pesos = appState.settings.radar.pesos || {};
    appState.settings.radar.pesos.retorno = cfg.radar.pesoRetorno;
    appState.settings.radar.pesos.recorrencia = cfg.radar.pesoRecorrencia;
    appState.settings.radar.pesos.timing = cfg.radar.pesoTiming;
    appState.settings.radar.pesos.carteira = 0;
    appState.settings.radar.diasJanelaFluxo = cfg.radar.diasJanelaFluxo;
    appState.settings.radar.bonusDataComMaxDias = cfg.radar.bonusDataComMaxDias;
    appState.settings.brapi = appState.settings.brapi || {};
    appState.settings.brapi.token = cfg.external.brapiToken;
    appState.settings.brapi.tickers = cfg.external.brapiTickers;
    appState.settings.brapi.refreshMode = cfg.external.refreshMode;
    appState.settings.memory = {
      apiUrl: cfg.external.sheetsApiUrl,
      apiKey: cfg.external.sheetsApiKey,
      docUrl: cfg.external.memoryDocUrl
    };
    appState.aiSettings = {
      apiKey: cfg.ai.openaiApiKey,
      model: cfg.ai.model,
      timeoutMs: cfg.ai.timeoutMs,
      autoOpenNewTab: cfg.ai.autoOpenNewTab
    };
    return validate(cfg);
  }

  global.RadarConfigManager = {
    DEFAULT_CONFIG: clone(DEFAULT_CONFIG),
    load,
    save,
    clear,
    validate,
    normalizeConfig,
    applyToDashboardState
  };
})(window);
