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
  if (!getGdsRuntimeState()) {
    throw new Error('Estado local do Dividend System nao encontrado.');
  }

  const assets = buildMemoryAssetsFromState();
  const results = [];
  const failures = [];

  for (const asset of assets) {
    try {
      results.push(await gdsMemoryUpsertAsset(asset));
    } catch (err) {
      failures.push({ ticker: asset.ticker, error: err.message });
    }
  }

  await gdsMemoryAddDocNote({
    title: 'Sincronizacao de ativos',
    text: `Foram sincronizados ${results.length} ativos do Dividend System para a memoria real. Falhas: ${failures.length}.`,
    origem: 'dividend_system'
  });

  return {
    ok: failures.length === 0,
    count: results.length,
    attempted: assets.length,
    failures,
    results
  };
}

function buildMemoryAssetsFromState() {
  const state = getGdsRuntimeState();
  const assets = isPlainMemoryObject(state.assets) ? state.assets : {};
  const positions = isPlainMemoryObject(state.positions) && Object.keys(state.positions).length
    ? state.positions
    : buildSafePositionsFromState(state);
  const quotes = isPlainMemoryObject(state.quotes) ? state.quotes : {};
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
      const quote = quotes[ticker] || {};
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

function buildSafePositionsFromState(state) {
  const map = {};
  const trades = Array.isArray(state.trades) ? state.trades : [];
  const quotes = isPlainMemoryObject(state.quotes) ? state.quotes : {};
  const ordered = trades
    .filter(trade => normalizeTickerForMemory(trade && trade.ticker))
    .slice()
    .sort((a, b) => String(a.data || '').localeCompare(String(b.data || '')));

  for (const trade of ordered) {
    const ticker = normalizeTickerForMemory(trade.ticker);
    if (!map[ticker]) {
      map[ticker] = {
        ticker,
        quantidade: 0,
        precoMedio: 0,
        capitalInvestido: 0,
        custoTotal: 0,
        valorMercado: 0,
        lucroNaoRealizado: 0,
        lucroRealizado: 0,
        precoAtual: safeNumber(quotes[ticker] && quotes[ticker].precoAtual),
        primeiraCompra: '',
        ultimaCompra: ''
      };
    }

    const position = map[ticker];
    const qty = safeNumber(trade.quantidade);
    const price = safeNumber(trade.precoUnitario);
    const fees = safeNumber(trade.custos);
    const type = String(trade.tipo || '').toUpperCase();

    if (type === 'COMPRA') {
      const totalCost = (qty * price) + fees;
      position.quantidade += qty;
      position.custoTotal += totalCost;
      position.precoMedio = position.quantidade > 0 ? position.custoTotal / position.quantidade : 0;
      if (!position.primeiraCompra || trade.data < position.primeiraCompra) position.primeiraCompra = trade.data || '';
      if (!position.ultimaCompra || trade.data > position.ultimaCompra) position.ultimaCompra = trade.data || '';
    } else if (type === 'VENDA' && position.quantidade > 0) {
      const sellQty = Math.min(qty, position.quantidade);
      const averageCost = position.quantidade > 0 ? position.custoTotal / position.quantidade : 0;
      const writtenDownCost = averageCost * sellQty;
      const netRevenue = (sellQty * price) - fees;
      position.quantidade -= sellQty;
      position.custoTotal -= writtenDownCost;
      position.lucroRealizado += netRevenue - writtenDownCost;
      position.precoMedio = position.quantidade > 0 ? position.custoTotal / position.quantidade : 0;
      if (position.quantidade <= 0) {
        position.quantidade = 0;
        position.custoTotal = 0;
      }
    }
  }

  Object.keys(map).forEach(ticker => {
    const position = map[ticker];
    position.capitalInvestido = position.custoTotal;
    position.precoAtual = safeNumber(quotes[ticker] && quotes[ticker].precoAtual);
    position.valorMercado = position.quantidade * position.precoAtual;
    position.lucroNaoRealizado = position.valorMercado - position.custoTotal;
  });

  return map;
}

function isPlainMemoryObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function safeNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(String(value).replace(/\s/g, '').replace(/R\$/gi, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTickerForMemory(value) {
  return String(value || '').trim().toUpperCase().replace(/\.SA$/i, '').replace(/[^A-Z0-9]/g, '');
}

function classifyTickerForMemory(ticker) {
  return /11$/.test(ticker) && !['TAEE11', 'ALUP11', 'SANB11', 'KLBN11', 'SAPR11'].includes(ticker)
    ? 'FII'
    : 'ACAO';
}

function getGdsRuntimeState() {
  if (window.gdsRuntime && typeof window.gdsRuntime.getState === 'function') {
    return window.gdsRuntime.getState();
  }
  return null;
}

function gdsMemoryStatus(message, type = 'info') {
  const el = document.getElementById('realMemoryStatus');
  if (!el) return;
  const color = type === 'ok' ? '#9affcb' : type === 'error' ? '#ffb3b3' : type === 'warn' ? '#ffd18a' : '#9fefff';
  el.innerHTML = `<span style="color:${color}">${escapeMemoryHtml(message)}</span>`;
}

function escapeMemoryHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function gdsMemoryInitUI() {
  const input = document.getElementById('memoryApiUrl');
  const savedUrl = gdsMemoryGetApiUrl();
  if (input && savedUrl) input.value = savedUrl;
  gdsMemoryStatus(savedUrl ? 'Memoria real configurada. Teste a conexao ou sincronize ativos.' : 'Memoria real: cole a URL /exec do Apps Script para ativar Sheets + Docs.');
}

function gdsMemorySaveUrlFromInput() {
  try {
    const input = document.getElementById('memoryApiUrl');
    const url = gdsMemorySetApiUrl(input ? input.value : '');
    gdsMemoryStatus('URL salva: ' + url, 'ok');
  } catch (err) {
    gdsMemoryStatus(err.message, 'error');
    alert(err.message);
  }
}

async function gdsMemoryTestFromUI() {
  try {
    gdsMemoryStatus('Testando memoria real...');
    const data = await gdsMemorySetup();
    gdsMemoryStatus(`Memoria OK. Sheets: ${data.spreadsheetId}. Docs: ${data.documentId}.`, 'ok');
  } catch (err) {
    gdsMemoryStatus('Erro ao testar memoria: ' + err.message, 'error');
  }
}

async function gdsMemorySyncAssetsFromUI() {
  try {
    gdsMemoryStatus('Sincronizando ativos com Google Sheets...');
    const result = await gdsMemorySyncCurrentAssets();
    const suffix = result.failures && result.failures.length
      ? ` Falhas: ${result.failures.length} (${result.failures.slice(0, 3).map(f => f.ticker).join(', ')}).`
      : '';
    gdsMemoryStatus(`Ativos sincronizados: ${result.count}/${result.attempted}.${suffix}`, result.failures && result.failures.length ? 'warn' : 'ok');
  } catch (err) {
    gdsMemoryStatus('Erro ao sincronizar ativos: ' + err.message, 'error');
  }
}

async function gdsMemoryLoadAssetsFromUI() {
  try {
    gdsMemoryStatus('Carregando ativos da memoria real...');
    const data = await gdsMemoryLoadAssets();
    const count = Array.isArray(data.ativos) ? data.ativos.length : 0;
    gdsMemoryStatus(`Memoria carregada: ${count} ativo(s) no Google Sheets.`, 'ok');
  } catch (err) {
    gdsMemoryStatus('Erro ao carregar ativos: ' + err.message, 'error');
  }
}

async function gdsMemoryWriteStrategicNoteFromUI() {
  try {
    const runtime = window.gdsRuntime || {};
    const state = getGdsRuntimeState() || {};
    const positions = isPlainMemoryObject(state.positions) && Object.keys(state.positions).length
      ? state.positions
      : buildSafePositionsFromState(state);
    const decisions = typeof runtime.buildDecisionRows === 'function' ? runtime.buildDecisionRows() : [];
    const fiiRows = typeof runtime.buildFIIIntelligenceRows === 'function' ? runtime.buildFIIIntelligenceRows() : [];
    const positionCount = Object.keys(positions || {}).length;
    const decisionCount = Array.isArray(decisions) ? decisions.length : 0;
    const fiiCount = Array.isArray(fiiRows) ? fiiRows.length : 0;
    const radarCount = Array.isArray(state.dividends) ? state.dividends.length : 0;
    const riskItems = (decisions || [])
      .filter(item => ['VENDER_PARCIAL', 'EVITAR', 'INVESTIGAR'].includes(item.action))
      .slice(0, 5)
      .map(item => `${item.ticker}: ${item.action} - ${item.motivo || 'sem motivo'}`);

    const lines = [
      `Posicoes acompanhadas: ${positionCount}.`,
      `Eventos/proventos no radar: ${radarCount}.`,
      `Ativos analisados pelo Decision Engine: ${decisionCount}.`,
      `FIIs analisados: ${fiiCount}.`,
      riskItems.length ? 'Alertas principais: ' + riskItems.join(' | ') : 'Sem alertas criticos destacados no momento.'
    ];

    gdsMemoryStatus('Registrando leitura estrategica no Google Docs...');
    await gdsMemoryAddDocNote({
      title: 'Leitura estrategica do Dividend System',
      text: lines.join('\n'),
      origem: 'dividend_system_pages'
    });
    gdsMemoryStatus('Leitura estrategica registrada no Google Docs.', 'ok');
  } catch (err) {
    gdsMemoryStatus('Erro ao registrar leitura estrategica: ' + err.message, 'error');
  }
}

window.addEventListener('load', gdsMemoryInitUI);
