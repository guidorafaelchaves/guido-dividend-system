/**
 * Guido Dividend System - Memory Bridge v0.1
 *
 * Google Apps Script Web App for a real portfolio memory:
 * - Google Sheets stores structured data.
 * - Google Docs stores narrative/audit memory.
 *
 * Deploy as Web App:
 * Execute as: Me
 * Who has access: Anyone with the link
 */

const MEMORY_CONFIG = {
  spreadsheetName: 'Guido Dividend System - Memoria Patrimonial',
  documentName: 'Guido Dividend System - Diario Patrimonial',
  timezone: 'America/Fortaleza',
  maxRowsPerRead: 5000
};

const SHEETS = {
  ativos: {
    name: 'Ativos',
    key: 'id',
    headers: [
      'id', 'ticker', 'nome', 'tipo', 'classe', 'setor', 'segmento', 'pais', 'moeda',
      'corretora', 'quantidade_atual', 'preco_medio', 'custo_total', 'preco_atual',
      'valor_mercado', 'renda_total_recebida', 'retorno_total', 'yoc', 'dy_estimado',
      'status', 'tese', 'risco', 'tags', 'fonte', 'criado_em', 'atualizado_em', 'ativo'
    ]
  },
  operacoes: {
    name: 'Operacoes',
    key: 'id',
    headers: [
      'id', 'data', 'ticker', 'tipo', 'quantidade', 'preco_unitario', 'custos',
      'valor_total', 'corretora', 'origem', 'observacao', 'criado_em'
    ]
  },
  proventos: {
    name: 'Proventos',
    key: 'id',
    headers: [
      'id', 'ticker', 'tipo_provento', 'data_com', 'data_pagamento', 'valor_unitario',
      'quantidade_base', 'valor_total', 'status', 'origem', 'criado_em'
    ]
  },
  snapshots: {
    name: 'Snapshots',
    key: 'id',
    headers: [
      'id', 'data', 'patrimonio_total', 'renda_mensal_prevista', 'renda_recebida_mes',
      'retorno_total', 'caixa', 'observacao', 'criado_em'
    ]
  },
  decisoes: {
    name: 'Decisoes',
    key: 'id',
    headers: [
      'id', 'data', 'ticker', 'decisao', 'motivo', 'confianca', 'dados_usados',
      'resultado_esperado', 'revisar_em', 'status', 'criado_em'
    ]
  },
  radarEventos: {
    name: 'RadarEventos',
    key: 'id',
    headers: [
      'id', 'ticker', 'tipo_evento', 'data_com', 'data_pagamento', 'valor_unitario',
      'score', 'status', 'fonte', 'criado_em'
    ]
  },
  config: {
    name: 'Config',
    key: 'chave',
    headers: ['chave', 'valor', 'atualizado_em']
  },
  log: {
    name: 'Log',
    key: 'id',
    headers: ['id', 'data_hora', 'acao', 'origem', 'payload_resumo', 'resultado', 'erro']
  }
};

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const body = parseBody(e);
    const action = clean(params.action || body.action || 'data');

    const result = routeAction(action, body, params, method);
    return jsonResponse({ ok: true, action, ...result });
  } catch (err) {
    logSafe('error', 'apps_script', { message: err.message }, false, err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function routeAction(action, body, params, method) {
  if (action === 'setup') return setupMemory();
  if (action === 'data') return readAllData(params);
  if (action === 'upsert_asset') return upsertAsset(body);
  if (action === 'add_operation') return appendRecord('operacoes', normalizeOperation(body));
  if (action === 'add_dividend') return appendRecord('proventos', normalizeDividend(body));
  if (action === 'add_decision') return appendRecord('decisoes', normalizeDecision(body));
  if (action === 'add_radar_event') return appendRecord('radarEventos', normalizeRadarEvent(body));
  if (action === 'snapshot') return appendRecord('snapshots', normalizeSnapshot(body));
  if (action === 'doc_note') return appendDocNote(body);
  if (action === 'log') return appendLogFromBody(body);

  throw new Error('Acao desconhecida: ' + action);
}

function setupMemory() {
  const spreadsheet = getOrCreateSpreadsheet();
  const document = getOrCreateDocument();
  ensureSheets(spreadsheet);
  writeConfig(spreadsheet, 'spreadsheet_id', spreadsheet.getId());
  writeConfig(spreadsheet, 'document_id', document.getId());
  writeConfig(spreadsheet, 'version', '0.1');

  appendDocumentLine(document, 'Sistema inicializado', [
    'A memoria patrimonial foi configurada.',
    'Planilha: ' + spreadsheet.getUrl(),
    'Documento: ' + document.getUrl()
  ]);

  logSafe('setup', 'apps_script', {
    spreadsheetId: spreadsheet.getId(),
    documentId: document.getId()
  }, true, '');

  return {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    documentId: document.getId(),
    documentUrl: document.getUrl(),
    sheets: Object.values(SHEETS).map(s => s.name)
  };
}

function readAllData(params) {
  const spreadsheet = getOrCreateSpreadsheet();
  ensureSheets(spreadsheet);

  const only = clean(params.only || '');
  const result = {
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    documentId: getOrCreateDocument().getId(),
    generatedAt: nowIso()
  };

  Object.keys(SHEETS).forEach(key => {
    if (only && only !== key && only !== SHEETS[key].name) return;
    result[key] = readSheetObjects(spreadsheet, key);
  });

  return result;
}

function upsertAsset(body) {
  const ticker = normalizeTicker(body.ticker || body.ativo || body.codigo);
  if (!ticker) throw new Error('Ticker vazio em upsert_asset.');

  const now = nowIso();
  const id = clean(body.id) || 'ATIVO-' + ticker;
  const record = {
    id,
    ticker,
    nome: clean(body.nome || body.name || ticker),
    tipo: clean(body.tipo || classifyTicker(ticker)),
    classe: clean(body.classe || 'Brasil'),
    setor: clean(body.setor),
    segmento: clean(body.segmento),
    pais: clean(body.pais || 'BR'),
    moeda: clean(body.moeda || 'BRL'),
    corretora: clean(body.corretora),
    quantidade_atual: numberOrBlank(body.quantidade_atual ?? body.quantidade),
    preco_medio: numberOrBlank(body.preco_medio),
    custo_total: numberOrBlank(body.custo_total),
    preco_atual: numberOrBlank(body.preco_atual),
    valor_mercado: numberOrBlank(body.valor_mercado),
    renda_total_recebida: numberOrBlank(body.renda_total_recebida),
    retorno_total: numberOrBlank(body.retorno_total),
    yoc: numberOrBlank(body.yoc),
    dy_estimado: numberOrBlank(body.dy_estimado),
    status: clean(body.status || 'ativo'),
    tese: clean(body.tese),
    risco: clean(body.risco),
    tags: Array.isArray(body.tags) ? body.tags.join(', ') : clean(body.tags),
    fonte: clean(body.fonte || body.origem || 'dividend_system'),
    criado_em: clean(body.criado_em),
    atualizado_em: now,
    ativo: body.ativo === false ? false : true
  };

  const saved = upsertRecord('ativos', record);
  appendDocumentLine(getOrCreateDocument(), 'Ativo atualizado: ' + ticker, [
    'Status: ' + record.status,
    record.tese ? 'Tese: ' + record.tese : '',
    'Fonte: ' + record.fonte
  ]);
  logSafe('upsert_asset', record.fonte, { id, ticker }, true, '');

  return { id, ticker, saved };
}

function normalizeOperation(body) {
  const ticker = normalizeTicker(body.ticker);
  if (!ticker) throw new Error('Ticker vazio em add_operation.');

  const data = clean(body.data || body.date || todayIso());
  const tipo = clean(body.tipo || body.type).toUpperCase();
  const id = clean(body.id) || ['OP', data, ticker, tipo, body.quantidade, body.preco_unitario].join('-');

  return {
    id,
    data,
    ticker,
    tipo,
    quantidade: numberOrBlank(body.quantidade),
    preco_unitario: numberOrBlank(body.preco_unitario),
    custos: numberOrBlank(body.custos),
    valor_total: numberOrBlank(body.valor_total),
    corretora: clean(body.corretora),
    origem: clean(body.origem || 'dividend_system'),
    observacao: clean(body.observacao),
    criado_em: nowIso()
  };
}

function normalizeDividend(body) {
  const ticker = normalizeTicker(body.ticker);
  if (!ticker) throw new Error('Ticker vazio em add_dividend.');

  const dataPagamento = clean(body.data_pagamento || body.pagamento || body.paymentDate || '');
  const id = clean(body.id) || ['PROV', ticker, body.tipo_provento || body.tipo || 'PROVENTO', body.data_com || '', dataPagamento, body.valor_unitario].join('-');

  return {
    id,
    ticker,
    tipo_provento: clean(body.tipo_provento || body.tipo || 'PROVENTO').toUpperCase(),
    data_com: clean(body.data_com || body.dataCom || body.ex_date),
    data_pagamento: dataPagamento,
    valor_unitario: numberOrBlank(body.valor_unitario),
    quantidade_base: numberOrBlank(body.quantidade_base),
    valor_total: numberOrBlank(body.valor_total),
    status: clean(body.status || 'previsto'),
    origem: clean(body.origem || 'dividend_system'),
    criado_em: nowIso()
  };
}

function normalizeDecision(body) {
  const ticker = normalizeTicker(body.ticker);
  if (!ticker) throw new Error('Ticker vazio em add_decision.');

  const data = clean(body.data || todayIso());
  const decisao = clean(body.decisao || body.decision || 'OBSERVAR').toUpperCase();
  const id = clean(body.id) || ['DEC', data, ticker, decisao].join('-');

  return {
    id,
    data,
    ticker,
    decisao,
    motivo: clean(body.motivo),
    confianca: numberOrBlank(body.confianca),
    dados_usados: typeof body.dados_usados === 'object' ? JSON.stringify(body.dados_usados) : clean(body.dados_usados),
    resultado_esperado: clean(body.resultado_esperado),
    revisar_em: clean(body.revisar_em),
    status: clean(body.status || 'aberta'),
    criado_em: nowIso()
  };
}

function normalizeRadarEvent(body) {
  const ticker = normalizeTicker(body.ticker);
  if (!ticker) throw new Error('Ticker vazio em add_radar_event.');

  const dataCom = clean(body.data_com || body.dataCom || body.ex_date);
  const dataPagamento = clean(body.data_pagamento || body.pagamento || body.paymentDate);
  const id = clean(body.id) || ['RADAR', ticker, body.tipo_evento || body.tipo || 'PROVENTO', dataCom, dataPagamento, body.valor_unitario].join('-');

  return {
    id,
    ticker,
    tipo_evento: clean(body.tipo_evento || body.tipo || 'PROVENTO').toUpperCase(),
    data_com: dataCom,
    data_pagamento: dataPagamento,
    valor_unitario: numberOrBlank(body.valor_unitario),
    score: numberOrBlank(body.score),
    status: clean(body.status || 'monitorar'),
    fonte: clean(body.fonte || 'dividend_system'),
    criado_em: nowIso()
  };
}

function normalizeSnapshot(body) {
  const data = clean(body.data || todayIso());
  const id = clean(body.id) || 'SNAP-' + data + '-' + Utilities.getUuid().slice(0, 8);

  return {
    id,
    data,
    patrimonio_total: numberOrBlank(body.patrimonio_total),
    renda_mensal_prevista: numberOrBlank(body.renda_mensal_prevista),
    renda_recebida_mes: numberOrBlank(body.renda_recebida_mes),
    retorno_total: numberOrBlank(body.retorno_total),
    caixa: numberOrBlank(body.caixa),
    observacao: clean(body.observacao),
    criado_em: nowIso()
  };
}

function appendDocNote(body) {
  const title = clean(body.title || body.titulo || 'Nota patrimonial');
  const lines = [];

  if (body.text || body.texto) lines.push(clean(body.text || body.texto));
  if (body.ticker) lines.push('Ticker: ' + normalizeTicker(body.ticker));
  if (body.decisao) lines.push('Decisao: ' + clean(body.decisao));
  if (body.payload) lines.push(JSON.stringify(body.payload, null, 2));

  appendDocumentLine(getOrCreateDocument(), title, lines);
  logSafe('doc_note', clean(body.origem || 'dividend_system'), { title }, true, '');

  return { saved: true, title };
}

function appendLogFromBody(body) {
  const record = {
    id: clean(body.id) || 'LOG-' + Utilities.getUuid(),
    data_hora: nowIso(),
    acao: clean(body.acao || body.action || 'log'),
    origem: clean(body.origem || 'dividend_system'),
    payload_resumo: summarizePayload(body.payload || body),
    resultado: clean(body.resultado || 'ok'),
    erro: clean(body.erro || '')
  };

  appendRecord('log', record);
  return { id: record.id };
}

function appendRecord(sheetKey, record) {
  const spreadsheet = getOrCreateSpreadsheet();
  ensureSheets(spreadsheet);
  const saved = upsertRecord(sheetKey, record);
  logSafe('append_' + sheetKey, record.origem || record.fonte || 'dividend_system', {
    id: record.id,
    ticker: record.ticker || ''
  }, true, '');
  return { id: record.id, saved };
}

function upsertRecord(sheetKey, record) {
  const spreadsheet = getOrCreateSpreadsheet();
  const def = SHEETS[sheetKey];
  if (!def) throw new Error('Aba desconhecida: ' + sheetKey);

  const sheet = spreadsheet.getSheetByName(def.name);
  const headers = ensureHeaders(sheet, def.headers);
  const keyValue = clean(record[def.key]);
  if (!keyValue) throw new Error('Registro sem chave: ' + def.key);

  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  const keyCol = headers.indexOf(def.key);

  for (let i = 1; i < rows.length; i++) {
    if (clean(rows[i][keyCol]) === keyValue) {
      rowIndex = i + 1;
      break;
    }
  }

  if (sheetKey === 'ativos' && !record.criado_em && rowIndex > 0) {
    const createdCol = headers.indexOf('criado_em');
    if (createdCol >= 0) record.criado_em = rows[rowIndex - 1][createdCol] || nowIso();
  }

  if (sheetKey === 'ativos' && !record.criado_em) record.criado_em = nowIso();

  const values = headers.map(h => record[h] !== undefined ? record[h] : '');

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, values.length).setValues([values]);
    return 'updated';
  }

  sheet.appendRow(values);
  return 'created';
}

