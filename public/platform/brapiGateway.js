(function(global){
  'use strict';

  async function fetchQuote(ticker){
    const safeTicker = global.DividendDomain.normalizeTicker(ticker);
    if(!safeTicker) throw new Error('Ticker invalido');
    if(global.RadarSaasGateway?.getQuote){
      return global.RadarSaasGateway.getQuote(safeTicker);
    }
    const params = new URLSearchParams({ ticker:safeTicker });
    const res = await fetch(`/api/brapi/quote?${params.toString()}`, { credentials:'include' });
    if(!res.ok) throw new Error(`BRAPI gateway HTTP ${res.status}`);
    return res.json();
  }

  global.DividendBrapiGateway = Object.freeze({ fetchQuote });
})(window);
