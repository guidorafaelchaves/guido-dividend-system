#!/usr/bin/env node
// Converte um feed de fechamento AUTORIZADO em snapshot do Radar.
// Requer RADAR_EOD_FEED_URL; nunca acessa páginas públicas da B3 por scraping.
import { mkdir, writeFile } from 'node:fs/promises';

const endpoint = process.env.RADAR_EOD_FEED_URL;
const permission = process.env.RADAR_EOD_PUBLICATION_ALLOWED === 'true';
if (!endpoint) throw new Error('RADAR_EOD_FEED_URL não configurado: nenhuma cotação será publicada.');
if (!permission) throw new Error('Confirme a licença de redistribuição em RADAR_EOD_PUBLICATION_ALLOWED=true.');
const url = new URL(endpoint);
if (url.protocol !== 'https:') throw new Error('O feed deve usar HTTPS.');
const headers = { accept: 'application/json' };
if (process.env.RADAR_EOD_FEED_TOKEN) headers.authorization = 'Bearer ' + process.env.RADAR_EOD_FEED_TOKEN;
const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
if (!response.ok) throw new Error('Erro do fornecedor: HTTP ' + response.status);
const input = await response.json();
// Contrato esperado: {source, tradeDate:"YYYY-MM-DD", quotes:[{ticker,close,volume?}]}.
if (!input || !Array.isArray(input.quotes) || !input.quotes.length) throw new Error('Feed sem cotações.');
const source = String(input.source || '').trim();
const tradeDate = String(input.tradeDate || '');
if (!source || !/^\d{4}-\d{2}-\d{2}$/.test(tradeDate) || Number.isNaN(Date.parse(tradeDate + 'T12:00:00Z'))) {
  throw new Error('Fonte ou data de pregão inválida.');
}
const todayBR = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const ageDays = (Date.parse(todayBR+'T12:00:00Z')-Date.parse(tradeDate+'T12:00:00Z'))/86400000;
if (ageDays < 0 || ageDays > 7) throw new Error('Data de pregão futura ou excessivamente antiga.');
const seen = new Set();
const quotes = input.quotes.map((r) => {
  const ticker = String(r.ticker || '').trim().toUpperCase();
  const close = Number(r.close);
  const volume = r.volume == null ? null : Number(r.volume);
  if (!/^[A-Z0-9]{4,12}$/.test(ticker) || !Number.isFinite(close) || close <= 0 ||
      (volume !== null && (!Number.isFinite(volume) || volume < 0)) || seen.has(ticker)) {
    throw new Error('Cotação inválida ou duplicada: ' + ticker);
  }
  seen.add(ticker);
  return {ticker, close, ...(volume === null ? {} : {volume})};
}).sort((a,b)=>a.ticker.localeCompare(b.ticker));
if (quotes.length < 10) throw new Error('Amostra pequena demais para publicação automática.');
const snapshot = {schemaVersion:1, source, tradeDate, market:'B3', priceType:'official-or-licensed-eod', currency:'BRL', count:quotes.length, quotes};
// Conteúdo determinístico: mesmo pregão não causa commits repetidos.
await mkdir('public/data',{recursive:true});
await writeFile('public/data/radar-eod.json',JSON.stringify(snapshot,null,2)+'\n');
console.log('Snapshot validado:',tradeDate,quotes.length,'ativos de',source);
