(function(global){
  'use strict';
  // O snapshot compartilhado contém fechamentos D-1 autorizados, nunca preços intradiários.
  // Se não houver arquivo publicado, mantém o comportamento de importação local.
  let remotePromise;
  function validTradeDate(value){
    const date=String(value||'');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
    const parsed=new Date(date+'T12:00:00Z');
    return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===date&&date<=new Date().toISOString().slice(0,10);
  }
  async function publishedSnapshot(){
    if(!remotePromise){
      remotePromise=global.fetch('/guido-dividend-system/data/radar-eod.json',{cache:'no-cache'}).then(async response=>{
        if(!response.ok)return null;
        const data=await response.json();
        if(data?.schemaVersion!==1||data?.market!=='B3'||!validTradeDate(data.tradeDate)||
            !data.source||!Array.isArray(data.quotes)||data.quotes.length!==data.count)return null;
        return data;
      }).catch(()=>null);
    }
    return remotePromise;
  }
  async function fetchQuote(symbol){
    const ticker=String(global.DividendDomain?.normalizeTicker(symbol)||symbol||'')
      .toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(!ticker)throw new Error('Ticker inválido.');
    const candidates=[];
    const snapshot=await publishedSnapshot();
    const row=snapshot?.quotes?.find(q=>q.ticker===ticker);
    if(row&&Number.isFinite(row.close)&&row.close>0){
      candidates.push({ticker,price:row.close,quoteDate:snapshot.tradeDate,
        source:snapshot.source,realTime:false,dataSource:'published-d1'});
    }
    const stored=global.DividendMarketHub?.getCandidates?.()||[];
    const imported=stored.filter(x=>x.ticker===ticker && validTradeDate(x.date) && Number(x.price)>0)
      .sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(imported)candidates.push({ticker,price:imported.price,quoteDate:imported.date,
      source:imported.source,realTime:false,dataSource:'local-import'});
    if(!candidates.length)throw new Error('Sem fechamento publicado ou importado para '+ticker+'.');
    // Nunca substituir fechamento recente por data antiga. Empate: preferir arquivo oficial importado.
    candidates.sort((a,b)=>b.quoteDate.localeCompare(a.quoteDate)||
      ((a.source==='b3-official-file'?1:0)-(b.source==='b3-official-file'?1:0))*-1);
    return candidates[0];
  }
  global.DividendMarketGateway=Object.freeze({fetchQuote,publishedSnapshot});
})(window);
