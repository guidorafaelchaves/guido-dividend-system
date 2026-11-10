(function(global){
  'use strict';
  const MAX_AGE_DAYS=7;
  function evaluate(payload,now=new Date()){
    if(!payload || payload.schemaVersion!==1 || payload.dataType!=='fii-b3-reconciliation' ||
       payload.rightsConfirmed!==true || !Array.isArray(payload.records)) return {valid:false,reason:'invalid'};
    const date=String(payload.snapshotDate||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return {valid:false,reason:'invalid-date'};
    const ts=Date.parse(date+'T00:00:00Z');
    if(!Number.isFinite(ts) || new Date(ts).toISOString().slice(0,10)!==date)return {valid:false,reason:'invalid-date'};
    const current=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
    const ageDays=Math.round((current-ts)/86400000);
    if(ageDays<0)return {valid:false,reason:'future-date'};
    return {valid:true,stale:ageDays>MAX_AGE_DAYS,ageDays,date,sourceName:String(payload.sourceName||'Fonte não identificada')};
  }
  function find(payload,ticker,cnpj,now=new Date()){
    const meta=evaluate(payload,now);
    if(!meta.valid)return {status:'unverified',meta};
    const match=payload.records.find(r=>r.ticker===ticker && r.cnpj===cnpj);
    const allowed=['observed-active','observed-inactive','ambiguous','class-conflict','unverified'];
    if(!match || !allowed.includes(match.verificationStatus))return {status:'unverified',meta};
    if(meta.stale)return {status:'stale',originalStatus:match.verificationStatus,meta};
    return {status:match.verificationStatus,isin:match.isin||null,meta};
  }
  function label(status){
    return ({
      'observed-active':'Consta ativo no snapshot autorizado',
      'observed-inactive':'Consta inativo no snapshot autorizado',
      ambiguous:'Evidência B3 conflitante',
      'class-conflict':'Classe B3 divergente',
      stale:'Arquivo B3 desatualizado; situação atual não confirmada',
      unverified:'Sem confirmação B3'
    })[status]||'Sem confirmação B3';
  }
  global.DividendB3Evidence=Object.freeze({evaluate,find,label,MAX_AGE_DAYS});
})(window);
