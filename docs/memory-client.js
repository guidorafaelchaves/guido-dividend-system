/**
 * Dividend System - Memory Client v0.1
 *
 * Paste this into the Dividend System HTML after the main state/functions exist.
 * It expects the Apps Script Web App URL ending in /exec.
 */

const DIVIDEND_MEMORY_STORAGE_KEY = 'gds_memory_api_url_v1';

function gdsMemorySetApiUrl(url) {
  const cleanUrl = String(url || '').trim();
  if (!cleanUrl || !/\/exec(\?|$)/.test(cleanUrl)) {
    throw new Error('Use a URL do Apps Script terminada em /exec.');
  }
  localStorage.setItem(DIVIDEND_MEMORY_STORAGE_KEY, cleanUrl);
  return cleanUrl;
}

function gdsMemoryGetApiUrl() {
  return localStorage.getItem(DIVIDEND_MEMORY_STORAGE_KEY) || '';
}

async function gdsMemoryRequest(action, payload = {}, method = 'POST') {
  const apiUrl = gdsMemoryGetApiUrl();
  if (!apiUrl) throw new Error('Memory API URL nao configurada.');

  if (method === 'GET') {
    const url = new URL(apiUrl);
    url.searchParams.set('action', action);
    Object.entries(payload || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
    const response = await fetch(url.toString());
    return parseMemoryResponse(response);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload })
  });
  return parseMemoryResponse(response);
}

async function parseMemoryResponse(response) {
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error('Resposta da memoria nao era JSON valido: ' + text.slice(0, 300));
  }
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Falha na Memory API.');
  }
  return data;
}

async function gdsMemorySetup() {
  return gdsMemoryRequest('setup', {}, 'GET');
}

async function gdsMemoryLoadAll() {
  return gdsMemoryRequest('data', {}, 'GET');
}

async function gdsMemoryLoadAssets() {
  return gdsMemoryRequest('data', { only: 'ativos' }, 'GET');
}

async function gdsMemoryUpsertAsset(asset) {
  return gdsMemoryRequest('upsert_asset', asset);
}

async function gdsMemoryAddDecision(decision) {
  return gdsMemoryRequest('add_decision', decision);
}

async function gdsMemoryAddDocNote(note) {
  return gdsMemoryRequest('doc_note', note);
}

async function gdsMemorySyncCurrentAssets() {
  if (typeof state === 'undefined') {
    throw new Error('Estado local do Dividend System nao encontrado.');
  }

  const assets = buildMemoryAssetsFromState();
  const results = [];

  for (const asset of assets) {
    results.push(await gdsMemoryUpsertAsset(asset));
  }

  await gdsMemoryAddDocNote({
    title: 'Sincronizacao de ativos',
    text: `Foram sincronizados ${assets.length} ativos do Dividend System para a memoria real.`,
    origem: 'dividend_system'
  });

  return {
    ok: true,
    count: assets.length,
    results
  };
}

function buildMemoryAssetsFromState() {
  const assets = state.assets || {};
  const positions = typeof buildPositions === 'function' ? buildPositions() : {};
  const tickers = new Set([
    ...Object.keys(assets),
    ...Object.keys(positions || {})
  ]);

  return Array.from(tickers)
    .map(ticker => normalizeTickerForMemory(ticker))
    .filter(Boolean)
    .map(ticker => {
      const asset = assets[ticker] || {};
      const position = positions[ticker] || {};
      const quote = (state.quotes || {})[ticker] || {};
      const quantity = Number(position.quantidade || position.qty || asset.quantidade_atual || 0);
      const averagePrice = Number(position.precoMedio || position.preco_medio || asset.preco_medio || 0);
      const currentPrice = Number(quote.precoAtual || quote.price || asset.preco_atual || 0);
      const marketValue = currentPrice && quantity ? currentPrice * quantity : Number(position.valorMercado || asset.valor_mercado || 0);

      return {
        ticker,
        nome: asset.nome || asset.name || ticker,
        tipo: asset.tipo || classifyTickerForMemory(ticker),
        classe: asset.classe || 'Brasil',
        setor: asset.setor || '',
        segmento: asset.segmento || '',
        pais: asset.pais || 'BR',
        moeda: asset.moeda || 'BRL',
        corretora: asset.corretora || '',
        quantidade_atual: quantity,
        preco_medio: averagePrice,
        custo_total: Number(position.custoTotal || asset.custo_total || averagePrice * quantity || 0),
        preco_atual: currentPrice,
        valor_mercado: marketValue,
        renda_total_recebida: Number(position.rendaTotal || asset.renda_total_recebida || 0),
        retorno_total: Number(position.retornoTotal || asset.retorno_total || 0),
        yoc: Number(position.yoc || asset.yoc || 0),
        dy_estimado: Number(asset.dy_estimado || 0),
        status: asset.status || 'ativo',
        tese: asset.tese || '',
        risco: asset.risco || '',
        tags: Array.isArray(asset.tags) ? asset.tags.join(', ') : (asset.tags || ''),
        fonte: 'dividend_system_local',
        ativo: asset.ativo !== false
      };
    });
}

function normalizeTickerForMemory(value) {
  return String(value || '').trim().toUpperCase().replace(/\.SA$/i, '').replace(/[^A-Z0-9]/g, '');
}

function classifyTickerForMemory(ticker) {
  return /11$/.test(ticker) && !['TAEE11', 'ALUP11', 'SANB11', 'KLBN11', 'SAPR11'].includes(ticker)
    ? 'FII'
    : 'ACAO';
}

