(function(global){
  'use strict';
  // Sources are observations, never implied live quotations. Import is user-initiated.
  const SOURCE_RANK = Object.freeze({'b3-official-file':100,'manual-csv':60,'legacy-cache':20});
  const STORAGE_KEY = 'guido_market_candidates_v1';
  function ticker(value){return String(value||'').toUpperCase().trim().replace(/[^A-Z0-9]/g,'').slice(0,12);}
  function iso(value){
    const s=String(value||'').trim();
    if(/^\d{8}$/.test(s)){const y=s.slice(0,4),m=s.slice(4,6),d=s.slice(6,8);return iso(y+'-'+m+'-'+d);}
    const m=s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(m)return iso(m[3]+'-'+m[2]+'-'+m[1]);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return '';
    const dt=new Date(s+'T12:00:00Z');
    return Number.isNaN(dt.valueOf())||dt.toISOString().slice(0,10)!==s?'':s;
  }
  function number(value){
    if(typeof value==='number')return Number.isFinite(value)?value:0;
    const s=String(value??'').trim().replace(/[R$\s]/g,'');
    if(!s)return 0;
    const p=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s;
    const n=Number(p);return Number.isFinite(n)?n:0;
  }
  function row(value){
    const t=ticker(value.ticker),date=iso(value.date),price=number(value.price);
    if(!t||!date||!(price>0)||price>10000000)return null;
    if(date>new Date().toISOString().slice(0,10))return null;
    return {ticker:t,date,price,source:value.source||'manual-csv',volume:number(value.volume),previousClose:number(value.previousClose)};
  }
  // Fixed width 245-character COTAHIST record (PREULT, field 13, cents).
  function parseCotahist(text,allowed){
    const result=[];let skipped=0;
    for(const line of String(text||'').split(/\r?\n/)){
      if(line.slice(0,2)!=='01'||line.length<245)continue;
      const t=ticker(line.slice(12,24));
      if(allowed&&allowed.size&&!allowed.has(t))continue;
      // The cash market (010) prevents mistaking derivatives prices for spot shares.
      if(line.slice(24,27)!=='010')continue;
      const raw=line.slice(108,121);
      const price=/^\d{13}$/.test(raw)?Number(raw)/100:0;
      const obs=row({ticker:t,date:line.slice(2,10),price,source:'b3-official-file',volume:0});
      if(obs)result.push(obs);else skipped++;
    }
    return {observations:result,skipped,format:'b3-cotahist'};
  }
  function csvCells(line,separator){
    const cells=[];let buf='',quoted=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'&&line[i+1]==='"'&&quoted){buf+='"';i++;continue;}
      if(c==='"'){quoted=!quoted;continue;}
      if(c===separator&&!quoted){cells.push(buf.trim());buf='';continue;}
      buf+=c;
    }
    cells.push(buf.trim());return cells;
  }
  function parseCsv(text,allowed){
    const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());
    if(!lines.length)return {observations:[],skipped:0,format:'csv'};
    const sep=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';
    const keys=csvCells(lines.shift(),sep).map(x=>x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,''));
    const find=names=>keys.findIndex(x=>names.includes(x));
    const ti=find(['ticker','codigo','codneg','simbolo','symbol','ativo']);
    const di=find(['data','date','pregao','datapregao','quotedate']);
    const pi=find(['preco','price','fechamento','close','preult','precoultimo','precoult']);
    const vi=find(['volume','voltot']);
    if(ti<0||di<0||pi<0)throw new Error('CSV exige colunas ticker/codigo, data e preco/fechamento.');
    const observations=[];let skipped=0;
    for(const line of lines){
      const cells=csvCells(line,sep),t=ticker(cells[ti]);
      if(allowed&&allowed.size&&!allowed.has(t))continue;
      const item=row({ticker:t,date:cells[di],price:cells[pi],volume:vi>=0?cells[vi]:0,source:'manual-csv'});
      if(item)observations.push(item);else skipped++;
    }
    return {observations,skipped,format:'csv'};
  }
  function parse(text,filename,allowed){
    const safe=String(filename||'').toLowerCase();
    const sample=String(text||'').trimStart();
    if(safe.endsWith('.txt')||/^0[012]\d{8}/.test(sample))return parseCotahist(text,allowed);
    return parseCsv(text,allowed);
  }
  function dedupe(items){
    const map=new Map();
    for(const original of items||[]){
      const v=row(original);if(!v)continue;
      const key=v.ticker+'|'+v.date;
      const prev=map.get(key);
      if(!prev||(SOURCE_RANK[v.source]||0)>(SOURCE_RANK[prev.source]||0))map.set(key,v);
    }
    return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  function reconcile(observations,existing={},tickers=null){
    const valid=dedupe(observations).filter(v=>!tickers||!tickers.size||tickers.has(v.ticker));
    const groups=new Map();for(const v of valid){const a=groups.get(v.ticker)||[];a.push(v);groups.set(v.ticker,a);}
    const accepted=[],conflicts=[],unchanged=[];
    for(const [t,group] of groups){
      group.sort((a,b)=>b.date.localeCompare(a.date)||(SOURCE_RANK[b.source]||0)-(SOURCE_RANK[a.source]||0));
      const best=group[0],prev=existing[t]||{};
      const prevDate=iso(prev.quoteDate||prev.marketDate);
      const oldPrice=number(prev.precoAtual);
      if(prevDate&&prevDate>best.date){unchanged.push(t);continue;}
      if(prevDate===best.date&&oldPrice>0){
        const gap=Math.abs(oldPrice-best.price)/oldPrice;
        if(gap>.01){conflicts.push({ticker:t,date:best.date,existing:oldPrice,candidate:best.price,source:best.source,gapPct:gap*100});continue;}
        if((SOURCE_RANK[prev.source]||0)>(SOURCE_RANK[best.source]||0)){unchanged.push(t);continue;}
      }
      accepted.push(best);
    }
    return {accepted,conflicts,unchanged,valid};
  }
  function getCandidates(){
    try{const arr=JSON.parse(global.localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(arr)?arr:[];}catch{return [];}
  }
  function saveCandidates(items){
    // Only the last 15,000 relevant observations are staged; the durable ledger is separate.
    const sorted=dedupe(items).slice(-15000);
    try{global.localStorage.setItem(STORAGE_KEY,JSON.stringify(sorted));}
    catch(e){throw new Error('Armazenamento local cheio. Importe menos pregões ou limpe o cache antigo.');}
    return sorted.length;
  }
  global.DividendMarketHub=Object.freeze({ticker,iso,number,parseCotahist,parseCsv,parse,reconcile,dedupe,getCandidates,saveCandidates,SOURCE_RANK});
})(typeof window!=='undefined'?window:globalThis);
