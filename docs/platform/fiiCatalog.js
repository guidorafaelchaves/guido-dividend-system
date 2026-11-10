(function(global){
  'use strict';
  let records=[];
  let state='not-loaded';
  const tickerPattern=/^[A-Z]{4}11$/;
  const cnpjPattern=/^\d{14}$/;

  function normalize(payload){
    if(!payload || payload.schemaVersion!==1 || payload.dataType!=='fii-ticker-cnpj-catalog' ||
       !Array.isArray(payload.records))throw Error('Esquema do catálogo incompatível');
    const result=new Map();
    for(const raw of payload.records){
      const ticker=String(raw.ticker||'').trim().toUpperCase();
      const cnpj=String(raw.cnpj||'').replace(/\D/g,'');
      if(!tickerPattern.test(ticker)||!cnpjPattern.test(cnpj))continue;
      const name=String(raw.name||ticker).trim().slice(0,160);
      const isFiagro=raw.assetClass==='FIAGRO'||/FIAGRO/i.test(name);
      const type=isFiagro?'FIAGRO':'FII';
      const row={id:ticker,ticker,cnpj,name,type,sector:String(raw.sector||'Não classificado').slice(0,100),
        price:0,dividendYield:0,recurrenceScore:0,liquidityScore:0,
        source:'lummios-catalog-unverified-b3',identityStatus:'third-party-catalog-unverified-b3',
        catalogOnly:true};
      if(result.has(ticker)&&result.get(ticker).cnpj!==cnpj){
        result.delete(ticker);
        continue;
      }
      result.set(ticker,row);
    }
    return [...result.values()].sort((a,b)=>a.ticker.localeCompare(b.ticker));
  }

  function merge(existing,catalog){
    const byTicker=new Map((existing||[]).filter(x=>x?.ticker).map(x=>[x.ticker,{...x}]));
    for(const row of catalog||[]){
      const prior=byTicker.get(row.ticker);
      // Nao substituir dados financeiros reais da carteira por zero.
      // Dados DEMO, entretanto, nao representam cotacao publica.
      if(prior && !String(prior.source||'').includes('demo')){
        byTicker.set(row.ticker,{...row,...prior,cnpj:row.cnpj,
          identityStatus:row.identityStatus,catalogOnly:false});
      }else{
        byTicker.set(row.ticker,row);
      }
    }
    return [...byTicker.values()];
  }
  async function load(){
    if(state==='ready')return records;
    try{
      const response=await fetch('/data/fii-universe.json',{cache:'no-store'});
      if(!response.ok)throw Error('Falha de consulta ao universo cadastral');
      records=normalize(await response.json());
      if(records.length<100)throw Error('Cobertura insuficiente');
      state='ready';
    }catch(_){
      state='unavailable';
      records=[];
    }
    return records;
  }
  global.DividendFiiCatalog=Object.freeze({load,normalize,merge,all:()=>records.slice(),state:()=>state});
})(window);
