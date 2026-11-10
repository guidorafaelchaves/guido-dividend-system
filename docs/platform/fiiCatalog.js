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

  // Usa apenas observacoes contabeis da CVM com ticker, CNPJ e competencia coerentes.
  // VPA so pode ser exibido quando conciliado no informe; nunca e cotacao,
  // rendimento distribuido nem base suficiente para estimar dividend yield.
  function enrichMetrics(catalog, payload, today=new Date()){
    if(!payload || payload.schemaVersion!==1 ||
       payload.dataType!=='monthly-fii-accounting-by-ticker' ||
       !Array.isArray(payload.records)) return catalog.slice();
    const allowed=new Map();
    const quarantined=new Set();
    const maxDate=today.toISOString().slice(0,10);
    for(const item of payload.records){
      const ticker=String(item.ticker||'').trim().toUpperCase();
      const cnpj=String(item.cnpj||'').replace(/\D/g,'');
      const ref=String(item.referenceDate||'').slice(0,10);
      if(!tickerPattern.test(ticker)||!cnpjPattern.test(cnpj)||
         !/^\d{4}-\d{2}-\d{2}$/.test(ref)||ref>maxDate||
         Number.isNaN(Date.parse(ref+'T12:00:00Z')))continue;
      const numeric=(value)=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
      const netAssets=numeric(item.netAssets);
      const holders=numeric(item.holders);
      const units=numeric(item.units);
      const nav=(item.navValidated===true&&typeof item.navCalculated==='number'&&
                 Number.isFinite(item.navCalculated)&&item.navCalculated>0)?
                 item.navCalculated:null;
      if(netAssets===null&&holders===null&&units===null&&nav===null)continue;
      const record={ticker,cnpj,referenceDate:ref,netAssets,holders,units,
                    navCalculated:nav,navValidated:nav!==null,
                    source:'CVM - informe mensal FII',dataType:'monthly-fii-accounting'};
      const key=ticker+'|'+cnpj;
      if(quarantined.has(key))continue;
      const previous=allowed.get(key);
      if(!previous||ref>previous.referenceDate)allowed.set(key,record);
      else if(ref===previous.referenceDate && JSON.stringify(record)!==JSON.stringify(previous)){
        allowed.delete(key);
        quarantined.add(key);
      }
    }
    return (catalog||[]).map(asset=>{
      const observed=allowed.get(asset.ticker+'|'+asset.cnpj);
      return observed?{...asset,cvm:observed}:asset;
    });
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
      const response=await fetch('/guido-dividend-system/data/fii-universe.json',{cache:'no-store'});
      if(!response.ok)throw Error('Falha de consulta ao universo cadastral');
      records=normalize(await response.json());
      if(records.length<100)throw Error('Cobertura insuficiente');
      try{
        const metricsResponse=await fetch('/guido-dividend-system/data/cvm-fii-by-ticker.json',{cache:'no-store'});
        if(metricsResponse.ok)records=enrichMetrics(records,await metricsResponse.json());
      }catch(_){ /* Catalogo de identificacao continua disponivel se CVM falhar. */ }
      state='ready';
    }catch(_){
      state='unavailable';
      records=[];
    }
    return records;
  }
  global.DividendFiiCatalog=Object.freeze({load,normalize,enrichMetrics,merge,all:()=>records.slice(),state:()=>state});
})(window);
