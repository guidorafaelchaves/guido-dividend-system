(function(global){
  'use strict';
  // This gateway consumes verified user-imported closing observations, not live B3 data.
  async function fetchQuote(symbol){
    const ticker=String(global.DividendDomain?.normalizeTicker(symbol)||symbol||'')
      .toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(!ticker)throw new Error('Ticker inválido.');
    const stored=global.DividendMarketHub?.getCandidates?.()||[];
    const rows=stored.filter(x=>x.ticker===ticker).sort((a,b)=>b.date.localeCompare(a.date));
    if(!rows.length)throw new Error('Não há fechamento importado para '+ticker+'. Abra o Dividend System e importe COTAHIST/CSV.');
    const r=rows[0];
    return {ticker,price:r.price,quoteDate:r.date,source:r.source,realTime:false};
  }
  global.DividendMarketGateway=Object.freeze({fetchQuote});
})(window);