function readSheetObjects(spreadsheet, sheetKey) {
  const def = SHEETS[sheetKey];
  const sheet = spreadsheet.getSheetByName(def.name);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(clean);
  return values.slice(1, MEMORY_CONFIG.maxRowsPerRead + 1)
    .filter(row => row.some(cell => clean(cell) !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
}

function ensureSheets(spreadsheet) {
  Object.keys(SHEETS).forEach(key => {
    const def = SHEETS[key];
    let sheet = spreadsheet.getSheetByName(def.name);
    if (!sheet) sheet = spreadsheet.insertSheet(def.name);
    ensureHeaders(sheet, def.headers);
  });
}

function ensureHeaders(sheet, expectedHeaders) {
  const range = sheet.getRange(1, 1, 1, expectedHeaders.length);
  const current = range.getValues()[0].map(clean);
  const hasHeaders = current.some(Boolean);

  if (!hasHeaders) {
    range.setValues([expectedHeaders]);
    sheet.setFrozenRows(1);
    return expectedHeaders;
  }

  const merged = current.slice();
  expectedHeaders.forEach(h => {
    if (!merged.includes(h)) merged.push(h);
  });

  if (merged.length !== current.length || merged.some((h, i) => h !== current[i])) {
    sheet.getRange(1, 1, 1, merged.length).setValues([merged]);
  }

  sheet.setFrozenRows(1);
  return merged;
}

function writeConfig(spreadsheet, key, value) {
  upsertRecord('config', {
    chave: key,
    valor: value,
    atualizado_em: nowIso()
  });
}

function getOrCreateSpreadsheet() {
  const props = PropertiesService.getScriptProperties();
  const existingId = clean(props.getProperty('SPREADSHEET_ID'));

  if (existingId) {
    return SpreadsheetApp.openById(existingId);
  }

  const spreadsheet = SpreadsheetApp.create(MEMORY_CONFIG.spreadsheetName);
  props.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  return spreadsheet;
}

function getOrCreateDocument() {
  const props = PropertiesService.getScriptProperties();
  const existingId = clean(props.getProperty('DOCUMENT_ID'));

  if (existingId) {
    return DocumentApp.openById(existingId);
  }

  const doc = DocumentApp.create(MEMORY_CONFIG.documentName);
  props.setProperty('DOCUMENT_ID', doc.getId());
  const body = doc.getBody();
  body.appendParagraph(MEMORY_CONFIG.documentName).setHeading(DocumentApp.ParagraphHeading.TITLE);
  body.appendParagraph('Memoria narrativa do Guido Dividend System.').setHeading(DocumentApp.ParagraphHeading.SUBTITLE);
  doc.saveAndClose();
  return DocumentApp.openById(doc.getId());
}

function appendDocumentLine(doc, title, lines) {
  const body = doc.getBody();
  body.appendParagraph('');
  body.appendParagraph(formatDateTimeBR(new Date()) + ' - ' + title)
    .setHeading(DocumentApp.ParagraphHeading.HEADING2);

  (lines || []).filter(Boolean).forEach(line => {
    body.appendParagraph(String(line));
  });

  doc.saveAndClose();
}

function logSafe(action, origin, payload, ok, error) {
  try {
    const spreadsheet = getOrCreateSpreadsheet();
    ensureSheets(spreadsheet);
    const sheet = spreadsheet.getSheetByName(SHEETS.log.name);
    ensureHeaders(sheet, SHEETS.log.headers);
    sheet.appendRow([
      'LOG-' + Utilities.getUuid(),
      nowIso(),
      action,
      origin || '',
      summarizePayload(payload),
      ok ? 'ok' : 'erro',
      error || ''
    ]);
  } catch (err) {
    console.warn('Falha ao gravar log:', err.message);
  }
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};

  const text = e.postData.contents;
  try {
    return JSON.parse(text);
  } catch (err) {
    return { raw: text };
  }
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeTicker(value) {
  return clean(value).toUpperCase().replace(/\.SA$/i, '').replace(/[^A-Z0-9]/g, '');
}

function classifyTicker(ticker) {
  if (/11$/.test(ticker) && !['TAEE11', 'ALUP11', 'SANB11', 'KLBN11', 'SAPR11'].includes(ticker)) {
    return 'FII';
  }
  return 'ACAO';
}

function numberOrBlank(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return value;
  const cleanNumber = String(value)
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(cleanNumber);
  return Number.isFinite(parsed) ? parsed : '';
}

function nowIso() {
  return Utilities.formatDate(new Date(), MEMORY_CONFIG.timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function todayIso() {
  return Utilities.formatDate(new Date(), MEMORY_CONFIG.timezone, 'yyyy-MM-dd');
}

function formatDateTimeBR(date) {
  return Utilities.formatDate(date, MEMORY_CONFIG.timezone, 'dd/MM/yyyy HH:mm:ss');
}

function summarizePayload(payload) {
  try {
    const text = JSON.stringify(payload || {});
    return text.length > 900 ? text.slice(0, 900) + '... [TRUNCADO]' : text;
  } catch (err) {
    return '[payload nao serializavel]';
  }
}
